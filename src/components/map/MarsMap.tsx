import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Crosshair, Mountain, RadioTower } from 'lucide-react'
import { BatteryCharging, Boxes, Droplets, PackageOpen, Sprout } from 'lucide-react'
import { marsPlots } from '../../data/mars/plots'
import { supplySites, type SupplySite } from '../../data/mars/supplies'
import { isWithinInteractionRange, moveToward } from '../../data/mars/movement'
import { createAlienFlybySchedule, createAlienFlightPath, getVisitorDialogue, visitingAstronauts } from '../../data/mars/livingWorld'
import { surfaceStones } from '../../data/mars/surface'
import { MARS_WORLD } from '../../data/mars/world'
import { pendingEvent } from '../../engine/events'
import type { ScenarioId, WorldPosition } from '../../engine/types'
import { useGameStore } from '../../store/useGameStore'
import { SolarShelterAlert } from '../events/SolarShelterAlert'

const directions = {
  ArrowUp: 'up', w: 'up',
  ArrowDown: 'down', s: 'down',
  ArrowLeft: 'left', a: 'left',
  ArrowRight: 'right', d: 'right',
} as const
type MovementDirection = 'up' | 'down' | 'left' | 'right'

export function MarsMap({ immersive = false, solarSecondsRemaining = null, onEnterHabitat }: { immersive?: boolean; solarSecondsRemaining?: number | null; onEnterHabitat?: () => void } = {}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const walkRef = useRef<{ frame: number; destination: WorldPosition | null; direction: MovementDirection | null; position: WorldPosition | null; lastTime: number; lastPublishedAt: number; conversationId: string | null }>({ frame: 0, destination: null, direction: null, position: null, lastTime: 0, lastPublishedAt: 0, conversationId: null })
  const [walking, setWalking] = useState(false)
  const [facing, setFacing] = useState(0)
  const game = useGameStore((state) => state.game)
  const selectedPlotId = useGameStore((state) => state.selectedPlotId)
  const selectPlot = useGameStore((state) => state.selectPlot)
  const setAstronautPosition = useGameStore((state) => state.setAstronautPosition)
  const dispatch = useGameStore((state) => state.dispatch)
  const repeatNovaLine = useGameStore((state) => state.repeatNovaLine)
  const setNovaLine = useGameStore((state) => state.setNovaLine)
  useEffect(() => () => {
    cancelAnimationFrame(walkRef.current.frame)
  }, [])
  const mapPosition = game?.mapPosition
  const camera = useMemo(() => {
    if (!mapPosition) return { x: 0, y: 0 }
    return {
      x: Math.max(0, Math.min(MARS_WORLD.width * MARS_WORLD.zoom - MARS_WORLD.viewWidth, mapPosition.x * MARS_WORLD.zoom - MARS_WORLD.viewWidth / 2)),
      y: Math.max(0, Math.min(MARS_WORLD.height * MARS_WORLD.zoom - MARS_WORLD.viewHeight, mapPosition.y * MARS_WORLD.zoom - MARS_WORLD.viewHeight / 2)),
    }
  }, [mapPosition])
  const selectedPlot = marsPlots.find((plot) => plot.id === selectedPlotId)
  const currentEvent = game ? pendingEvent(game) : undefined
  const solarEvent = currentEvent?.kind === 'solar' ? currentEvent : undefined
  const habitatPlot = game ? marsPlots.find((plot) => plot.id === game.buildings.find((building) => building.type === 'habitat')?.plotId) : undefined
  const constructionInProgress = Boolean(game?.crewBusy && game.crewTask === 'build')
  const sheltering = Boolean(game?.crewBusy && game.crewTask === 'shelter')
  const movementLocked = constructionInProgress || sheltering
  const constructionSite = constructionInProgress ? game?.buildings.at(-1) : undefined
  const constructionPlot = constructionSite ? marsPlots.find((plot) => plot.id === constructionSite.plotId) : undefined
  const nearbyVisitor = mapPosition ? visitingAstronauts.find((visitor) => isWithinInteractionRange(mapPosition, visitor, MARS_WORLD.interactionRange)) : undefined
  const collectedSupplyIds = game?.collectedSupplyIds ?? []
  const nearbySupply = mapPosition ? supplySites.find((site) => !collectedSupplyIds.includes(site.id) && isWithinInteractionRange(mapPosition, site.position, MARS_WORLD.interactionRange)) : undefined
  const atHabitat = Boolean(mapPosition && habitatPlot && isWithinInteractionRange(mapPosition, habitatPlot, MARS_WORLD.interactionRange))
  const canEnterHabitat = Boolean(game && !constructionInProgress && (!solarEvent || (game.resources.energy >= 6 && !game.crewBusy)))

  if (!game || !mapPosition) return null

  const stopWalking = () => {
    cancelAnimationFrame(walkRef.current.frame)
    if (walkRef.current.position) setAstronautPosition(walkRef.current.position.x, walkRef.current.position.y)
    walkRef.current.destination = null
    walkRef.current.direction = null
    walkRef.current.position = null
    walkRef.current.lastTime = 0
    walkRef.current.lastPublishedAt = 0
    walkRef.current.conversationId = null
    setWalking(false)
  }

  const animateWalking = (time: number) => {
    const currentGame = useGameStore.getState().game
    const target = walkRef.current.destination
    const direction = walkRef.current.direction
    const current = walkRef.current.position ?? currentGame?.mapPosition
    const locked = currentGame?.crewBusy && (currentGame.crewTask === 'build' || currentGame.crewTask === 'shelter')
    if ((!target && !direction) || !current || !currentGame || locked || currentGame.gameOver) {
      walkRef.current.destination = null
      walkRef.current.direction = null
      walkRef.current.position = null
      walkRef.current.lastTime = 0
      setWalking(false)
      return
    }
    const elapsed = walkRef.current.lastTime ? Math.min(time - walkRef.current.lastTime, 50) : 0
    walkRef.current.lastTime = time
    const step = MARS_WORLD.walkSpeed * elapsed / 1000
    let next: WorldPosition
    if (direction) {
      const vector = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const
      const [dx, dy] = vector[direction]
      next = { x: Math.max(0, Math.min(MARS_WORLD.width, current.x + dx * step)), y: Math.max(0, Math.min(MARS_WORLD.height, current.y + dy * step)) }
    } else {
      next = moveToward(current, target!, step)
    }
    walkRef.current.position = next
    const reached = Boolean(target && next.x === target.x && next.y === target.y)
    if (time - walkRef.current.lastPublishedAt >= 50 || reached) {
      setAstronautPosition(next.x, next.y)
      walkRef.current.lastPublishedAt = time
    }
    if (reached) {
      const visitorId = walkRef.current.conversationId
      walkRef.current.destination = null
      walkRef.current.position = null
      walkRef.current.lastTime = 0
      walkRef.current.lastPublishedAt = 0
      walkRef.current.conversationId = null
      setWalking(false)
      if (visitorId) setNovaLine(getVisitorDialogue(visitorId, currentGame.sol))
      return
    }
    walkRef.current.frame = requestAnimationFrame(animateWalking)
  }

  const walkTo = (destination: WorldPosition, conversationId: string | null = null) => {
    if (movementLocked) return
    cancelAnimationFrame(walkRef.current.frame)
    walkRef.current.destination = destination
    walkRef.current.direction = null
    walkRef.current.position = useGameStore.getState().game?.mapPosition ?? mapPosition
    walkRef.current.lastTime = 0
    walkRef.current.lastPublishedAt = 0
    walkRef.current.conversationId = conversationId
    setWalking(true)
    walkRef.current.frame = requestAnimationFrame(animateWalking)
  }

  const walkInDirection = (direction: MovementDirection) => {
    if (movementLocked) return
    cancelAnimationFrame(walkRef.current.frame)
    walkRef.current.destination = null
    walkRef.current.direction = direction
    walkRef.current.position = useGameStore.getState().game?.mapPosition ?? mapPosition
    walkRef.current.lastTime = 0
    walkRef.current.lastPublishedAt = 0
    walkRef.current.conversationId = null
    setFacing(({ up: 0, right: 90, down: 180, left: -90 } as const)[direction])
    setWalking(true)
    walkRef.current.frame = requestAnimationFrame(animateWalking)
  }

  const talkToVisitor = (visitorId: string) => {
    if (movementLocked) return
    const visitor = visitingAstronauts.find((item) => item.id === visitorId)
    if (!visitor) return
    if (isWithinInteractionRange(mapPosition, visitor, MARS_WORLD.interactionRange)) {
      stopWalking()
      setNovaLine(getVisitorDialogue(visitor.id, game.sol))
      return
    }
    const dx = visitor.x - mapPosition.x
    const dy = visitor.y - mapPosition.y
    setFacing(Math.atan2(dy, dx) * 180 / Math.PI + 90)
    walkTo({ x: visitor.x, y: visitor.y }, visitor.id)
  }

  const headToHabitat = () => {
    if (!habitatPlot || constructionInProgress) return
    const dx = habitatPlot.x - mapPosition.x
    const dy = habitatPlot.y - mapPosition.y
    setFacing(Math.atan2(dy, dx) * 180 / Math.PI + 90)
    walkTo({ x: habitatPlot.x, y: habitatPlot.y })
  }

  const collectSupply = (site: SupplySite) => {
    if (movementLocked || game.crewBusy || currentEvent) return
    if (!isWithinInteractionRange(mapPosition, site.position, MARS_WORLD.interactionRange)) {
      const dx = site.position.x - mapPosition.x
      const dy = site.position.y - mapPosition.y
      setFacing(Math.atan2(dy, dx) * 180 / Math.PI + 90)
      walkTo(site.position)
      return
    }
    stopWalking()
    dispatch({ type: 'collectSupply', siteId: site.id })
  }

  const moveOneStep = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (movementLocked) return
    const vector = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const
    const [dx, dy] = vector[direction]
    walkTo({ x: Math.max(0, Math.min(MARS_WORLD.width, mapPosition.x + dx * MARS_WORLD.moveStep)), y: Math.max(0, Math.min(MARS_WORLD.height, mapPosition.y + dy * MARS_WORLD.moveStep)) })
  }

  const holdDirection = (direction: 'up' | 'down' | 'left' | 'right', held: boolean) => {
    if (movementLocked) return
    if (held) walkInDirection(direction)
    else if (walkRef.current.direction === direction) stopWalking()
  }

  const setFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (movementLocked) return
    const target = event.target
    if (target instanceof Element && target.closest('button, a, [data-map-ui], [role="button"]')) return
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const local = point.matrixTransform(matrix.inverse())
    const viewX = local.x
    const viewY = local.y
    const dx = viewX + camera.x - mapPosition.x * MARS_WORLD.zoom
    const dy = viewY + camera.y - mapPosition.y * MARS_WORLD.zoom
    setFacing(Math.atan2(dy, dx) * 180 / Math.PI + 90)
    walkTo({ x: (viewX + camera.x) / MARS_WORLD.zoom, y: (viewY + camera.y) / MARS_WORLD.zoom })
    event.currentTarget.focus()
  }

  const moveWithKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (movementLocked) return
    if (event.target !== event.currentTarget) return
    if ((event.key === 'e' || event.key === 'E') && nearbyVisitor) {
      event.preventDefault()
      talkToVisitor(nearbyVisitor.id)
      return
    }
    if ((event.key === 'e' || event.key === 'E') && nearbySupply) {
      event.preventDefault()
      collectSupply(nearbySupply)
      return
    }
    if ((event.key === 'e' || event.key === 'E') && atHabitat && !constructionInProgress) {
      event.preventDefault()
      onEnterHabitat?.()
      return
    }
    const direction = directions[event.key.toLowerCase() as keyof typeof directions]
    if (!direction) return
    event.preventDefault()
    if (walkRef.current.direction !== direction) walkInDirection(direction)
  }

  const stopFromKeyUp = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const direction = directions[event.key.toLowerCase() as keyof typeof directions]
    if (direction && walkRef.current.direction === direction) stopWalking()
  }

  const select = (plotId: string) => selectPlot(selectedPlotId === plotId ? null : plotId)
  const worldTransform = `translate(${-camera.x} ${-camera.y}) scale(${MARS_WORLD.zoom})`

  return <section aria-label="Mapa de la colonia marciana" className={immersive ? 'absolute inset-0 isolate overflow-hidden bg-[#532d38]' : 'relative isolate overflow-hidden rounded-[1.75rem] border-4 border-[#fff0d4] bg-[#532d38] shadow-[0_20px_60px_#321d2e66]'}>
    <div className={immersive ? 'absolute inset-0 overflow-hidden' : 'relative h-[min(72vh,780px)] min-h-[430px] overflow-hidden sm:min-h-[540px]'}>
      <div role="group" aria-label="Mundo marciano. Camina con WASD o las flechas; haz clic en un lugar para moverte." tabIndex={0} onPointerDown={setFromPointer} onKeyDown={moveWithKeyboard} onKeyUp={stopFromKeyUp} onBlur={stopWalking} className="absolute inset-0 touch-pan-y outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#ffe486]">
        <svg ref={svgRef} viewBox={`0 0 ${MARS_WORLD.viewWidth} ${MARS_WORLD.viewHeight}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Colonia marciana amplia con hábitat, panel solar, caminos, rocas y terreno explorable" className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="soil-base" x2=".9" y2="1"><stop stopColor="#be6547"/><stop offset=".42" stopColor="#a94e3e"/><stop offset="1" stopColor="#78394a"/></linearGradient>
            <linearGradient id="soil-highland" x2=".4" y2="1"><stop stopColor="#d27b55"/><stop offset="1" stopColor="#a54e43"/></linearGradient>
            <linearGradient id="habitat-shell" x2=".15" y2="1"><stop stopColor="#fff2d6"/><stop offset=".55" stopColor="#e2d3c6"/><stop offset="1" stopColor="#9d8994"/></linearGradient>
            <linearGradient id="greenhouse-glass" x2=".1" y2="1"><stop stopColor="#d9f7d9"/><stop offset=".58" stopColor="#86c999"/><stop offset="1" stopColor="#39775f"/></linearGradient>
            <linearGradient id="solar-cell" x2="0" y2="1"><stop stopColor="#548aa7"/><stop offset="1" stopColor="#203c62"/></linearGradient>
            <pattern id="regolith-grain" width="240" height="190" patternUnits="userSpaceOnUse"><circle cx="18" cy="27" r="3" fill="#f4bd8b" opacity=".22"/><circle cx="92" cy="41" r="2" fill="#43293b" opacity=".3"/><circle cx="174" cy="19" r="4" fill="#f1a575" opacity=".18"/><circle cx="218" cy="92" r="2" fill="#392a3c" opacity=".25"/><circle cx="55" cy="141" r="4" fill="#f1b183" opacity=".17"/><circle cx="144" cy="112" r="2" fill="#412b3d" opacity=".26"/><circle cx="202" cy="165" r="3" fill="#f4bd8b" opacity=".2"/><path d="m33 83 17-7m72 70 13-4m45-80 11 4m-131 72 8 4" fill="none" stroke="#4b2e3e" strokeOpacity=".2" strokeWidth="3"/></pattern>
            <pattern id="solar-lines" width="44" height="28" patternUnits="userSpaceOnUse"><rect width="44" height="28" fill="url(#solar-cell)"/><path d="M0 0h44M0 14h44m-22-14v28" stroke="#a5d9ec" strokeOpacity=".76" strokeWidth="2"/></pattern>
            <filter id="building-shadow" x="-.2" y="-.3" width="1.5" height="1.7"><feGaussianBlur stdDeviation="12"/></filter>
          </defs>
          <g transform={worldTransform}>
            <WorldTerrain />
            {game.buildings.map((building) => {
              const plot = marsPlots.find((item) => item.id === building.plotId)
              if (!plot) return null
              const activeWork = constructionSite?.id === building.id
              return <g key={building.id} className={activeWork ? 'construction-building' : undefined}>
                {building.type === 'habitat' ? <Habitat x={plot.x} y={plot.y}/> : building.type === 'solar' ? <SolarArray x={plot.x} y={plot.y}/> : <Greenhouse x={plot.x} y={plot.y}/>}
              </g>
            })}
            <MapLandmarks />
            {marsPlots.map((plot) => <PlotMarker key={plot.id} plot={plot} selected={plot.id === selectedPlotId} occupied={game.buildings.some((building) => building.plotId === plot.id)} onSelect={() => select(plot.id)} />)}
            {supplySites.map((site) => <SupplyMarker key={site.id} site={site} collected={collectedSupplyIds.includes(site.id)} onSelect={() => collectSupply(site)} disabled={game.crewBusy || Boolean(currentEvent)} />)}
            {visitingAstronauts.map((visitor) => <CrewVisitor key={visitor.id} visitor={visitor} disabled={movementLocked} onTalk={() => talkToVisitor(visitor.id)} />)}
            <AlienFlyby scenarioId={game.scenarioId} sol={game.sol} enabled={!game.gameOver} />
            <Astronaut x={mapPosition.x} y={mapPosition.y} moving={walking} task={game.crewTask} facing={facing} />
            <NovaCompanion x={Math.min(MARS_WORLD.width - 115, mapPosition.x + 190)} y={Math.max(100, mapPosition.y - 128)} onRepeat={repeatNovaLine} />
            {constructionPlot && <ConstructionAnimation x={constructionPlot.x} y={constructionPlot.y}/>}
          </g>
        </svg>
      </div>
      {!immersive && <div data-map-ui="true" className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-2xl border-2 border-white/75 bg-[#322947]/95 px-3 py-2 text-white shadow-xl sm:left-5 sm:top-4 sm:px-4"><span aria-hidden="true" className="grid size-8 place-items-center rounded-xl bg-[#f89760] text-lg">🚀</span><span><strong className="block text-xs font-black sm:text-sm">Base Marte</strong><span className="text-[9px] text-[#f5d6ad] sm:text-[10px]">Sol {String(game.sol).padStart(2, '0')} · {game.lifeSupport === 'stable' ? 'Tripulación estable' : game.lifeSupport === 'risk' ? 'Revisa las reservas' : 'Alerta crítica'}</span></span></div>}
      {!immersive && <div data-map-ui="true" className="absolute right-3 top-3 z-20 rounded-2xl border-2 border-white/70 bg-[#fff0d8]/95 px-3 py-2 text-[10px] font-bold text-[#3d3150] shadow-lg sm:right-5 sm:top-4 sm:text-xs"><span className="hidden sm:inline">SUPERFICIE · </span>SECTOR DEL VALLE</div>}
      {selectedPlot && <button type="button" data-map-ui="true" disabled={movementLocked} aria-label={`Caminar hasta ${selectedPlot.label}`} onClick={() => walkTo({ x: selectedPlot.x, y: selectedPlot.y })} className="absolute left-3 top-[4.8rem] z-20 min-h-11 rounded-xl border-2 border-white bg-[#4d4267]/95 px-3 text-[10px] font-black text-white shadow-lg hover:bg-[#66527f] focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60 sm:left-5 sm:top-[5rem] sm:px-4 sm:text-xs">{constructionInProgress ? 'Obra en curso · movimiento bloqueado' : sheltering ? 'Refugio activo · cierra el sol para salir' : isWithinInteractionRange(mapPosition, selectedPlot, MARS_WORLD.interactionRange) ? `Estás en ${selectedPlot.id}` : `Caminar a ${selectedPlot.id}`}</button>}
      {nearbyVisitor && !movementLocked && <button type="button" data-map-ui="true" onClick={() => talkToVisitor(nearbyVisitor.id)} className="absolute bottom-[82px] left-6 z-30 flex min-h-11 items-center gap-2 rounded-xl border-2 border-white bg-[#405b68]/95 px-4 text-xs font-black text-white shadow-lg hover:bg-[#4d7880] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white">💬 Hablar con {nearbyVisitor.name}<kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[9px]">E</kbd></button>}
      {nearbySupply && !movementLocked && <button type="button" data-map-ui="true" disabled={game.crewBusy || Boolean(currentEvent)} onClick={() => collectSupply(nearbySupply)} className="absolute bottom-[136px] left-6 z-30 flex min-h-11 items-center gap-2 rounded-xl border-2 border-white bg-[#456d59]/95 px-4 text-xs font-black text-white shadow-lg hover:bg-[#56866c] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60">📦 Recoger {nearbySupply.name}<kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[9px]">E</kbd></button>}
      <WorldRadar x={mapPosition.x} y={mapPosition.y} />
      {!immersive && <div data-map-ui="true" className="absolute bottom-3 left-3 z-20 rounded-2xl border border-white/60 bg-[#322947]/90 px-3 py-2 text-[10px] font-semibold text-white shadow-lg sm:bottom-4 sm:left-5">{selectedPlot ? `${selectedPlot.label} · ${selectedPlot.description}` : 'Explora el terreno marciano'}</div>}
      {!immersive && <div data-map-ui="true" className="absolute bottom-3 right-3 z-20 hidden rounded-xl border border-white/50 bg-[#322947]/90 px-3 py-2 text-[10px] font-bold text-white shadow-lg sm:block">WASD / flechas · clic para caminar</div>}
      {immersive && <div data-map-ui="true" className="absolute bottom-6 left-6 z-20 rounded-xl border border-white/35 bg-[#322947]/75 px-4 py-2 text-[10px] font-bold text-white/90 shadow-lg backdrop-blur-sm">{constructionInProgress ? 'Construcción: no puedes caminar hasta cerrar este sol' : sheltering ? 'Refugio activo: permanece dentro hasta cerrar el sol' : nearbyVisitor ? 'WASD / flechas · clic para caminar · E para hablar' : nearbySupply ? 'WASD / flechas · clic para caminar · E para recoger' : 'WASD / flechas · clic en el terreno para caminar'}</div>}
      <DirectionPad onMove={moveOneStep} onHold={holdDirection} immersive={immersive} disabled={movementLocked} />
      {solarEvent && solarSecondsRemaining !== null && <>
        <div aria-hidden="true" className="solar-alert-vignette pointer-events-none absolute inset-0 z-10"/>
        <SolarShelterAlert sol={solarEvent.sol} secondsRemaining={solarSecondsRemaining} atShip={atHabitat} canEnter={canEnterHabitat} onGoToShip={headToHabitat} onEnterShip={() => onEnterHabitat?.()}/>
      </>}
      {atHabitat && !constructionInProgress && !solarEvent && <button type="button" data-map-ui="true" onClick={() => onEnterHabitat?.()} disabled={!canEnterHabitat} className="absolute bottom-[96px] left-6 z-30 flex min-h-12 items-center gap-2 rounded-xl border-2 border-white bg-[#426c66]/95 px-4 text-xs font-black text-white shadow-lg hover:bg-[#568c7b] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-55">🚪 Entrar a la nave <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[9px]">E</kbd></button>}
      {atHabitat && solarEvent && !canEnterHabitat && <p role="status" className="absolute bottom-[151px] left-6 z-30 max-w-72 rounded-xl border border-[#ffd491] bg-[#443547]/95 px-3 py-2 text-[10px] font-black text-[#ffe0a8]">Para cerrar el refugio necesitas 6 ⚡ y tener libre a la tripulación.</p>}
    </div>
    {!immersive && <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fff2dc] px-4 py-3 text-xs text-[#4e4053] sm:px-6"><p role="status" aria-live="polite" className="font-bold">{selectedPlot ? `${selectedPlot.label}: ${selectedPlot.kind === 'obstacle' ? 'bloqueada' : game.buildings.some((item) => item.plotId === selectedPlot.id) ? 'ocupada' : 'disponible'}` : 'Camina por el valle y acerca el zoom a cada sector.'}</p><span className="rounded-full bg-[#efd2b7] px-3 py-1 font-extrabold">Mundo explorable · mapa 2D</span></div>}
    <AccessiblePlotList selectedPlotId={selectedPlotId} onSelect={select} immersive={immersive} />
  </section>
}

const supplyIcons = { energy: BatteryCharging, water: Droplets, food: PackageOpen, spareParts: Boxes, seeds: Sprout } as const
const supplyLabels = { energy: 'energía', water: 'agua', food: 'comida', spareParts: 'repuestos', seeds: 'semillas' } as const

function SupplyMarker({ site, collected, onSelect, disabled }: { site: SupplySite; collected: boolean; onSelect: () => void; disabled: boolean }) {
  const Icon = supplyIcons[site.resource]
  const handleKeyDown = (event: ReactKeyboardEvent<SVGGElement>) => {
    if (disabled || collected || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onSelect()
  }
  return <g transform={`translate(${site.position.x} ${site.position.y})`} role={collected ? 'img' : 'button'} tabIndex={collected ? undefined : 0} aria-disabled={!collected && disabled} aria-label={collected ? `${site.name}, recogido` : `${site.name}. ${site.description} ${disabled ? 'La tripulación está ocupada.' : 'Haz clic para acercarte y recogerlo.'}`} onClick={() => { if (!disabled && !collected) onSelect() }} onKeyDown={handleKeyDown} className={`supply-marker outline-none ${collected ? 'supply-collected' : disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:drop-shadow-[0_0_15px_#ffe58b] focus-visible:drop-shadow-[0_0_15px_#fff]'}`}>
    <ellipse cy="31" rx="54" ry="20" fill="#382c3d" opacity=".4"/>
    <circle cy="-3" r="39" fill={collected ? '#73717a' : '#496c5d'} stroke="#fff0d8" strokeWidth="6"/>
    <rect x="-25" y="-28" width="50" height="50" rx="13" fill={collected ? '#999096' : '#dce8d0'} stroke="#374053" strokeWidth="5"/>
    {!collected && <Icon x={-16} y={-19} width={32} height={32} color="#3e5964" strokeWidth={2.8} aria-hidden="true"/>}
    {collected && <path d="M-15-11h30M-15-1h30M-15 9h30" stroke="#e4d8ca" strokeWidth="4" strokeLinecap="round"/>}
    <rect x="-87" y="49" width="174" height="28" rx="14" fill="#342c48" stroke="#fff0d8" strokeWidth="3"/>
    <text y="69" textAnchor="middle" fill="#fff5de" fontSize="17" fontWeight="800">{collected ? 'Vacío' : `${site.name} · +${site.amount} ${supplyLabels[site.resource]}`}</text>
    <title>{collected ? `${site.name}: ya lo recogiste.` : site.description}</title>
  </g>
}

function WorldTerrain() {
  return <g aria-hidden="true">
    <rect width={MARS_WORLD.width} height={MARS_WORLD.height} fill="url(#soil-base)"/>
    <rect width={MARS_WORLD.width} height={MARS_WORLD.height} fill="url(#regolith-grain)"/>
    <path d="M0 520Q610 450 1110 540T2190 498 3320 556 4800 500M0 610Q720 542 1300 632T2380 588 3540 660 4800 588" fill="none" stroke="#f3b27e" strokeOpacity=".15" strokeWidth="8"/>
    <path d="M0 2650Q580 2460 1170 2644T2380 2610 3490 2700 4800 2550" fill="none" stroke="#512f43" strokeOpacity=".17" strokeWidth="16"/>
    <path d="M0 0H4800V430Q4430 570 4060 450T3330 520 2700 420 2020 540 1270 410 650 520 0 350Z" fill="#674157" opacity=".9"/>
    <path d="M0 360Q460 520 850 400T1540 440 2210 350 2940 460 3670 370 4340 500 4800 390V680Q4290 740 3690 650T2920 730 2150 640 1480 740 760 650 0 720Z" fill="url(#soil-highland)"/>
    <path d="M0 790Q520 700 970 790T1840 780 2580 730 3440 830 4140 750 4800 800" fill="none" stroke="#e39365" strokeOpacity=".38" strokeWidth="22"/>
    <path d="M-100 990Q250 830 470 940T880 1020 1230 850 1540 760 1880 900 2240 1020 2580 860 3300 850 4020 1030 4930 740" fill="none" stroke="#efb17f" strokeWidth="170" strokeLinecap="round" opacity=".54"/>
    <path d="M-100 990Q250 830 470 940T880 1020 1230 850 1540 760 1880 900 2240 1020 2580 860 3300 850 4020 1030 4930 740" fill="none" stroke="#936052" strokeWidth="108" strokeLinecap="round"/>
    <path d="M-100 990Q250 830 470 940T880 1020 1230 850 1540 760 1880 900 2240 1020 2580 860 3300 850 4020 1030 4930 740" fill="none" stroke="#e6a176" strokeWidth="5" strokeDasharray="22 38" strokeLinecap="round" opacity=".6"/>
    <path d="M410 1710Q680 1340 950 1260T1450 1250 1800 1460 2310 1390 2800 1120 3460 1360 4020 1540 4780 1410" fill="none" stroke="#e5a177" strokeWidth="112" strokeLinecap="round" opacity=".62"/>
    <path d="M410 1710Q680 1340 950 1260T1450 1250 1800 1460 2310 1390 2800 1120 3460 1360 4020 1540 4780 1410" fill="none" stroke="#89564d" strokeWidth="68" strokeLinecap="round"/>
    <path d="M30 2390Q680 2130 1310 2330T2470 2370 3320 2200 4080 2450 4820 2230" fill="none" stroke="#e7aa7a" strokeWidth="150" strokeLinecap="round" opacity=".58"/>
    <path d="M30 2390Q680 2130 1310 2330T2470 2370 3320 2200 4080 2450 4820 2230" fill="none" stroke="#89564d" strokeWidth="94" strokeLinecap="round"/>
    <path d="M790 2010q310-170 540-90t398 86" fill="none" stroke="#75474a" strokeWidth="10" strokeDasharray="26 40" strokeLinecap="round" opacity=".52"/>
    <path d="M790 2050q310-170 540-90t398 86" fill="none" stroke="#75474a" strokeWidth="10" strokeDasharray="26 40" strokeLinecap="round" opacity=".52"/>
    <path d="M3230 2425q270-210 490-92t330 90" fill="none" stroke="#704548" strokeWidth="8" strokeDasharray="21 36" strokeLinecap="round" opacity=".45"/>
    <g transform="translate(1850 365)" className="dust-devil" opacity=".28"><path d="M0 0q105 65 30 130t-48 170q54 62 126-4-68 83-165 25 51-84 40-146T0 0Z" fill="#f1ad7b"/><path d="M-44 75q78 38 60 92m62-42q-82 63-83 128" fill="none" stroke="#ffe0ae" strokeWidth="9" strokeDasharray="18 14" strokeLinecap="round"/></g>
    <g transform="translate(4280 1450) scale(.8)" className="dust-devil" opacity=".24"><path d="M0 0q105 65 30 130t-48 170q54 62 126-4-68 83-165 25 51-84 40-146T0 0Z" fill="#e99d73"/><path d="M-44 75q78 38 60 92m62-42q-82 63-83 128" fill="none" stroke="#ffe0ae" strokeWidth="9" strokeDasharray="18 14" strokeLinecap="round"/></g>
    <Crater x={2650} y={430} size={260}/><Crater x={220} y={1270} size={180}/><Crater x={2930} y={1600} size={210}/><Crater x={1650} y={370} size={145}/><Crater x={4200} y={780} size={340}/><Crater x={4050} y={2520} size={250}/><Crater x={680} y={2730} size={240}/>
    <RockField x={270} y={650}/><RockField x={2050} y={570}/><RockField x={1280} y={1510}/><RockField x={3030} y={1020}/><RockField x={3720} y={1990}/><RockField x={820} y={2160}/><RockField x={4510} y={1320}/>
    <Dune x={2370} y={1160} size={280}/><Dune x={1000} y={340} size={230}/><Dune x={3480} y={850} size={340}/><Dune x={2200} y={2700} size={310}/><Dune x={4550} y={1990} size={280}/>
    <SurfaceStoneScatter />
    <g transform="translate(130 1150)"><path d="m0 130 140-75 105 75-105 76Z" fill="#65414d"/><path d="m34 105 106-58 74 45-108 60Z" fill="#ba6b51" opacity=".7"/><text x="92" y="226" textAnchor="middle" fill="#fff0d8" fontSize="34" fontWeight="700">DUNAS DEL SUR</text></g>
    <g transform="translate(2580 120)"><path d="M0 180 170 0l110 170-120 90Z" fill="#78495a"/><path d="m52 155 118-130 74 133-88 69Z" fill="#d07854"/><text x="135" y="300" textAnchor="middle" fill="#fff0d8" fontSize="32" fontWeight="700">MESAS DEL ESTE</text></g>
    <g transform="translate(3940 1050)"><path d="m0 340 200-210 240 70 100 210-210 190-250-50-130-120Z" fill="#563a50" stroke="#dd946b" strokeWidth="20"/><ellipse cx="200" cy="320" rx="145" ry="93" fill="#9d554f"/><path d="m100 300 104-90 112 94-112 80Z" fill="#dc996e"/><text x="225" y="500" textAnchor="middle" fill="#fff0d8" fontSize="34" fontWeight="800">CRÁTER VESPER</text></g>
    <g transform="translate(740 2260)"><path d="m0 130 220-120 220 120-220 128Z" fill="#493449" stroke="#e0a77d" strokeWidth="13"/><path d="M105 121q18-128 115-130 95 4 114 130v105H105Z" fill="#37455c" stroke="#f4dbb4" strokeWidth="14"/><path d="M145 152V67q75-80 150 0v85" fill="none" stroke="#73b0b0" strokeWidth="11"/><circle cx="220" cy="-11" r="18" fill="#ffe59a"/><text x="220" y="340" textAnchor="middle" fill="#fff0d8" fontSize="32" fontWeight="800">ESTACIÓN POLAR</text></g>
    <g transform="translate(3270 2250)"><path d="m0 190 130-110 150 42 40 110-92 90-172-20-64-78Z" fill="#5f394a" stroke="#dc9269" strokeWidth="12"/><path d="m85 191 82-109 84 143-107 83Z" fill="#cf7453"/><text x="155" y="382" textAnchor="middle" fill="#fff0d8" fontSize="30" fontWeight="800">CAMPAMENTO ANTIGUO</text></g>
    <g transform="translate(640 1790)"><path d="m0 230 190-120 170 100-44 160-214 22-112-80Z" fill="#2f4350" stroke="#e8c18b" strokeWidth="12"/><path d="m84 260 138-122 90 44-139 131Z" fill="#476476"/><path d="M145 210h65v104h-65Z" fill="#ffd776" stroke="#354455" strokeWidth="9"/><text x="186" y="452" textAnchor="middle" fill="#fff0d8" fontSize="30" fontWeight="800">ROVER VARADO</text></g>
    <g transform="translate(3190 200)"><path d="m0 150 140-85 140 85-140 82Z" fill="#4b344b"/><path d="M78 130V-20m0 33 66-65m-66 90 85-8m-85 22 64 38" stroke="#f2ddb2" strokeWidth="14" strokeLinecap="round"/><circle cx="78" cy="-20" r="22" fill="#ffdb7e"/><text x="140" y="290" textAnchor="middle" fill="#fff0d8" fontSize="30" fontWeight="800">OBSERVATORIO</text></g>
  </g>
}

function Crater({ x, y, size }: { x: number; y: number; size: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <ellipse cy={size * .12} rx={size * 1.08} ry={size * .48} fill="#472f42" opacity=".45"/>
    <ellipse cy={-size * .07} rx={size * .94} ry={size * .39} fill="#d47a55" stroke="#8c4c4d" strokeWidth={size * .07}/>
    <ellipse cy={-size * .025} rx={size * .77} ry={size * .31} fill="#914a50" stroke="#efaa75" strokeWidth={size * .045}/>
    <ellipse cy={size * .015} rx={size * .57} ry={size * .22} fill="#663a4c"/>
    <path d={`M${-size * .76} ${-size * .14}q${size * .32} ${size * .22} ${size * .7} ${size * .08}`} fill="none" stroke="#4b3548" strokeWidth={size * .055}/>
    <path d={`M${-size * .7} ${-size * .24}q${size * .3} ${size * .2} ${size * .65} ${size * .12}`} fill="none" stroke="#f3b27c" strokeWidth={size * .045} opacity=".8"/>
    <circle cx={size * .12} cy={-size * .03} r={size * .035} fill="#e99b6c" opacity=".7"/><circle cx={-size * .28} cy={size * .04} r={size * .022} fill="#d48160" opacity=".8"/>
  </g>
}

function RockField({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} fill="#673b45" stroke="#c4785c" strokeWidth="9"><path d="m0 28 58-48 72 15 34 65-44 58-93-10-39-42Z"/><path d="m155 166 28-52 72-6 35 49-19 48-82 14Z"/><path d="m-106 201 39-65 74 14 24 68-52 40-75-12Z"/></g>
}

function SurfaceStoneScatter() {
  return <g aria-hidden="true">{surfaceStones.map((stone) => <g key={stone.id}>
    <ellipse cx={stone.x + 5} cy={stone.y + stone.radiusY * 0.52} rx={stone.radiusX * 1.18} ry={stone.radiusY * 0.74} fill="#402c3f" opacity=".25"/>
    <ellipse cx={stone.x} cy={stone.y} rx={stone.radiusX} ry={stone.radiusY} transform={`rotate(${stone.angle} ${stone.x} ${stone.y})`} fill={stone.shade} stroke="#bd7455" strokeWidth="2.5"/>
    <path d={`M${stone.x - stone.radiusX * 0.58} ${stone.y - stone.radiusY * 0.16}q${stone.radiusX * 0.35} ${-stone.radiusY * 0.62} ${stone.radiusX * 0.92} ${-stone.radiusY * 0.12}`} fill="none" stroke="#e3a173" strokeWidth="2.5" strokeLinecap="round" opacity=".6"/>
  </g>)}</g>
}

function Dune({ x, y, size }: { x: number; y: number; size: number }) {
  return <g transform={`translate(${x} ${y})`}><path d={`M${-size} ${size * .15}q${size * .38} ${-size * .6} ${size * .72} ${-size * .08}t${size * .7} ${size * .03}v${size * .36}h${-size * 1.42}Z`} fill="#d47a54"/><path d={`M${-size * .72} ${size * .08}q${size * .42} ${-size * .38} ${size * .8} ${-.02}`} fill="none" stroke="#f0aa75" strokeWidth="16" opacity=".65"/></g>
}

function Habitat({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}><ellipse cy="125" rx="320" ry="94" fill="#432c3e" opacity=".48" filter="url(#building-shadow)"/><path d="m-230 90 112-86 280 8 118 90-122 86h-280Z" fill="#b4604c" stroke="#f3c18b" strokeWidth="12"/><path d="M-145 64q0-213 145-245Q145-149 145 64Z" fill="url(#habitat-shell)" stroke="#48435a" strokeWidth="22"/><path d="M-112 23q106-134 214-2" fill="none" stroke="#fff4dc" strokeWidth="18" opacity=".6"/><path d="M-54 50v-96q54-65 108 0v96Z" fill="#313958" stroke="#f1d19d" strokeWidth="12"/><path d="M-32 31v-74q32-38 64 0v74Z" fill="#f4a95d"/><path d="M-18-133q18-30 36 0" fill="none" stroke="#52516d" strokeWidth="13"/><circle cy="-134" r="12" fill="#fff3d1"/><path d="m-200 95 26-63 52 3 29 70Zm235 15 27-77 57 1 28 78Z" fill="#dcc9bd" stroke="#4b455e" strokeWidth="14"/><rect x="-24" y="67" width="48" height="20" rx="7" fill="#6ed4e5"/></g>
}

function SolarArray({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}><ellipse cy="58" rx="255" ry="70" fill="#432c3e" opacity=".4"/><path d="M-160 10 0-88 168 9 0 108Z" fill="url(#solar-lines)" stroke="#d8edf0" strokeWidth="22"/><path d="M-165 13 0 110 166 10" fill="none" stroke="#323b56" strokeWidth="22"/><path d="M0 105v124m-114-185-45 135m273-136 46 136" stroke="#4d465d" strokeWidth="22" strokeLinecap="round"/><circle cy="223" r="20" fill="#dab487"/></g>
}

function Greenhouse({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}><ellipse cy="115" rx="290" ry="88" fill="#432c3e" opacity=".42"/><path d="M-216 109V-20q0-206 216-228 216 22 216 228v129Z" fill="url(#greenhouse-glass)" stroke="#37465b" strokeWidth="24"/><path d="M-167 108V-19q0-147 167-169 167 22 167 169v127" fill="none" stroke="#effbe6" strokeWidth="15" opacity=".82"/><path d="M0-184v290M-212 39H212" stroke="#465267" strokeWidth="18"/><path d="M-166 78q34-108 69 0 32-122 65 0 31-137 64 0 36-102 71 0" fill="none" stroke="#338457" strokeWidth="22"/><path d="M-140 60V-18m78 93V-42M15 77V-54m82 112v-75" stroke="#79bf71" strokeWidth="17"/><path d="M-216 109H216" stroke="#34445c" strokeWidth="27"/></g>
}

function MapLandmarks() {
  return <g aria-hidden="true">
    <g transform="translate(1260 640)"><ellipse cy="28" rx="168" ry="55" fill="#553747" opacity=".5"/><path d="m-155 0 155-88 155 88L0 88Z" fill="#d9b17f" stroke="#f3d6aa" strokeWidth="18"/><circle cy="-2" r="51" fill="#65717a"/><circle cy="-2" r="28" fill="#c7a47e"/><text y="143" textAnchor="middle" fill="#fff0d8" fontSize="36" fontWeight="700">PLATAFORMA</text></g>
    <g transform="translate(2040 1490)"><path d="m0 150 150-80 145 80-145 83Z" fill="#443248" stroke="#c0765a" strokeWidth="12"/><path d="M98 135q15-84 52-83t50 83" fill="#b9654e" stroke="#f2c695" strokeWidth="12"/><circle cx="150" cy="58" r="16" fill="#ffe1a4"/><text x="150" y="285" textAnchor="middle" fill="#fff0d8" fontSize="34" fontWeight="700">ANTENA OESTE</text></g>
    <g transform="translate(2860 810)"><path d="m0 84 78-54 96 24 31 91-64 65-109-22-45-52Z" fill="#71404b" stroke="#cd7c5d" strokeWidth="9"/><circle cx="-30" cy="-42" r="25" fill="#edd29c"/><path d="M-30-42v-80m0 36 42-42" stroke="#e5d0a8" strokeWidth="9"/><text x="73" y="257" textAnchor="middle" fill="#fff0d8" fontSize="30" fontWeight="700">BALIZA</text></g>
    <text x="1760" y="560" fill="#fff0d8" opacity=".8" fontSize="42" fontWeight="700" letterSpacing="8">RUTA DE EXPLORACIÓN</text>
    <path d="m1640 575 54-40 54 40-54 40Z" fill="#ffe17c"/><path d="M1694 534v83" stroke="#44374c" strokeWidth="12"/>
  </g>
}

function PlotMarker({ plot, selected, occupied, onSelect }: { plot: (typeof marsPlots)[number]; selected: boolean; occupied: boolean; onSelect: () => void }) {
  const blocked = plot.kind === 'obstacle'
  const label = blocked ? 'Bloqueada' : occupied ? 'Ocupada' : plot.kind === 'landing-zone' ? 'Referencia' : 'Disponible'
  const icon = blocked ? <Mountain size={24}/> : plot.kind === 'landing-zone' ? <RadioTower size={24}/> : occupied ? <span aria-hidden="true" className="text-lg">⌂</span> : <Crosshair size={22}/> 
  return <g transform={`translate(${plot.x} ${plot.y})`} role="button" tabIndex={0} aria-pressed={selected} aria-label={`${plot.label}, ${label}. ${plot.description}`} onClick={(event) => { event.stopPropagation(); onSelect() }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onSelect() } }} className="cursor-pointer outline-none focus-visible:drop-shadow-[0_0_12px_#fff]">
    <ellipse cy="31" rx="78" ry="31" fill="#392b3e" opacity=".52"/>
    <path d="m-58 0 58-35 58 35L0 35Z" fill={selected ? '#ffe47e' : blocked ? '#6b454b' : occupied ? '#dba778' : '#405773'} stroke={selected ? '#fff6cf' : '#f8ead2'} strokeWidth={selected ? 10 : 7}/>
    <circle cy="-5" r="34" fill={selected ? '#ffe47e' : blocked ? '#65454b' : occupied ? '#a56759' : '#473b62'} stroke="#fff3dc" strokeWidth="6"/>
    <g transform="translate(-12 -17)" fill={selected ? '#392b42' : '#fff6df'}>{icon}</g>
    <rect x="-55" y="50" width="110" height="26" rx="12" fill="#342c48" stroke="#fff0d8" strokeWidth="3"/>
    <text y="69" textAnchor="middle" fill="#fff5de" fontSize="20" fontWeight="800">{plot.id} · {label}</text>
  </g>
}

function Astronaut({ x, y, moving, task, facing }: { x: number; y: number; moving: boolean; task?: string; facing: number }) {
  const facingLeft = facing < -45 || facing > 225
  return <g transform={`translate(${x} ${y})`} aria-hidden="true" className="transition-transform duration-75 ease-linear motion-reduce:transition-none">
    <ellipse cy="20" rx="42" ry="17" fill="#382d3e" opacity=".42" className={moving ? 'astronaut-shadow-walk' : undefined}/>
    <g transform={facingLeft ? 'scale(-1 1)' : undefined}>
      <g className={`astronaut-body ${moving ? 'astronaut-walking' : task ? 'astronaut-working' : 'astronaut-idle'}`}>
        <path d="M-25-24q-24-8-32 15l7 38q10 9 29 0m46-53q24-8 32 15l-7 38q-10 9-29 0" fill="#d58a54" stroke="#34384f" strokeWidth="8" strokeLinejoin="round"/>
        <path d="M-29-13v28m58-28v28" stroke="#f7d8aa" strokeWidth="5" strokeLinecap="round" opacity=".8"/>
        <rect x="-16" y="-18" width="32" height="58" rx="11" fill="#596579" stroke="#d7d9d0" strokeWidth="5"/>
        <rect x="-10" y="-7" width="20" height="15" rx="4" fill="#283852" stroke="#80dce0" strokeWidth="3"/><circle cx="0" cy="0" r="3" fill="#b2ffea"/>
        <g className="astronaut-leg astronaut-leg-left"><path d="M-15 20-25 47l12 8 14-20" fill="#3d506b" stroke="#f3e8d7" strokeWidth="7" strokeLinejoin="round"/><path d="m-27 50-3 14 21 5 10-13-10-5" fill="#35394f" stroke="#d9cbb9" strokeWidth="5" strokeLinejoin="round"/></g>
        <g className="astronaut-leg astronaut-leg-right"><path d="M14 20 25 47l-12 8L-1 35" fill="#3d506b" stroke="#f3e8d7" strokeWidth="7" strokeLinejoin="round"/><path d="m27 50 3 14-21 5-10-13 10-5" fill="#35394f" stroke="#d9cbb9" strokeWidth="5" strokeLinejoin="round"/></g>
        <g className="astronaut-arm astronaut-arm-left"><path d="M-21-28q-21-8-35 9l9 27 24-8" fill="#f0e7d8" stroke="#414158" strokeWidth="8" strokeLinejoin="round"/><path d="m-51 3 5 14 20-5-1-16" fill="#b9664e" stroke="#f4e6d2" strokeWidth="5"/></g>
        <g className="astronaut-arm astronaut-arm-right"><path d="M21-28q21-8 35 9L47 8 23 0" fill="#f0e7d8" stroke="#414158" strokeWidth="8" strokeLinejoin="round"/><path d="m51 3-5 14-20-5 1-16" fill="#b9664e" stroke="#f4e6d2" strokeWidth="5"/></g>
        <path d="M-21-24Q0-40 21-24L28 18Q4 34-28 18Z" fill="#f6eee0" stroke="#3b3c52" strokeWidth="8"/>
        <path d="m-15-8 15-7 15 7v21h-30Z" fill="#48546a" stroke="#c7cec5" strokeWidth="4"/><path d="M-10 3h20" stroke="#67dce1" strokeWidth="6" strokeLinecap="round"/>
        <path d="M-19-33q19-17 38 0v9h-38Z" fill="#c6b8a7" stroke="#3d3951" strokeWidth="7"/><path d="M-10-34h20" stroke="#ffe4b5" strokeWidth="3"/>
        <circle cy="-51" r="32" fill="#f0e7d8" stroke="#3b3c52" strokeWidth="8"/>
        <path d="M-25-52a25 25 0 0 1 50 0v11h-50Z" fill="#253550" stroke="#58d8e0" strokeWidth="6"/>
        <path d="m-16-53 8-5m24 5-8-5" stroke="#f1fff3" strokeWidth="4" strokeLinecap="round" opacity=".9"/>
        <path d="M-21-41q12 8 24 0" fill="none" stroke="#567b91" strokeWidth="2" opacity=".55"/>
        <circle cx="-33" cy="-45" r="7" fill="#ffd776" stroke="#4a4355" strokeWidth="3"/><circle cx="33" cy="-45" r="7" fill="#ffd776" stroke="#4a4355" strokeWidth="3"/>
        <path d="M-31-3h-7m69 0h7" stroke="#f4cb91" strokeWidth="4" strokeLinecap="round"/>
        <path d="M-3 13q3 8 6 0" fill="none" stroke="#394257" strokeWidth="3"/>
      </g>
    </g>
    {task ? <g className="astronaut-task-tag"><rect x="-86" y="-119" width="172" height="31" rx="15" fill="#342d48" stroke="#fff0d2" strokeWidth="3"/><text y="-98" textAnchor="middle" fill="#fff6df" fontSize="17" fontWeight="900">{task === 'build' ? 'CONSTRUYENDO' : task === 'sow' ? 'SEMBRANDO' : task === 'harvest' ? 'COSECHANDO' : task === 'collect' ? 'RECUPERANDO' : 'A RESGUARDO'}</text></g> : null}
  </g>
}

function CrewVisitor({ visitor, onTalk, disabled }: { visitor: (typeof visitingAstronauts)[number]; onTalk: () => void; disabled: boolean }) {
  const handleKeyDown = (event: ReactKeyboardEvent<SVGGElement>) => {
    if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onTalk()
  }
  return <g transform={`translate(${visitor.x} ${visitor.y})`} role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} aria-label={`${visitor.name}, ${visitor.role}. ${disabled ? 'Espera a que termine la construcción.' : 'Toca para acercarte y conversar.'}`} onClick={() => { if (!disabled) onTalk() }} onKeyDown={handleKeyDown} className={`crew-visitor outline-none ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer transition-[filter] duration-150 hover:drop-shadow-[0_0_16px_#ffe48a] focus-visible:drop-shadow-[0_0_16px_#fff]'}`}>
    <ellipse cy="17" rx="36" ry="15" fill="#392b3e" opacity=".42"/>
    <g className="crew-visitor-bob">
      <rect x="-28" y="-29" width="17" height="39" rx="7" fill="#46516a" stroke="#efe4d1" strokeWidth="4"/>
      <path d="M-17-17q-22-3-30 14l8 21 22-5m34-30q22-3 30 14L39 18l-22-5" fill={visitor.suit} stroke="#3c3a51" strokeWidth="7" strokeLinejoin="round"/>
      <path d="M-12 15-21 43l11 6 13-22m9-12 10 28-12 6-13-22" fill="#3c4b66" stroke="#eee4d5" strokeWidth="6" strokeLinejoin="round"/>
      <path d="m-23 43-5 11 19 5 8-10m15-6 5 11-19 5-8-10" fill="#30384c" stroke="#d7c9b8" strokeWidth="4" strokeLinejoin="round"/>
      <path d="M-19-17Q0-32 19-17L25 15Q4 29-25 15Z" fill="#f2e9db" stroke="#403d52" strokeWidth="7"/>
      <rect x="-11" y="-5" width="22" height="17" rx="5" fill={visitor.suit} stroke="#48516a" strokeWidth="4"/><path d="M-7 3h14" stroke={visitor.visor} strokeWidth="4" strokeLinecap="round"/>
      <circle cy="-43" r="28" fill="#eee4d5" stroke="#403d52" strokeWidth="7"/>
      <path d="M-21-43a21 21 0 0 1 42 0v9h-42Z" fill="#25354c" stroke={visitor.visor} strokeWidth="5"/>
      <path d="m-12-45 6-4m18 4-6-4" stroke="#f4fff2" strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="-29" cy="-39" r="6" fill="#ffdc78" stroke="#494052" strokeWidth="3"/><circle cx="29" cy="-39" r="6" fill="#ffdc78" stroke="#494052" strokeWidth="3"/>
      <path d="M-33-58q7-19 33-19t33 19" fill="none" stroke={visitor.suit} strokeWidth="6" strokeLinecap="round"/>
      <path d="M25-33q8 3 11 11" fill="none" stroke="#f4b361" strokeWidth="3" strokeLinecap="round"/>
      <path d="M48-76h27q10 0 10 10v14H61l-8 9v-9h-5Z" fill="#fff6e5" stroke="#48425a" strokeWidth="4"/>
      <circle cx="58" cy="-69" r="2.5" fill="#4aaeb6"/><circle cx="67" cy="-69" r="2.5" fill="#4aaeb6"/><circle cx="76" cy="-69" r="2.5" fill="#4aaeb6"/>
    </g>
    <rect x="-53" y="70" width="106" height="26" rx="13" fill="#364153" stroke="#fff0d7" strokeWidth="3"/>
    <text y="89" textAnchor="middle" fill="#fff6e2" fontSize="18" fontWeight="850">{visitor.name}</text>
    <title>{disabled ? 'Movimiento bloqueado durante la construcción' : 'Haz clic para acercarte y hablar'}</title>
  </g>
}

function AlienFlyby({ scenarioId, sol, enabled }: { scenarioId: ScenarioId; sol: number; enabled: boolean }) {
  const [sighting, setSighting] = useState<{ key: string; flight: ReturnType<typeof createAlienFlightPath> } | null>(null)
  const key = `${scenarioId}:${sol}`
  useEffect(() => {
    if (!enabled) return
    const schedule = createAlienFlybySchedule(scenarioId, sol)
    if (!schedule) return
    let removeTimer: number | undefined
    const appearanceTimer = window.setTimeout(() => {
      const currentGame = useGameStore.getState().game
      if (!currentGame || currentGame.gameOver || currentGame.sol !== sol) return
      setSighting({ key, flight: createAlienFlightPath(currentGame.mapPosition, schedule.seed) })
      useGameStore.getState().setNovaLine('¡Comandante, mira arriba! ¡Una nave extraña cruza el valle y se marcha a toda velocidad!')
      removeTimer = window.setTimeout(() => setSighting(null), 5600)
    }, schedule.delayMs)
    return () => {
      window.clearTimeout(appearanceTimer)
      if (removeTimer !== undefined) window.clearTimeout(removeTimer)
    }
  }, [enabled, key, scenarioId, sol])
  const flight = enabled && sighting?.key === key ? sighting.flight : null
  if (!flight) return null
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  return <g transform={`translate(${flight.from.x} ${flight.from.y})`} role="img" aria-label="Una nave extraña cruza el cielo y se aleja rápidamente">
    <title>Una nave extraña cruza el cielo y se aleja rápidamente.</title>
    <g className="alien-sighting">
      <animateTransform attributeName="transform" attributeType="XML" type="translate" from="0 0" to={`${flight.delta.x} ${flight.delta.y}`} dur={reducedMotion ? '0.01s' : '4.8s'} fill="freeze"/>
      <path d="M-210 23q115-54 219 0" fill="none" stroke="#75eff0" strokeWidth="9" strokeLinecap="round" opacity=".24" className="alien-flight-trail"/>
      <ellipse cy="21" rx="86" ry="19" fill="#392c45" opacity=".45"/>
      <ellipse cy="2" rx="80" ry="22" fill="#d8d5dc" stroke="#49425e" strokeWidth="8"/>
      <path d="M-39 0q4-42 39-43 36 1 40 43" fill="#b6e1dc" stroke="#49425e" strokeWidth="7"/>
      <path d="M-29-5q29-16 58 0" fill="none" stroke="#f2fff2" strokeWidth="5" opacity=".9"/>
      <ellipse cy="5" rx="81" ry="13" fill="#747b9a" stroke="#49425e" strokeWidth="6"/>
      <path d="M-58 5h116" stroke="#f5d58c" strokeWidth="7" strokeDasharray="13 17" strokeLinecap="round"/>
      <circle cx="-47" cy="5" r="6" fill="#f7a760"/><circle cx="47" cy="5" r="6" fill="#6be1df"/>
      <path d="M-12-19q12-13 24 0" fill="none" stroke="#90c975" strokeWidth="4" strokeLinecap="round"/>
      <ellipse cy="-21" rx="13" ry="15" fill="#a5d58d" stroke="#43576a" strokeWidth="4"/>
      <path d="m-8-22 3 2m13-2-3 2" stroke="#37425c" strokeWidth="4" strokeLinecap="round"/>
      <path d="M0-35v-7" stroke="#43576a" strokeWidth="3"/><circle cy="-44" r="4" fill="#f5cb67"/>
      <text x="0" y="53" textAnchor="middle" fill="#fff5df" stroke="#3c334c" strokeWidth="5" paintOrder="stroke" fontSize="16" fontWeight="900">¡SE ALEJA!</text>
    </g>
  </g>
}

function NovaCompanion({ x, y, onRepeat }: { x: number; y: number; onRepeat: () => void }) {
  return <g transform={`translate(${x} ${y}) scale(.72)`} role="button" tabIndex={0} aria-label="NOVA. Tócame para repetir mi último mensaje." onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onRepeat() }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onRepeat() } }} className="cursor-pointer outline-none focus-visible:drop-shadow-[0_0_16px_#fff]">
    <title>Tócame para escuchar otra vez</title>
    <g className="nova-float" aria-hidden="true">
      <circle cy="-5" r="66" fill="#65e4e9" opacity=".12"/>
      <path d="M-25-16Q-83-57-76-10q5 30 48 30m53-36Q83-57 76-10q-5 30-48 30" fill="#7de9ec" fillOpacity=".58" stroke="#e4ffff" strokeWidth="5"/>
      <path d="M-31-7q-33-21-30-2m92 2q33-21 30-2" fill="none" stroke="#fff4c6" strokeWidth="4" strokeLinecap="round"/>
      <ellipse cy="43" rx="37" ry="10" fill="#342942" opacity=".35"/>
      <path d="M-18 24q-22-9-30 5m66-5q22-9 30 5" fill="none" stroke="#4e4668" strokeWidth="9" strokeLinecap="round"/>
      <path d="M-18 29q-9 18 0 26h36q9-8 0-26Z" fill="#f5ead7" stroke="#4b4664" strokeWidth="7"/>
      <rect x="-9" y="35" width="18" height="12" rx="4" fill="#f4a257" stroke="#4b4664" strokeWidth="4"/>
      <path d="M-23-14q0-29 23-29t23 29v22h-46Z" fill="#f6edde" stroke="#4b4664" strokeWidth="7"/>
      <rect x="-18" y="-16" width="36" height="22" rx="10" fill="#272c58" stroke="#64dfe5" strokeWidth="4"/>
      <path d="M-10-5q4-6 8 0m8 0q4-6 8 0" fill="none" stroke="#68f5ed" strokeWidth="4" strokeLinecap="round"/>
      <path d="M0-45v-8" stroke="#4b4664" strokeWidth="5" strokeLinecap="round"/><circle cy="-56" r="6" fill="#ffe16c" stroke="#4b4664" strokeWidth="3"/>
      <path d="m-50-49 4 9 10 2-8 6 1 10-7-7-9 4 4-9-5-8 10 2Z" fill="#ffe58b" stroke="#6c5a69" strokeWidth="2"/>
      <circle cx="51" cy="-35" r="5" fill="#fff3b0"/><circle cx="-51" cy="-13" r="4" fill="#fff3b0"/>
    </g>
  </g>
}

function ConstructionAnimation({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} role="img" aria-label="Construcción en curso: termina al avanzar el sol">
    <title>La obra sigue en montaje hasta que se cierre este sol.</title>
    <ellipse cy="32" rx="270" ry="112" fill="#ffd577" opacity=".12" className="construction-glow"/>
    <path d="M-235 62V-92H235V62M-235-22H235M-165-92V62m110-154V62M55-92V62m110-154V62" fill="none" stroke="#ffe09a" strokeWidth="10" strokeDasharray="18 14" opacity=".88" className="construction-frame"/>
    <path d="M-210-112 0-194 212-112" fill="none" stroke="#fff0c6" strokeWidth="12" strokeLinecap="round" className="construction-glow"/>
    <circle cx="-174" cy="-134" r="13" fill="#fff3aa" className="construction-spark"/>
    <circle cx="164" cy="-116" r="10" fill="#62e4e7" className="construction-spark construction-spark-delay"/>
    <path d="M0-190v94m-24-18 24 20 25-20" fill="none" stroke="#433650" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="-176" y="-244" width="352" height="42" rx="20" fill="#3d334e" stroke="#fff0c6" strokeWidth="5"/>
    <text y="-216" textAnchor="middle" fill="#fff5dc" fontSize="25" fontWeight="900" letterSpacing="1">CONSTRUCCIÓN · 1 SOL</text>
  </g>
}

function WorldRadar({ x, y }: { x: number; y: number }) {
  return <div data-map-ui="true" aria-label="Radar de exploración; el punto amarillo muestra tu posición" className="absolute right-3 top-[4.8rem] z-20 hidden overflow-hidden rounded-2xl border-2 border-white/75 bg-[#322947]/90 p-2 shadow-xl sm:block">
    <svg viewBox={`0 0 ${MARS_WORLD.width} ${MARS_WORLD.height}`} role="img" aria-label="Radar de toda la superficie de juego" className="h-20 w-28 rounded-xl sm:h-24 sm:w-36">
      <rect width={MARS_WORLD.width} height={MARS_WORLD.height} rx="80" fill="#a75547"/><path d="M0 1050Q1100 670 2050 980t1750-100" fill="none" stroke="#f1b17b" strokeWidth="180"/><path d="M250 2670Q1350 1950 2250 2490t2300-200" fill="none" stroke="#724351" strokeWidth="130"/><circle cx="2650" cy="430" r="280" fill="#633c4c"/>{visitingAstronauts.map((visitor) => <circle key={visitor.id} cx={visitor.x} cy={visitor.y} r="58" fill="#75d9d4" stroke="#fff1d2" strokeWidth="24"><title>{visitor.name}, astronauta en el valle</title></circle>)}<circle cx={x} cy={y} r="92" fill="#ffe478" stroke="#fff7d5" strokeWidth="35"/>
    </svg>
    <p className="px-1 pt-1 text-center text-[9px] font-black tracking-[.12em] text-white">RADAR · {Math.round(x / MARS_WORLD.width * 100)}% / {Math.round(y / MARS_WORLD.height * 100)}%</p>
  </div>
}

function AccessiblePlotList({ selectedPlotId, onSelect, immersive }: { selectedPlotId: string | null; onSelect: (plotId: string) => void; immersive: boolean }) {
  return <details data-map-ui="true" className={immersive ? 'sr-only' : 'border-t border-[#dec4a7] bg-[#fff3df] px-4 py-2 text-xs text-[#51434f] sm:px-6'}><summary className="min-h-11 cursor-pointer py-3 font-extrabold focus-visible:outline-2 focus-visible:outline-[#493963]">Ver parcelas y estado en texto</summary><ul className="grid gap-2 pb-3 sm:grid-cols-2 lg:grid-cols-4">{marsPlots.map((plot) => <li key={plot.id}><button type="button" aria-pressed={selectedPlotId === plot.id} onClick={() => onSelect(plot.id)} className="min-h-11 w-full rounded-xl border border-[#e0c6a9] bg-white px-3 py-2 text-left hover:bg-[#fff8ed] focus-visible:outline-2 focus-visible:outline-[#493963]"><strong className="block">{plot.label}: {plot.kind === 'obstacle' ? 'Bloqueada' : plot.kind === 'occupied' ? 'Ocupada al inicio' : plot.kind === 'landing-zone' ? 'Zona de referencia' : 'Disponible para construir'}</strong><span>{plot.description}</span></button></li>)}</ul></details>
}

function DirectionPad({ onMove, onHold, immersive, disabled }: { onMove: (direction: 'up' | 'down' | 'left' | 'right') => void; onHold: (direction: 'up' | 'down' | 'left' | 'right', held: boolean) => void; immersive: boolean; disabled: boolean }) {
  return <div data-map-ui="true" role="group" aria-label={disabled ? 'Movimiento bloqueado durante la construcción' : 'Controles del astronauta'} className={immersive ? 'absolute bottom-24 left-6 z-30 grid grid-cols-3 gap-1' : 'absolute bottom-3 right-3 z-30 grid grid-cols-3 gap-1 sm:bottom-5 sm:right-5 sm:hidden'} onPointerDown={(event) => event.stopPropagation()}><span/><DirectionButton disabled={disabled} label="Caminar hacia el norte" icon={<ChevronUp size={20}/>} onClick={() => onMove('up')} onHold={(held) => onHold('up', held)}/><span/><DirectionButton disabled={disabled} label="Caminar hacia el oeste" icon={<ChevronLeft size={20}/>} onClick={() => onMove('left')} onHold={(held) => onHold('left', held)}/><span className={`grid size-11 place-items-center rounded-xl bg-[#f0e3ce] text-xl ${disabled ? 'opacity-60' : ''}`} aria-hidden="true">🧑‍🚀</span><DirectionButton disabled={disabled} label="Caminar hacia el este" icon={<ChevronRight size={20}/>} onClick={() => onMove('right')} onHold={(held) => onHold('right', held)}/><span/><DirectionButton disabled={disabled} label="Caminar hacia el sur" icon={<ChevronDown size={20}/>} onClick={() => onMove('down')} onHold={(held) => onHold('down', held)}/><span/></div>
}

function DirectionButton({ label, icon, onClick, onHold, disabled }: { label: string; icon: ReactNode; onClick: () => void; onHold: (held: boolean) => void; disabled: boolean }) {
  return <button type="button" disabled={disabled} aria-label={label} onClick={(event) => { if (event.detail === 0) onClick() }} onPointerDown={() => onHold(true)} onPointerUp={() => onHold(false)} onPointerCancel={() => onHold(false)} onPointerLeave={() => onHold(false)} className="grid size-11 touch-manipulation place-items-center rounded-xl border-2 border-white bg-[#423452]/95 text-white shadow-lg hover:bg-[#66507a] focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#332f52] disabled:cursor-not-allowed disabled:opacity-45">{icon}</button>
}
