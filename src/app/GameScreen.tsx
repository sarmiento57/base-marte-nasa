import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Boxes, Construction, FlaskConical, HeartPulse, Leaf, Maximize2, Minimize2, Package, Radio, Sparkles, Sprout, Target, Trophy, X, Zap } from 'lucide-react'
import { BuildingPreview } from '../components/buildings/BuildingPreview'
import { EventStatus } from '../components/events/EventStatus'
import { ResourceStatus } from '../components/hud/ResourceStatus'
import { MarsMap } from '../components/map/MarsMap'
import { ShipInterior } from '../components/map/ShipInterior'
import { LoadingScreen } from '../components/shared/LoadingScreen'
import { MissionPreview } from '../components/missions/MissionPreview'
import { NovaAssistant, NovaChatter } from '../components/nova/NovaAssistant'
import { ScienceSources } from '../components/science/ScienceSources'
import { isWithinInteractionRange } from '../data/mars/movement'
import { marsPlots } from '../data/mars/plots'
import { supplySites } from '../data/mars/supplies'
import { MARS_WORLD } from '../data/mars/world'
import { BUILDING_ICON, BUILDING_LABEL, GAME_CONFIG, GREENHOUSE_MODE, SHELTER_WINDOW_SECONDS, solSecondsFor } from '../engine/config'
import { supplyReadyOnSol } from '../engine/actions'
import { ObjectiveTracker } from '../components/missions/ObjectiveTracker'
import { DustStormCard } from '../components/events/DustStormCard'
import { EmergencyAlert } from '../components/events/EmergencyAlert'
import { SleepOverlay } from '../components/shared/SleepOverlay'
import { MissionEnding } from '../components/results/MissionEnding'
import { pendingEvent } from '../engine/events'
import { previewDecision } from '../engine/previewDecision'
import type { BuildingType, GameCommand, GameState, GreenhouseMode, ResourceName, ScenarioId, WorldPosition } from '../engine/types'
import { useGameStore } from '../store/useGameStore'
import { MissionReportScreen } from './MissionReportScreen'

const resourceLabels: Record<ResourceName, string> = { energy: 'energy', water: 'water', food: 'food', spareParts: 'spare parts', seeds: 'seeds' }
type GamePanel = 'construction' | 'inventory' | 'mission' | 'alerts' | 'cultivation' | 'science' | 'history' | 'nova' | 'report'

const gameModules = [
  { id: 'construction', label: 'Construction', shortLabel: 'Build', icon: Construction },
  { id: 'inventory', label: 'Inventory', shortLabel: 'Inventory', icon: Package },
  { id: 'mission', label: 'Mission', shortLabel: 'Mission', icon: Target },
  { id: 'alerts', label: 'Alerts', shortLabel: 'Alerts', icon: Radio },
  { id: 'cultivation', label: 'Greenhouse', shortLabel: 'Crop', icon: Leaf },
  { id: 'science', label: 'NASA Science', shortLabel: 'Science', icon: FlaskConical },
  { id: 'history', label: 'Logbook', shortLabel: 'Logbook', icon: BookOpen },
  { id: 'nova', label: 'Talk to NOVA', shortLabel: 'NOVA', icon: Sparkles },
] as const

const panelTitles: Record<GamePanel, string> = {
  construction: 'Construction workshop', inventory: 'Colony inventory', mission: 'Mission objectives',
  alerts: 'Alert center', cultivation: 'Greenhouse', science: 'NASA Lab', history: 'Onboard logbook',
  nova: 'NOVA mission assistant', report: 'Mission report',
}

const LANDING_STEPS = ['Opening the habitat hatch', 'Scanning the valley', 'Syncing colony reserves', 'NOVA is ready'] as const

export function GameScreen() {
  const game = useGameStore((state) => state.game)
  const solStartedAt = useGameStore((state) => state.solStartedAt)
  const selectedPlotId = useGameStore((state) => state.selectedPlotId)
  const openPreview = useGameStore((state) => state.openPreview)
  const previewCommand = useGameStore((state) => state.previewCommand)
  const cancelPreview = useGameStore((state) => state.cancelPreview)
  const confirmPreview = useGameStore((state) => state.confirmPreview)
  const dispatch = useGameStore((state) => state.dispatch)
  const errorMessage = useGameStore((state) => state.errorMessage)
  const message = useGameStore((state) => state.message)
  const tutorialDismissed = useGameStore((state) => state.tutorialDismissed)
  const dismissTutorial = useGameStore((state) => state.dismissTutorial)
  const setScreen = useGameStore((state) => state.setScreen)
  const setNovaExpanded = useGameStore((state) => state.setNovaExpanded)
  const emergencyStartedAt = useGameStore((state) => state.emergencyStartedAt)
  const restartGame = useGameStore((state) => state.restartGame)
  const previousScreen = useGameStore((state) => state.previousScreen)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [panel, setPanel] = useState<GamePanel | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState(false)
  const [shipInteriorOpen, setShipInteriorOpen] = useState(false)
  // The landing screen shows when arriving from camp, not when coming back from the Science page.
  const [landing, setLanding] = useState(() => previousScreen !== 'science' && previousScreen !== 'howto')
  const [sleeping, setSleeping] = useState(false)
  // Remembers which finished game the player already closed the ending for (its log length).
  const [endingClosedAt, setEndingClosedAt] = useState<number | null>(null)
  const [solarClock, setSolarClock] = useState<{ eventId: string; seconds: number } | null>(null)
  const event = game ? pendingEvent(game) : undefined
  // Real recent space weather (NASA DONKI) decides how long the crew has to reach a safe zone.
  const shelterWindow = SHELTER_WINDOW_SECONDS[game?.conditions?.spaceWeather ?? 'active']
  const solarSecondsRemaining = event?.kind === 'solar'
    ? solarClock?.eventId === event.id ? solarClock.seconds : shelterWindow
    : null
  const preview = game && previewCommand ? previewDecision(game, previewCommand) : null
  const nextSolarOutput = useMemo(() => {
    if (!game) return 0
    const panels = game.buildings.filter((building) => building.type === 'solar' && building.operational).length
    const storm = game.sol === game.eventSols.dust || game.sol === game.eventSols.dust + 1
    return panels ? (storm ? 5 : 18) + Math.max(0, panels - 1) * (storm ? 2 : 6) : 0
  }, [game])

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(Boolean(document.fullscreenElement && document.fullscreenElement === rootRef.current))
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])
  useEffect(() => {
    if (event?.kind !== 'solar') return
    const deadline = Date.now() + shelterWindow * 1000
    let expired = false
    let timer = 0
    const updateCountdown = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSolarClock((previous) => previous?.eventId === event.id && previous.seconds === seconds ? previous : { eventId: event.id, seconds })
      if (seconds === 0 && !expired) {
        expired = true
        if (timer) window.clearInterval(timer)
        dispatch({ type: 'missSolarDeadline' })
      }
    }
    timer = window.setInterval(updateCountdown, 200)
    return () => window.clearInterval(timer)
  }, [event?.id, event?.kind, dispatch, shelterWindow])
  // Stable so the memoized map does not re-render when the HUD or clock changes.
  const enterHabitat = useCallback(() => {
    const current = useGameStore.getState().game
    const pending = current ? pendingEvent(current) : undefined
    if (pending?.kind === 'solar' && !dispatch({ type: 'resolveSolar', choice: 'shelter' })) return
    setShipInteriorOpen(true)
    setPanel(null)
    setNovaExpanded(false)
  }, [dispatch, setNovaExpanded])
  const expireEmergency = useCallback(() => { dispatch({ type: 'expireEmergency' }) }, [dispatch])
  if (!game) return <div className="grid h-dvh place-items-center bg-[#342c4b] text-white"><section className="rounded-3xl border border-white/25 bg-[#453b5b] p-10 text-center"><h1 className="text-2xl font-black">No mission is open</h1><button type="button" onClick={() => setScreen('home')} className="mt-5 rounded-xl bg-[#f09662] px-5 py-3 text-sm font-black text-[#332941]">Back to camp</button></section></div>

  const activePanel = game.gameOver ? panel ?? 'report' : panel === 'report' ? null : panel
  const run = (command: GameCommand) => { openPreview(command) }
  const togglePanel = (next: GamePanel) => {
    if (activePanel === next) {
      setPanel(null)
      if (next === 'nova') setNovaExpanded(false)
      return
    }
    if (next === 'nova') setNovaExpanded(true)
    else setNovaExpanded(false)
    setPanel(next)
  }
  const toggleFullscreen = () => {
    setFullscreenError(false)
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    const root = rootRef.current
    if (!root?.requestFullscreen) {
      setFullscreenError(true)
      return
    }
    void root.requestFullscreen().catch(() => setFullscreenError(true))
  }
  const leaveGame = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    setScreen('home')
  }
  const dustChoice = (choice: 'saving' | 'normal') => dispatch({ type: 'resolveDust', choice })
  const solarChoice = (choice: 'shelter' | 'continue') => dispatch({ type: 'resolveSolar', choice })
  const advanceTitle = game.sol >= game.maxSols ? 'Close mission' : `Advance to sol ${game.sol + 1}`
  const focusMap = () => setPanel(null)
  const startSleep = () => {
    setShipInteriorOpen(false)
    setPanel(null)
    setSleeping(true)
  }
  const finishSleep = () => {
    setSleeping(false)
    dispatch({ type: 'sleep' })
  }
  const sleepBlockedReason = event ? 'Resolve the alert first.' : game.emergency?.length ? 'Refill life support first.' : game.gameOver ? 'The mission is over.' : null
  const shelteredOutside = game.crewTask === 'shelter' && game.shelterZone && game.shelterZone !== 'habitat' && !shipInteriorOpen

  return <div id="game-screen-root" ref={rootRef} className="relative isolate h-dvh min-h-[760px] w-screen min-w-[1180px] overflow-hidden bg-[#352c49] font-[Trebuchet_MS,ui-rounded,system-ui,sans-serif] text-[#332f52] selection:bg-[#69d5d5]/50">
    <MarsMap immersive solarSecondsRemaining={solarSecondsRemaining} onEnterHabitat={enterHabitat}/>
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-[#261f3c]/90 via-[#302542]/48 to-transparent"/>
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[78px] items-center justify-between gap-3 px-4">
      <div className="pointer-events-auto flex w-[222px] shrink-0 items-center gap-2.5 rounded-[1.2rem] border border-white/35 bg-[#302b48]/90 px-2.5 py-2 text-white shadow-xl backdrop-blur-md">
        <button type="button" onClick={leaveGame} aria-label="Leave the mission and go to camp" title="Go to camp" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f09863] text-[#3b2c45] hover:bg-[#ffb276] focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-white"><ArrowLeft size={19}/></button>
        <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.1em] text-[#f9d7a6]">Mars Base · Ares Valley</p><p className="text-sm font-black">Sol {String(game.sol).padStart(2, '0')} <span className="text-white/55">/ {game.maxSols}</span></p><div className="mt-1 flex items-center gap-2"><progress aria-label={`${game.solsCompleted} of ${game.maxSols} sols completed`} max={game.maxSols} value={Math.min(game.solsCompleted, game.maxSols)} className="h-2 w-[92px] overflow-hidden rounded-full accent-[#9de3c3]"/><span className="whitespace-nowrap text-[9px] font-bold text-white/75">{game.solsCompleted}/{game.maxSols} closed</span></div></div>
        <span title={`Life support ${game.lifeSupport === 'stable' ? 'stable' : game.lifeSupport === 'risk' ? 'at risk' : 'critical'}`} className={`grid size-8 shrink-0 place-items-center rounded-full ${game.lifeSupport === 'stable' ? 'bg-[#477f62] text-[#ccffd0]' : game.lifeSupport === 'risk' ? 'bg-[#9a7444] text-[#ffe49d]' : 'bg-[#a24d4e] text-white'}`}><HeartPulse size={16}/></span>
      </div>
      <div className="pointer-events-auto flex min-w-0 flex-1 justify-center"><ResourceStatus game={game} immersive/></div>
      <div className="pointer-events-auto flex w-[108px] shrink-0 items-center justify-end gap-2">
        <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'} title={fullscreen ? 'Exit full screen' : 'Full screen'} className="grid size-11 place-items-center rounded-xl border border-white/25 bg-[#302b48]/90 text-white shadow-lg hover:bg-[#4c4167] focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-white">{fullscreen ? <Minimize2 size={19}/> : <Maximize2 size={19}/>}</button>
        <span className="hidden text-[9px] font-black text-white/60 xl:block">{nextSolarOutput} ⚡</span>
      </div>
    </header>

    <SolClock solStartedAt={solStartedAt} hasPendingEvent={Boolean(event)} gameOver={game.gameOver} scenarioId={game.scenarioId}/>
    {!event && !game.emergency?.length && !game.gameOver && <ObjectiveTracker game={game}/>}

    <nav aria-label="Game modules" className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-[1.4rem] border border-white/30 bg-[#302b48]/92 p-2 shadow-[0_12px_38px_#241d35a8] backdrop-blur-lg">
      {gameModules.map(({ id, label, shortLabel, icon: Icon }) => <button key={id} type="button" onClick={() => togglePanel(id)} aria-pressed={activePanel === id} title={label} className={`flex h-[58px] w-[96px] flex-col items-center justify-center gap-1 rounded-xl border px-2 transition-colors focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-white ${activePanel === id ? 'border-[#ffe09a] bg-[#f4ad69] text-[#392d48] shadow-inner' : 'border-transparent text-white/90 hover:border-white/20 hover:bg-white/10'}`}><Icon size={19} aria-hidden="true"/><span className="text-[10px] font-extrabold">{shortLabel}</span></button>)}
    </nav>

    <button type="button" title={`Advance early for ${GAME_CONFIG.fastForwardEnergyCost} energy, on top of the sol's normal use`} disabled={Boolean(event) || game.gameOver || game.resources.energy < GAME_CONFIG.fastForwardEnergyCost} onClick={() => run({ type: 'advance' })} className="absolute bottom-7 right-7 z-40 flex h-[58px] items-center gap-2 rounded-2xl border-2 border-white/65 bg-[#d96e4f] px-5 text-sm font-black text-white shadow-[0_10px_30px_#2a1e3690] hover:bg-[#ed845f] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-[#847a7f]"><ArrowRight size={18}/>{advanceTitle}</button>

    {(errorMessage || message || fullscreenError) && <div role={errorMessage ? 'alert' : 'status'} aria-live="polite" className={`absolute left-4 top-[96px] z-50 flex w-[330px] items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-xl backdrop-blur-md ${errorMessage ? 'border-[#ffb89a] bg-[#773f46]/95 text-white' : 'border-[#d2dfaf] bg-[#fff4d9]/95 text-[#46384d]'}`}><span aria-hidden="true">{errorMessage ? '!' : '✦'}</span><p className="flex-1">{fullscreenError ? 'This browser does not allow full screen.' : errorMessage ?? message}</p><button type="button" onClick={() => useGameStore.getState().clearMessage()} aria-label="Close message" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-current"><X size={16}/></button></div>}

    {event?.kind === 'dust' && !landing && <DustStormCard game={game} onChoose={dustChoice}/>}

    <NovaChatter enabled={!activePanel && !game.gameOver} onOpen={() => togglePanel('nova')}/>

    {activePanel && <section aria-label={panelTitles[activePanel]} className="absolute bottom-[94px] right-6 top-[88px] z-40 flex w-[420px] flex-col overflow-hidden rounded-[1.55rem] border-2 border-white/80 bg-[#fff5e5]/[.97] shadow-[0_20px_60px_#21192f99] backdrop-blur-lg">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e7d2b9] bg-[#39344f] px-4 py-3 text-white"><div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-[#f4ad69] text-[#3c3047]">{activePanel === 'construction' ? <Construction size={18}/> : activePanel === 'inventory' ? <Boxes size={18}/> : activePanel === 'mission' ? <Target size={18}/> : activePanel === 'alerts' ? <Radio size={18}/> : activePanel === 'cultivation' ? <Leaf size={18}/> : activePanel === 'science' ? <FlaskConical size={18}/> : activePanel === 'history' ? <BookOpen size={18}/> : activePanel === 'nova' ? <Sparkles size={18}/> : <Trophy size={18}/>}</span><div><h2 className="text-sm font-black">{panelTitles[activePanel]}</h2><p className="text-[9px] font-semibold text-white/65">All controls stay inside the mission</p></div></div><button type="button" onClick={() => { setPanel(activePanel === 'report' ? 'mission' : null); if (activePanel === 'nova') setNovaExpanded(false) }} aria-label="Close module" className="grid size-9 place-items-center rounded-lg bg-white/10 hover:bg-white/20 focus-visible:outline-3 focus-visible:outline-white"><X size={17}/></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
        {activePanel === 'construction' && <BuildingPreview game={game} selectedPlotId={selectedPlotId} playerPosition={game.mapPosition} onBuild={(building, plotId) => run({ type: 'build', building, plotId })}/>}
        {activePanel === 'inventory' && <InventoryPanel game={game}/>}
        {activePanel === 'mission' && <MissionPreview game={game} dismissed={tutorialDismissed} onDismiss={dismissTutorial} onSow={() => run({ type: 'sow' })} onFocusMap={focusMap}/>}
        {activePanel === 'alerts' && <EventStatus game={game} onDustChoice={dustChoice} onSolarChoice={() => solarChoice('continue')}/>}
        {activePanel === 'cultivation' && <CropPanel game={game} playerPosition={game.mapPosition} onAction={run}/>}
        {activePanel === 'science' && <ScienceSources/>}
        {activePanel === 'history' && <ActionHistory game={game}/>}
        {activePanel === 'nova' && <NovaAssistant embedded/>}
        {activePanel === 'report' && <MissionReportScreen game={game}/>}
      </div>
    </section>}

    {previewCommand && preview && <DecisionPreviewModal game={game} command={previewCommand} preview={preview} onCancel={cancelPreview} onConfirm={confirmPreview}/>}
    {game.emergency?.length && emergencyStartedAt !== null && !game.gameOver ? <EmergencyAlert key={emergencyStartedAt} game={game} startedAt={emergencyStartedAt} onExpire={expireEmergency} lower={event?.kind === 'solar'}/> : null}
    {shelteredOutside && <section role="status" className="absolute left-1/2 top-[132px] z-50 flex w-[min(560px,calc(100vw-40px))] -translate-x-1/2 items-center gap-4 rounded-[1.6rem] border-4 border-[#7af0d8] bg-[#173b3e]/95 p-4 text-white shadow-2xl"><span aria-hidden="true" className="text-5xl">{game.shelterZone === 'cave' ? '🕳️' : '🛡️'}</span><div className="flex-1"><h2 className="text-xl font-black">Safe from the solar storm!</h2><p className="text-sm font-semibold text-white/85">The crew waits in the {game.shelterZone === 'cave' ? 'lava tube cave' : 'storm bunker'} until the sol ends.</p></div><button type="button" onClick={startSleep} disabled={Boolean(sleepBlockedReason)} className="min-h-14 rounded-2xl border-[3px] border-white bg-[#6c5ce7] px-4 text-base font-black hover:bg-[#7f71f0] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-55">🌙 Sleep</button></section>}
    {shipInteriorOpen && <ShipInterior game={game} onExit={() => setShipInteriorOpen(false)} onSleep={startSleep} sleepBlockedReason={sleepBlockedReason}/>}
    {sleeping && <SleepOverlay onDone={finishSleep}/>}
    {game.gameOver && endingClosedAt !== game.log.length && <MissionEnding game={game} onReport={() => { setEndingClosedAt(game.log.length); setPanel('report') }} onRetry={() => { setEndingClosedAt(game.log.length); restartGame() }} onHome={() => { setEndingClosedAt(game.log.length); leaveGame() }}/>}
    {landing && <LoadingScreen title={`Sol ${game.sol} of ${game.maxSols}`} subtitle="Landing in Ares Valley" steps={LANDING_STEPS} durationMs={1800} factOffset={game.sol} onDone={() => setLanding(false)}/>}
  </div>
}

function InventoryPanel({ game }: { game: GameState }) {
  const items: { key: ResourceName; label: string; icon: string; tone: string }[] = [
    { key: 'energy', label: 'Energy', icon: '⚡', tone: 'bg-[#fff0cf]' },
    { key: 'water', label: 'Water', icon: '💧', tone: 'bg-[#e2f2f6]' },
    { key: 'food', label: 'Food', icon: '🥬', tone: 'bg-[#e8f2dc]' },
    { key: 'spareParts', label: 'Spare parts', icon: '🔩', tone: 'bg-[#f2e5da]' },
    { key: 'seeds', label: 'Seeds', icon: '🌱', tone: 'bg-[#e6efd9]' },
  ]
  const buildingNames = BUILDING_LABEL
  const buildingCounts: Record<BuildingType, number> = { habitat: 0, solar: 0, greenhouse: 0, water: 0, garage: 0, bunker: 0 }
  for (const building of game.buildings) buildingCounts[building.type] += 1
  return <div className="space-y-3 text-[#3e354d]">
    <section aria-label="Available resources" className="grid grid-cols-2 gap-2">{items.map(({ key, label, icon, tone }) => <article key={key} className={`rounded-xl border border-white bg-white/85 p-3 shadow-sm ${tone}`}><p className="flex items-center justify-between text-[10px] font-extrabold text-[#75666a]"><span>{label}</span><span aria-hidden="true" className="text-sm">{icon}</span></p><p className="mt-1 text-2xl font-black tabular-nums">{game.resources[key]}<span className="ml-1 text-[10px] font-bold text-[#897a7a]">{key === 'energy' || key === 'water' || key === 'food' ? '/100' : 'units'}</span></p>{(key === 'energy' || key === 'water' || key === 'food') && <progress aria-label={`${label}: ${game.resources[key]} of 100`} max={100} value={game.resources[key]} className="mt-2 h-2 w-full accent-[#5c9d8a]"/>}</article>)}</section>
    <section className="rounded-xl border border-[#e6d4bc] bg-white/80 p-3"><header className="flex items-center justify-between"><h3 className="text-xs font-black">Working structures</h3><span className="text-[9px] font-bold text-[#827378]">{game.buildings.length} installed</span></header><ul className="mt-2 space-y-1.5">{(Object.keys(buildingNames) as (keyof typeof buildingNames)[]).map((type) => <li key={type} className="flex items-center justify-between rounded-lg bg-[#f5ecdf] px-3 py-2 text-[11px]"><span className="font-semibold">{BUILDING_ICON[type]} {buildingNames[type]}</span><strong>{buildingCounts[type]}</strong></li>)}</ul></section>
    <section className="grid grid-cols-2 gap-2"><InventoryStat label="Life support" value={game.lifeSupport === 'stable' ? 'Stable' : game.lifeSupport === 'risk' ? 'At risk' : 'Critical'}/><InventoryStat label="Exposure level" value={`${game.educationalRisk} / 100`}/><InventoryStat label="Crop" value={game.crop.active ? `${game.crop.growth}% · ${game.crop.health}% health` : game.crop.harvested ? 'Harvested' : 'Not planted'}/><InventoryStat label="Your position" value={`${Math.round(game.mapPosition.x)}, ${Math.round(game.mapPosition.y)}`}/></section>
    <p className="rounded-xl bg-[#eee5d6] p-3 text-[10px] leading-4 text-[#71656a]">Every sol, life support uses energy, water and food. Solar panels recharge energy; the greenhouse uses energy and water to care for the crop.</p>
    <section className="rounded-xl border border-[#d9c5aa] bg-[#fbf0de] p-3"><h3 className="text-xs font-black text-[#483b53]">Supplies marked in the valley</h3><p className="mt-1 text-[10px] leading-4 text-[#71636a]">NOVA marked boxes, ice and battery cells around the valley. Walk to one and press E to collect it. Each spot refills a few sols later.</p><ul className="mt-2 space-y-1">{supplySites.map((site) => { const readySol = supplyReadyOnSol(game, site.id); const collected = readySol > game.sol; const labels = { energy: 'energy', water: 'water', food: 'food', spareParts: 'spare parts', seeds: 'seeds' } as const; return <li key={site.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-[10px]"><span className="font-bold text-[#514450]">{site.name}</span><span className={collected ? 'font-bold text-[#6a7e65]' : 'font-black text-[#4f795d]'}>{collected ? `Refills on sol ${readySol}` : `+${site.amount} ${labels[site.resource]}`}</span></li> })}</ul></section>
  </div>
}

function InventoryStat({ label, value }: { label: string; value: string }) {
  return <article className="rounded-xl border border-[#e7d5bc] bg-white/80 p-3"><p className="text-[9px] font-extrabold text-[#857477]">{label}</p><p className="mt-1 text-xs font-black text-[#40374d]">{value}</p></article>
}
function CropPanel({ game, playerPosition, onAction }: { game: GameState; playerPosition: WorldPosition; onAction: (command: GameCommand) => void }) {
  const active = game.crop.active && !game.crop.harvested
  const ready = active && game.crop.growth >= 100
  const greenhouse = game.buildings.find((building) => building.type === 'greenhouse')
  const greenhousePlot = greenhouse ? marsPlots.find((plot) => plot.id === greenhouse.plotId) : undefined
  const nearGreenhouse = Boolean(greenhousePlot && isWithinInteractionRange(playerPosition, greenhousePlot, MARS_WORLD.interactionRange))
  const canSow = !active && game.resources.seeds >= 1 && !game.crewBusy && !pendingEvent(game) && nearGreenhouse
  const growthRate = GREENHOUSE_MODE[game.crop.mode].growth
  const remainingSols = growthRate ? Math.ceil((100 - game.crop.growth) / growthRate) : null
  const boostUsed = game.cropBoostedSol === game.sol
  const canBoost = active && !ready && !boostUsed && game.resources.energy >= GAME_CONFIG.cropBoost.energy && !pendingEvent(game) && !game.gameOver
  return <section aria-labelledby="crop-title" className="rounded-[1.4rem] border-2 border-white bg-[#f3f4d9] p-4 shadow-[0_8px_20px_#513a5a18]"><header className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#68805a]">Crop module</p><h2 id="crop-title" className="mt-1 text-lg font-black text-[#333651]">Greenhouse</h2></div><span className="grid size-10 place-items-center rounded-2xl bg-white/70 text-[#56815b]"><Sprout size={20}/></span></header>
    {!greenhouse ? <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs leading-5 text-[#5c6659]">Build the greenhouse before you can plant.</p> : !active ? <div className="mt-3"><p className="text-xs leading-5 text-[#5c6659]">{game.crop.harvested ? (game.resources.seeds >= 1 ? 'Harvest done! You have a seed: plant again for more food 🌱' : 'Harvest done! Find a seed case to plant again 🌱') : 'No seeds are growing at the base yet.'}</p>{<div className="mt-2 rounded-xl border border-[#d9dfbd] bg-white/75 px-3 py-2 text-[10px] leading-4 text-[#56634f]">Estimated time from planting: <strong>5 sol closes in normal mode</strong> or 10 in saving mode, if there is enough water and energy. The button below closes each workday.</div>}{!nearGreenhouse && <p className="mt-2 rounded-lg bg-[#e9efd9] px-3 py-2 text-[10px] font-bold text-[#526a4b]">Walk to the greenhouse to plant.</p>}<button type="button" disabled={!canSow} onClick={() => onAction({ type: 'sow' })} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#548955] px-4 text-xs font-black text-white hover:bg-[#3f7548] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#334858] disabled:cursor-not-allowed disabled:bg-[#aaa99b]">Plant · preview</button>{game.crewBusy && <p className="mt-1 text-[10px] font-semibold text-[#826843]">The crew finishes its task when the sol advances.</p>}</div> : <><div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#e9f3dc] px-3 py-2"><span aria-hidden="true" className="text-5xl">{game.crop.growth >= 100 ? '🥬' : game.crop.growth >= 67 ? '🪴' : game.crop.growth >= 34 ? '🌿' : '🌱'}</span><p className="text-sm font-black text-[#3d5a3f]">{game.crop.growth >= 100 ? 'Ready to harvest!' : game.crop.growth >= 67 ? 'Almost ready!' : game.crop.growth >= 34 ? 'Leaves are growing' : 'A tiny sprout'}<span className="block text-xs font-semibold text-[#5c6659]">It grows when each sol ends. Sleep to make time pass.</span></p></div><div className="mt-3 grid grid-cols-2 gap-2"><CropMetric label="Growth" value={`${game.crop.growth}%`}/><CropMetric label="Health" value={`${game.crop.health}%`}/></div><progress aria-label={`Crop growth: ${game.crop.growth} percent`} max={100} value={game.crop.growth} className="mt-3 h-3 w-full overflow-hidden rounded-full accent-[#58a162]"/><p className="mt-1 text-[10px] font-semibold text-[#5c6659]">Current mode: {modeLabel(game.crop.mode)}. Changing it costs nothing right now.</p><div className="mt-2 rounded-xl border border-[#d9dfbd] bg-white/75 px-3 py-2 text-[10px] leading-4 text-[#56634f]">{ready ? 'Crop ready to harvest.' : remainingSols === null ? 'Time left: paused while the greenhouse is off.' : `Estimated time: ${remainingSols} sol ${remainingSols === 1 ? 'close' : 'closes'} in ${modeLabel(game.crop.mode).toLowerCase()} mode, if there is water and energy.`}</div><div className="mt-3 grid grid-cols-3 gap-1.5">{(['normal','saving','off'] as const).map((mode) => <button key={mode} type="button" disabled={game.crop.mode === mode || Boolean(pendingEvent(game)) || game.gameOver} onClick={() => onAction({ type: 'setMode', mode })} className={`min-h-10 rounded-xl border px-2 text-[10px] font-black focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#38455b] disabled:cursor-not-allowed disabled:opacity-55 ${game.crop.mode === mode ? 'border-[#446f4b] bg-[#4d8054] text-white' : 'border-[#c6d2b5] bg-white/80 text-[#4e5f50] hover:bg-white'}`}>{modeLabel(mode)}</button>)}</div><div className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[10px] leading-4 text-[#5c6659]">{modeEffects(game.crop.mode)}</div>{active && !ready && <button type="button" disabled={!canBoost} onClick={() => onAction({ type: 'accelerateCrop' })} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#e1b956] bg-[#fff0bf] px-3 text-[11px] font-black text-[#70501f] hover:bg-[#ffe8a0] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#493550] disabled:cursor-not-allowed disabled:bg-[#e7e2d0] disabled:text-[#827c70]"><Zap size={15}/>{boostUsed ? 'Boost used this sol' : `Boost +${GAME_CONFIG.cropBoost.growth}% · −${GAME_CONFIG.cropBoost.energy} energy`}</button>}{active && !ready && !boostUsed && game.resources.energy < GAME_CONFIG.cropBoost.energy && <p className="mt-1 text-[10px] font-semibold text-[#89674d]">You need {GAME_CONFIG.cropBoost.energy} energy to boost; the second panel makes extra energy each time a sol closes.</p>}{ready && !nearGreenhouse && <p className="mt-2 rounded-lg bg-[#e9efd9] px-3 py-2 text-[10px] font-bold text-[#526a4b]">Walk to the greenhouse to harvest.</p>}{ready && <button type="button" disabled={game.crewBusy || Boolean(pendingEvent(game)) || !nearGreenhouse} onClick={() => onAction({ type: 'harvest' })} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d97741] px-4 text-xs font-black text-white hover:bg-[#bd6135] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#493550] disabled:cursor-not-allowed disabled:opacity-60"><Leaf size={16}/>Harvest · preview</button>}</>}
  </section>
}

function CropMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white/75 px-3 py-2"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#697660]">{label}</p><p className="text-lg font-black text-[#344957]">{value}</p></div> }
function modeLabel(mode: GreenhouseMode) { return mode === 'normal' ? 'Normal' : mode === 'saving' ? 'Saving' : 'Off' }
function modeEffects(mode: GreenhouseMode) { const values = GREENHOUSE_MODE[mode]; return mode === 'off' ? 'Uses no resources and the plants do not grow. Two pauses in a row hurt their health.' : `Per sol: −${values.energy} energy, −${values.water} water and up to +${values.growth}% growth, if reserves remain.` }

function ActionHistory({ game }: { game: GameState }) {
  const entries = game.log.slice(-4).reverse()
  return <section aria-labelledby="history-title" className="rounded-[1.4rem] border-2 border-white bg-[#f9ead5] p-4"><header className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#8d675e]">Onboard logbook</p><h2 id="history-title" className="mt-1 text-base font-black text-[#39334f]">Latest changes</h2></div><Trophy size={19} className="text-[#bd8842]"/></header>{entries.length ? <ol className="mt-3 space-y-2">{entries.map((entry, index) => <li key={`${entry.sol}-${entry.action}-${index}`} className="rounded-xl bg-white/75 px-3 py-2"><p className="flex items-center justify-between gap-2 text-[10px] font-black text-[#453a54]"><span>{entry.action}</span><span>Sol {entry.sol}</span></p><p className="mt-1 text-[10px] leading-4 text-[#71636a]">{entry.consequence}</p></li>)}</ol> : <p className="mt-2 text-xs text-[#71636a]">Your decisions will appear here.</p>}</section>
}

function DecisionPreviewModal({ game, command, preview, onCancel, onConfirm }: { game: GameState; command: GameCommand; preview: ReturnType<typeof previewDecision>; onCancel: () => void; onConfirm: () => void }) {
  const title = command.type === 'build' ? `Build ${command.building === 'solar' ? 'solar panel' : 'greenhouse'}` : command.type === 'sow' ? 'Plant a crop' : command.type === 'harvest' ? 'Harvest food' : command.type === 'accelerateCrop' ? 'Boost the crop' : command.type === 'setMode' ? `Switch to ${modeLabel(command.mode).toLowerCase()} mode` : command.type === 'advance' ? `Close sol ${game.sol}` : 'Review event decision'
  const deltaEntries = Object.entries(preview.immediateDeltas) as [ResourceName, number][]
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#241f36]/70 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}><section role="dialog" aria-modal="true" aria-labelledby="decision-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.7rem] border-4 border-white bg-[#fff5e2] p-5 shadow-[0_20px_80px_#211b35aa] sm:p-6"><p className="inline-flex items-center gap-2 rounded-full bg-[#f2e2ca] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[#725a62]"><Zap size={13} className="text-[#d77c45]"/> Review before confirming</p><h2 id="decision-title" className="mt-3 text-2xl font-black text-[#332f52]">{title}</h2><p className="mt-1 text-xs text-[#6c5e67]">No resources have been spent yet.</p>
    <div className="mt-4 rounded-2xl border border-[#e7d2b9] bg-white/80 p-4"><h3 className="text-xs font-black text-[#413851]">Immediate change</h3>{deltaEntries.length ? <ul className="mt-2 grid grid-cols-2 gap-2">{deltaEntries.map(([resource, value]) => <li key={resource} className="rounded-xl bg-[#f2eadc] px-3 py-2 text-xs font-bold text-[#5c4c57]">{resourceLabels[resource]} <strong className={value < 0 ? 'text-[#a84c41]' : 'text-[#47844d]'}>{value > 0 ? '+' : ''}{value}</strong></li>)}</ul> : <p className="mt-2 text-xs text-[#756970]">No immediate change in resources.</p>}</div>
    <div className="mt-3 rounded-2xl border border-[#e7d2b9] bg-white/80 p-4"><h3 className="text-xs font-black text-[#413851]">What may happen</h3><ul className="mt-2 space-y-2">{preview.conditionalEffects.map((effect) => <li key={effect} className="flex gap-2 text-xs leading-5 text-[#655a63]"><span className="mt-0.5 text-[#d57845]">•</span>{effect}</li>)}</ul>{command.type === 'advance' && <div className="mt-3 flex flex-wrap gap-1.5">{(['energy','water','food'] as const).map((resource) => <span key={resource} className="rounded-full bg-[#f2eadc] px-2.5 py-1 text-[10px] font-black text-[#55485b]">{resourceLabels[resource]} now: {game.resources[resource]}</span>)}</div>}</div>
    <p className="mt-3 text-[10px] leading-4 text-[#796b70]">{preview.assumptions[0]} Future results depend on your reserves and events.</p><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="min-h-11 rounded-xl border-2 border-[#d8c3ad] px-5 text-xs font-black text-[#55485b] hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#493550]">Cancel</button><button type="button" onClick={onConfirm} className="min-h-11 rounded-xl bg-[#d56d4f] px-5 text-xs font-black text-white hover:bg-[#b95642] focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#493550]">Confirm action</button></div></section></div>
}

// Owns the once-per-second clock so only this bar re-renders every second,
// not the whole game screen and map.
function SolClock({ solStartedAt, hasPendingEvent, gameOver, scenarioId }: { solStartedAt: number | null; hasPendingEvent: boolean; gameOver: boolean; scenarioId: ScenarioId }) {
  const solSeconds = solSecondsFor(scenarioId)
  const dispatch = useGameStore((state) => state.dispatch)
  const [clockNow, setClockNow] = useState(() => Date.now())
  useEffect(() => {
    if (gameOver || solStartedAt === null) return
    const updateClock = () => {
      const now = Date.now()
      setClockNow(now)
      const currentGame = useGameStore.getState().game
      if (!currentGame || currentGame.gameOver || now - solStartedAt < solSeconds * 1000) return
      if (pendingEvent(currentGame)) return
      dispatch({ type: 'advanceTimed' })
    }
    updateClock()
    const timer = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(timer)
  }, [dispatch, gameOver, solStartedAt, solSeconds])
  const elapsedSeconds = solStartedAt === null ? 0 : Math.max(0, Math.floor((clockNow - solStartedAt) / 1000))
  const remainingSeconds = Math.max(0, solSeconds - elapsedSeconds)
  const clockLabel = hasPendingEvent ? 'Resolve the alert to close the sol' : remainingSeconds === 0 ? 'The workday is ready to close' : `Auto-close in ${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`
  return <section aria-label="Sol duration" className="pointer-events-none absolute left-1/2 top-[80px] z-30 w-[min(370px,calc(100vw-470px))] -translate-x-1/2 rounded-xl border border-white/30 bg-[#302b48]/90 px-3 py-2 text-white shadow-lg backdrop-blur-md">
    <div className="flex items-center justify-between gap-3 text-[9px] font-black"><span>{`Workday · ${Math.round(solSeconds / 6) / 10} min`}</span><span>{clockLabel}</span></div>
    <progress aria-label={`${Math.min(elapsedSeconds, solSeconds)} of ${solSeconds} seconds of the sol`} max={solSeconds} value={Math.min(elapsedSeconds, solSeconds)} className="mt-1.5 h-2 w-full overflow-hidden rounded-full accent-[#ffd37b]"/>
    <p className="mt-1 text-center text-[8px] font-semibold text-white/65">Ends on its own · advancing now costs {GAME_CONFIG.fastForwardEnergyCost} ⚡</p>
  </section>
}
