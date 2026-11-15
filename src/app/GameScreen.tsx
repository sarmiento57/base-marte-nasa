import { useMemo, useRef } from 'react'
import { ArrowRight, Clock3, Leaf, Sprout, Sun, Trophy, Zap } from 'lucide-react'
import { BuildingPreview } from '../components/buildings/BuildingPreview'
import { EventStatus } from '../components/events/EventStatus'
import { ResourceStatus } from '../components/hud/ResourceStatus'
import { MarsMap } from '../components/map/MarsMap'
import { MissionPreview } from '../components/missions/MissionPreview'
import { isWithinInteractionRange } from '../data/mars/movement'
import { marsPlots } from '../data/mars/plots'
import { MARS_WORLD } from '../data/mars/world'
import { GREENHOUSE_MODE } from '../engine/config'
import { pendingEvent } from '../engine/events'
import { previewDecision } from '../engine/previewDecision'
import type { GameCommand, GameState, GreenhouseMode, ResourceName, WorldPosition } from '../engine/types'
import { useGameStore } from '../store/useGameStore'

const resourceLabels: Record<ResourceName, string> = { energy: 'energía', water: 'agua', food: 'comida', spareParts: 'repuestos', seeds: 'semillas' }

export function GameScreen() {
  const game = useGameStore((state) => state.game)
  const selectedPlotId = useGameStore((state) => state.selectedPlotId)
  const screenRef = useRef<HTMLDivElement | null>(null)
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
  const event = game ? pendingEvent(game) : undefined
  const preview = game && previewCommand ? previewDecision(game, previewCommand) : null
  const nextSolarOutput = useMemo(() => {
    if (!game) return 0
    const panels = game.buildings.filter((building) => building.type === 'solar' && building.operational).length
    const storm = game.sol === game.eventSols.dust || game.sol === game.eventSols.dust + 1
    return panels ? (storm ? 5 : 18) + Math.max(0, panels - 1) * (storm ? 2 : 6) : 0
  }, [game])

  if (!game) return <section className="rounded-3xl border-2 border-white bg-[#fff5e2] p-8 text-center text-[#4b3d55]"><h2 className="text-xl font-black">Aún no hay una misión abierta</h2><p className="mt-2 text-sm">Vuelve al campamento y comienza una partida.</p></section>
  const run = (command: GameCommand) => { openPreview(command) }
  const focusMap = () => screenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const dustChoice = (choice: 'saving' | 'normal') => dispatch({ type: 'resolveDust', choice })
  const solarChoice = (choice: 'shelter' | 'continue') => dispatch({ type: 'resolveSolar', choice })
  const advanceTitle = game.sol >= game.maxSols ? 'Cerrar misión' : `Avanzar al sol ${game.sol + 1}`

  return <div className="space-y-3">
    <ResourceStatus game={game}/>
    {(errorMessage || message) && <div role={errorMessage ? 'alert' : 'status'} aria-live="polite" className={`flex items-start gap-2 rounded-2xl border-2 px-4 py-3 text-xs font-bold shadow-sm ${errorMessage ? 'border-[#e2a18a] bg-[#fff0e8] text-[#9b493e]' : 'border-[#bdd5a8] bg-[#eef6e6] text-[#486e46]'}`}><span aria-hidden="true">{errorMessage ? '!' : '✦'}</span><p className="flex-1">{errorMessage ?? message}</p><button type="button" onClick={() => useGameStore.getState().clearMessage()} aria-label="Cerrar mensaje" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-current">×</button></div>}
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,.8fr)] 2xl:grid-cols-[minmax(0,1.8fr)_390px]">
      <div className="min-w-0 space-y-3">
        <section ref={screenRef} id="mapa-marte" aria-label="Aventura en Marte" className="overflow-hidden rounded-[1.75rem] border-2 border-[#fff7e6] bg-[#48344a] shadow-[0_16px_36px_#47334935]">
          <header className="flex flex-wrap items-center justify-between gap-3 bg-[#322e56] px-4 py-3 text-white sm:px-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#f3a76a] text-[#493350]"><Sun size={21}/></span><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#f6d7a8]">Exploración libre · Valle de Ares</p><h2 className="text-base font-black sm:text-lg">Sol {String(game.sol).padStart(2, '0')} <span className="text-white/50">/ {game.maxSols}</span></h2></div></div><div className="flex items-center gap-2"><span className="hidden rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold sm:inline-flex sm:items-center sm:gap-2"><Zap size={14} className="text-amber-300"/> {nextSolarOutput} energía solar esperada</span><button type="button" onClick={() => setScreen('science')} className="min-h-10 rounded-xl border border-white/25 bg-white/10 px-3 text-[10px] font-extrabold hover:bg-white/20 focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-white">Ciencia NASA</button></div></header>
          <MarsMap/>
          <footer className="flex flex-wrap items-center justify-between gap-2 bg-[#3d3151] px-4 py-2.5 text-[10px] font-bold text-white/80 sm:px-5"><span className="inline-flex items-center gap-1.5"><Clock3 size={13}/> {game.crewBusy ? 'Equipo ocupado por esta acción' : 'Equipo disponible para una tarea'}</span><span>Movimiento libre · no cambia recursos ni el sol</span></footer>
        </section>
      </div>
      <aside className="space-y-3" aria-label="Panel de misión">
        <EventStatus game={game} onDustChoice={dustChoice} onSolarChoice={solarChoice}/>
        <MissionPreview game={game} dismissed={tutorialDismissed} onDismiss={dismissTutorial} onSow={() => run({ type: 'sow' })} onFocusMap={focusMap}/>
        <BuildingPreview game={game} selectedPlotId={selectedPlotId} playerPosition={game.mapPosition} onBuild={(building, plotId) => run({ type: 'build', building, plotId })}/>
        <CropPanel game={game} playerPosition={game.mapPosition} onAction={run}/>
        <section className="rounded-[1.4rem] border-2 border-[#f7d58e] bg-[#ffefcf] p-4 shadow-[0_8px_22px_#35233a16]"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#8e5b48]">Ritmo de la misión</p><h2 className="mt-1 text-lg font-black text-[#3d3451]">{advanceTitle}</h2><p className="mt-1 text-[11px] leading-5 text-[#655563]">Revisa el gasto previsto, el soporte vital y el cultivo antes de cerrar el sol.</p><button type="button" disabled={Boolean(event) || game.gameOver} onClick={() => run({ type: 'advance' })} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d56d4f] px-4 text-sm font-black text-white shadow-md hover:bg-[#b95642] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#493550] disabled:cursor-not-allowed disabled:bg-[#b9adaa]"><ArrowRight size={18}/>{advanceTitle} · vista previa</button>{event && <p className="mt-2 text-center text-[10px] font-black text-[#925b43]">Resuelve la alerta para avanzar.</p>}{game.gameOver && <button type="button" onClick={() => setScreen('report')} className="mt-2 min-h-10 w-full rounded-xl bg-[#4d4267] px-3 text-xs font-black text-white">Ver informe de misión</button>}</section>
        <ActionHistory game={game}/>
      </aside>
    </div>
    {previewCommand && preview && <DecisionPreviewModal game={game} command={previewCommand} preview={preview} onCancel={cancelPreview} onConfirm={confirmPreview}/>}
  </div>
}

function CropPanel({ game, playerPosition, onAction }: { game: GameState; playerPosition: WorldPosition; onAction: (command: GameCommand) => void }) {
  const active = game.crop.active && !game.crop.harvested
  const ready = active && game.crop.growth >= 100
  const greenhouse = game.buildings.find((building) => building.type === 'greenhouse')
  const greenhousePlot = greenhouse ? marsPlots.find((plot) => plot.id === greenhouse.plotId) : undefined
  const nearGreenhouse = Boolean(greenhousePlot && isWithinInteractionRange(playerPosition, greenhousePlot, MARS_WORLD.interactionRange))
  const canSow = !active && !game.crop.harvested && !game.crewBusy && !pendingEvent(game) && nearGreenhouse
  return <section aria-labelledby="crop-title" className="rounded-[1.4rem] border-2 border-white bg-[#f3f4d9] p-4 shadow-[0_8px_20px_#513a5a18]"><header className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#68805a]">Módulo de cultivo</p><h2 id="crop-title" className="mt-1 text-lg font-black text-[#333651]">Invernadero</h2></div><span className="grid size-10 place-items-center rounded-2xl bg-white/70 text-[#56815b]"><Sprout size={20}/></span></header>
    {!greenhouse ? <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs leading-5 text-[#5c6659]">Construye el invernadero antes de poder sembrar.</p> : !active ? <div className="mt-3"><p className="text-xs leading-5 text-[#5c6659]">{game.crop.harvested ? 'Ya cosechaste el único cultivo de esta misión.' : 'Todavía no hay semillas creciendo en la base.'}</p>{!game.crop.harvested && !nearGreenhouse && <p className="mt-2 rounded-lg bg-[#e9efd9] px-3 py-2 text-[10px] font-bold text-[#526a4b]">Camina hasta el invernadero para sembrar.</p>}<button type="button" disabled={!canSow} onClick={() => onAction({ type: 'sow' })} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#548955] px-4 text-xs font-black text-white hover:bg-[#3f7548] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#334858] disabled:cursor-not-allowed disabled:bg-[#aaa99b]">Sembrar · vista previa</button>{game.crewBusy && <p className="mt-1 text-[10px] font-semibold text-[#826843]">La tripulación termina su trabajo al avanzar el sol.</p>}</div> : <><div className="mt-3 grid grid-cols-2 gap-2"><CropMetric label="Crecimiento" value={`${game.crop.growth}%`}/><CropMetric label="Salud" value={`${game.crop.health}%`}/></div><progress aria-label={`Crecimiento del cultivo: ${game.crop.growth} por ciento`} max={100} value={game.crop.growth} className="mt-3 h-3 w-full overflow-hidden rounded-full accent-[#58a162]"/><p className="mt-1 text-[10px] font-semibold text-[#5c6659]">Modo actual: {modeLabel(game.crop.mode)}. Cambiarlo no consume recursos en el momento.</p><div className="mt-3 grid grid-cols-3 gap-1.5">{(['normal','saving','off'] as const).map((mode) => <button key={mode} type="button" disabled={game.crop.mode === mode || Boolean(pendingEvent(game)) || game.gameOver} onClick={() => onAction({ type: 'setMode', mode })} className={`min-h-10 rounded-xl border px-2 text-[10px] font-black focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#38455b] disabled:cursor-not-allowed disabled:opacity-55 ${game.crop.mode === mode ? 'border-[#446f4b] bg-[#4d8054] text-white' : 'border-[#c6d2b5] bg-white/80 text-[#4e5f50] hover:bg-white'}`}>{modeLabel(mode)}</button>)}</div><div className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[10px] leading-4 text-[#5c6659]">{modeEffects(game.crop.mode)}</div>{ready && !nearGreenhouse && <p className="mt-2 rounded-lg bg-[#e9efd9] px-3 py-2 text-[10px] font-bold text-[#526a4b]">Camina hasta el invernadero para cosechar.</p>}{ready && <button type="button" disabled={game.crewBusy || Boolean(pendingEvent(game)) || !nearGreenhouse} onClick={() => onAction({ type: 'harvest' })} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d97741] px-4 text-xs font-black text-white hover:bg-[#bd6135] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#493550] disabled:cursor-not-allowed disabled:opacity-60"><Leaf size={16}/>Cosechar · vista previa</button>}</>}
  </section>
}

function CropMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white/75 px-3 py-2"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#697660]">{label}</p><p className="text-lg font-black text-[#344957]">{value}</p></div> }
function modeLabel(mode: GreenhouseMode) { return mode === 'normal' ? 'Normal' : mode === 'saving' ? 'Ahorro' : 'Apagado' }
function modeEffects(mode: GreenhouseMode) { const values = GREENHOUSE_MODE[mode]; return mode === 'off' ? 'No consume recursos ni hace crecer las plantas. Dos pausas consecutivas dañan su salud.' : `Por sol: −${values.energy} energía, −${values.water} agua y hasta +${values.growth}% de crecimiento, si quedan reservas.` }

function ActionHistory({ game }: { game: GameState }) {
  const entries = game.log.slice(-4).reverse()
  return <section aria-labelledby="history-title" className="rounded-[1.4rem] border-2 border-white bg-[#f9ead5] p-4"><header className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#8d675e]">Bitácora de a bordo</p><h2 id="history-title" className="mt-1 text-base font-black text-[#39334f]">Últimos cambios</h2></div><Trophy size={19} className="text-[#bd8842]"/></header>{entries.length ? <ol className="mt-3 space-y-2">{entries.map((entry, index) => <li key={`${entry.sol}-${entry.action}-${index}`} className="rounded-xl bg-white/75 px-3 py-2"><p className="flex items-center justify-between gap-2 text-[10px] font-black text-[#453a54]"><span>{entry.action}</span><span>Sol {entry.sol}</span></p><p className="mt-1 text-[10px] leading-4 text-[#71636a]">{entry.consequence}</p></li>)}</ol> : <p className="mt-2 text-xs text-[#71636a]">Las decisiones que tomes aparecerán aquí.</p>}</section>
}

function DecisionPreviewModal({ game, command, preview, onCancel, onConfirm }: { game: GameState; command: GameCommand; preview: ReturnType<typeof previewDecision>; onCancel: () => void; onConfirm: () => void }) {
  const title = command.type === 'build' ? `Construir ${command.building === 'solar' ? 'panel solar' : 'invernadero'}` : command.type === 'sow' ? 'Sembrar un cultivo' : command.type === 'harvest' ? 'Cosechar alimentos' : command.type === 'setMode' ? `Cambiar a modo ${modeLabel(command.mode).toLowerCase()}` : command.type === 'advance' ? `Cerrar sol ${game.sol}` : 'Revisar decisión del evento'
  const deltaEntries = Object.entries(preview.immediateDeltas) as [ResourceName, number][]
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#241f36]/70 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}><section role="dialog" aria-modal="true" aria-labelledby="decision-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.7rem] border-4 border-white bg-[#fff5e2] p-5 shadow-[0_20px_80px_#211b35aa] sm:p-6"><p className="inline-flex items-center gap-2 rounded-full bg-[#f2e2ca] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[#725a62]"><Zap size={13} className="text-[#d77c45]"/> Revisión antes de confirmar</p><h2 id="decision-title" className="mt-3 text-2xl font-black text-[#332f52]">{title}</h2><p className="mt-1 text-xs text-[#6c5e67]">Todavía no se han descontado recursos.</p>
    <div className="mt-4 rounded-2xl border border-[#e7d2b9] bg-white/80 p-4"><h3 className="text-xs font-black text-[#413851]">Cambio inmediato</h3>{deltaEntries.length ? <ul className="mt-2 grid grid-cols-2 gap-2">{deltaEntries.map(([resource, value]) => <li key={resource} className="rounded-xl bg-[#f2eadc] px-3 py-2 text-xs font-bold text-[#5c4c57]">{resourceLabels[resource]} <strong className={value < 0 ? 'text-[#a84c41]' : 'text-[#47844d]'}>{value > 0 ? '+' : ''}{value}</strong></li>)}</ul> : <p className="mt-2 text-xs text-[#756970]">Sin cambio inmediato en recursos.</p>}</div>
    <div className="mt-3 rounded-2xl border border-[#e7d2b9] bg-white/80 p-4"><h3 className="text-xs font-black text-[#413851]">Lo que puede ocurrir</h3><ul className="mt-2 space-y-2">{preview.conditionalEffects.map((effect) => <li key={effect} className="flex gap-2 text-xs leading-5 text-[#655a63]"><span className="mt-0.5 text-[#d57845]">•</span>{effect}</li>)}</ul>{command.type === 'advance' && <div className="mt-3 flex flex-wrap gap-1.5">{(['energy','water','food'] as const).map((resource) => <span key={resource} className="rounded-full bg-[#f2eadc] px-2.5 py-1 text-[10px] font-black text-[#55485b]">{resourceLabels[resource]} ahora: {game.resources[resource]}</span>)}</div>}</div>
    <p className="mt-3 text-[10px] leading-4 text-[#796b70]">{preview.assumptions[0]} Los resultados futuros dependen de las reservas y los eventos.</p><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="min-h-11 rounded-xl border-2 border-[#d8c3ad] px-5 text-xs font-black text-[#55485b] hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#493550]">Cancelar</button><button type="button" onClick={onConfirm} className="min-h-11 rounded-xl bg-[#d56d4f] px-5 text-xs font-black text-white hover:bg-[#b95642] focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#493550]">Confirmar acción</button></div></section></div>
}
