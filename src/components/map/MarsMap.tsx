import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Crosshair, Mountain, RadioTower } from 'lucide-react'
import { marsPlots } from '../../data/mars/plots'
import { isWithinInteractionRange, moveToward } from '../../data/mars/movement'
import { MARS_WORLD } from '../../data/mars/world'
import type { WorldPosition } from '../../engine/types'
import { useGameStore } from '../../store/useGameStore'

const directions = {
  ArrowUp: 'up', w: 'up',
  ArrowDown: 'down', s: 'down',
  ArrowLeft: 'left', a: 'left',
  ArrowRight: 'right', d: 'right',
} as const

export function MarsMap() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const walkRef = useRef<{ frame: number; destination: WorldPosition | null; lastTime: number }>({ frame: 0, destination: null, lastTime: 0 })
  const heldMoveRef = useRef<number | null>(null)
  const [walking, setWalking] = useState(false)
  const [facing, setFacing] = useState(0)
  const game = useGameStore((state) => state.game)
  const selectedPlotId = useGameStore((state) => state.selectedPlotId)
  const selectPlot = useGameStore((state) => state.selectPlot)
  const moveAstronaut = useGameStore((state) => state.moveAstronaut)
  const setAstronautPosition = useGameStore((state) => state.setAstronautPosition)
  useEffect(() => () => {
    cancelAnimationFrame(walkRef.current.frame)
    if (heldMoveRef.current !== null) window.clearInterval(heldMoveRef.current)
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

  if (!game || !mapPosition) return null

  const stopWalking = () => {
    cancelAnimationFrame(walkRef.current.frame)
    walkRef.current.destination = null
    walkRef.current.lastTime = 0
    setWalking(false)
  }

  const animateWalking = (time: number) => {
    const target = walkRef.current.destination
    const current = useGameStore.getState().game?.mapPosition
    if (!target || !current) return
    const elapsed = walkRef.current.lastTime ? Math.min(time - walkRef.current.lastTime, 50) : 0
    walkRef.current.lastTime = time
    const next = moveToward(current, target, MARS_WORLD.walkSpeed * elapsed / 1000)
    setAstronautPosition(next.x, next.y)
    if (next.x === target.x && next.y === target.y) {
      walkRef.current.destination = null
      walkRef.current.lastTime = 0
      setWalking(false)
      return
    }
    walkRef.current.frame = requestAnimationFrame(animateWalking)
  }

  const walkTo = (destination: WorldPosition) => {
    cancelAnimationFrame(walkRef.current.frame)
    walkRef.current.destination = destination
    walkRef.current.lastTime = 0
    setWalking(true)
    walkRef.current.frame = requestAnimationFrame(animateWalking)
  }

  const moveOneStep = (direction: 'up' | 'down' | 'left' | 'right') => {
    stopWalking()
    setFacing(({ up: 0, right: 90, down: 180, left: -90 } as const)[direction])
    moveAstronaut(direction)
  }

  const holdDirection = (direction: 'up' | 'down' | 'left' | 'right', held: boolean) => {
    if (!held) {
      if (heldMoveRef.current !== null) window.clearInterval(heldMoveRef.current)
      heldMoveRef.current = null
      return
    }
    if (heldMoveRef.current !== null) return
    stopWalking()
    const step = () => {
      setFacing(({ up: 0, right: 90, down: 180, left: -90 } as const)[direction])
      moveAstronaut(direction)
    }
    step()
    heldMoveRef.current = window.setInterval(step, 90)
  }

  const setFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
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
    if (event.target !== event.currentTarget) return
    const direction = directions[event.key as keyof typeof directions]
    if (!direction) return
    event.preventDefault()
    stopWalking()
    setFacing(({ up: 0, right: 90, down: 180, left: -90 } as const)[direction])
    moveAstronaut(direction)
  }

  const select = (plotId: string) => selectPlot(selectedPlotId === plotId ? null : plotId)
  const worldTransform = `translate(${-camera.x} ${-camera.y}) scale(${MARS_WORLD.zoom})`

  return <section aria-label="Mapa de la colonia marciana" className="relative isolate overflow-hidden rounded-[1.75rem] border-4 border-[#fff0d4] bg-[#532d38] shadow-[0_20px_60px_#321d2e66]">
    <div className="relative h-[min(72vh,780px)] min-h-[430px] overflow-hidden sm:min-h-[540px]">
      <div role="group" aria-label="Mundo marciano. Camina con WASD o las flechas; toca un lugar para moverte." tabIndex={0} onPointerDown={setFromPointer} onPointerMove={(event) => { if (event.buttons === 1) setFromPointer(event) }} onKeyDown={moveWithKeyboard} className="absolute inset-0 touch-pan-y outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#ffe486]">
        <svg ref={svgRef} viewBox={`0 0 ${MARS_WORLD.viewWidth} ${MARS_WORLD.viewHeight}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Colonia marciana amplia con hábitat, panel solar, caminos, rocas y terreno explorable" className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="soil-base" x2=".9" y2="1"><stop stopColor="#be6547"/><stop offset=".42" stopColor="#a94e3e"/><stop offset="1" stopColor="#78394a"/></linearGradient>
            <linearGradient id="soil-highland" x2=".4" y2="1"><stop stopColor="#d27b55"/><stop offset="1" stopColor="#a54e43"/></linearGradient>
            <linearGradient id="habitat-shell" x2=".15" y2="1"><stop stopColor="#fff2d6"/><stop offset=".55" stopColor="#e2d3c6"/><stop offset="1" stopColor="#9d8994"/></linearGradient>
            <linearGradient id="greenhouse-glass" x2=".1" y2="1"><stop stopColor="#d9f7d9"/><stop offset=".58" stopColor="#86c999"/><stop offset="1" stopColor="#39775f"/></linearGradient>
            <linearGradient id="solar-cell" x2="0" y2="1"><stop stopColor="#548aa7"/><stop offset="1" stopColor="#203c62"/></linearGradient>
            <pattern id="isometric-dust" width="110" height="64" patternUnits="userSpaceOnUse"><path d="M0 32 55 0l55 32-55 32Z" fill="none" stroke="#f5b28a" strokeOpacity=".1" strokeWidth="2"/><path d="M0 32h110M55 0v64" stroke="#401f35" strokeOpacity=".06" strokeWidth="1"/></pattern>
            <pattern id="solar-lines" width="44" height="28" patternUnits="userSpaceOnUse"><rect width="44" height="28" fill="url(#solar-cell)"/><path d="M0 0h44M0 14h44m-22-14v28" stroke="#a5d9ec" strokeOpacity=".76" strokeWidth="2"/></pattern>
            <filter id="building-shadow" x="-.2" y="-.3" width="1.5" height="1.7"><feGaussianBlur stdDeviation="12"/></filter>
          </defs>
          <g transform={worldTransform}>
            <WorldTerrain />
            {game.buildings.map((building) => {
              const plot = marsPlots.find((item) => item.id === building.plotId)
              if (!plot) return null
              if (building.type === 'habitat') return <Habitat key={building.id} x={plot.x} y={plot.y} />
              if (building.type === 'solar') return <SolarArray key={building.id} x={plot.x} y={plot.y} />
              return <Greenhouse key={building.id} x={plot.x} y={plot.y} />
            })}
            <MapLandmarks />
            {marsPlots.map((plot) => <PlotMarker key={plot.id} plot={plot} selected={plot.id === selectedPlotId} occupied={game.buildings.some((building) => building.plotId === plot.id)} onSelect={() => select(plot.id)} />)}
            <Astronaut x={mapPosition.x} y={mapPosition.y} moving={walking || game.crewBusy} task={game.crewTask} facing={facing} />
          </g>
        </svg>
      </div>
      <div data-map-ui="true" className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-2xl border-2 border-white/75 bg-[#322947]/95 px-3 py-2 text-white shadow-xl sm:left-5 sm:top-4 sm:px-4"><span aria-hidden="true" className="grid size-8 place-items-center rounded-xl bg-[#f89760] text-lg">🚀</span><span><strong className="block text-xs font-black sm:text-sm">Base Marte</strong><span className="text-[9px] text-[#f5d6ad] sm:text-[10px]">Sol {String(game.sol).padStart(2, '0')} · {game.lifeSupport === 'stable' ? 'Tripulación estable' : game.lifeSupport === 'risk' ? 'Revisa las reservas' : 'Alerta crítica'}</span></span></div>
      <div data-map-ui="true" className="absolute right-3 top-3 z-20 rounded-2xl border-2 border-white/70 bg-[#fff0d8]/95 px-3 py-2 text-[10px] font-bold text-[#3d3150] shadow-lg sm:right-5 sm:top-4 sm:text-xs"><span className="hidden sm:inline">SUPERFICIE · </span>SECTOR DEL VALLE</div>
      {selectedPlot && <button type="button" data-map-ui="true" aria-label={`Caminar hasta ${selectedPlot.label}`} onClick={() => walkTo({ x: selectedPlot.x, y: selectedPlot.y })} className="absolute left-3 top-[4.8rem] z-20 min-h-11 rounded-xl border-2 border-white bg-[#4d4267]/95 px-3 text-[10px] font-black text-white shadow-lg hover:bg-[#66527f] focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-white sm:left-5 sm:top-[5rem] sm:px-4 sm:text-xs">{isWithinInteractionRange(mapPosition, selectedPlot, MARS_WORLD.interactionRange) ? `Estás en ${selectedPlot.id}` : `Caminar a ${selectedPlot.id}`}</button>}
      <WorldRadar x={mapPosition.x} y={mapPosition.y} />
      <div data-map-ui="true" className="absolute bottom-3 left-3 z-20 rounded-2xl border border-white/60 bg-[#322947]/90 px-3 py-2 text-[10px] font-semibold text-white shadow-lg sm:bottom-4 sm:left-5">{selectedPlot ? `${selectedPlot.label} · ${selectedPlot.description}` : 'Explora el terreno marciano'}</div>
      <div data-map-ui="true" className="absolute bottom-3 right-3 z-20 hidden rounded-xl border border-white/50 bg-[#322947]/90 px-3 py-2 text-[10px] font-bold text-white shadow-lg sm:block">WASD / flechas · clic para caminar</div>
      <DirectionPad onMove={moveOneStep} onHold={holdDirection} />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fff2dc] px-4 py-3 text-xs text-[#4e4053] sm:px-6"><p role="status" aria-live="polite" className="font-bold">{selectedPlot ? `${selectedPlot.label}: ${selectedPlot.kind === 'obstacle' ? 'bloqueada' : game.buildings.some((item) => item.plotId === selectedPlot.id) ? 'ocupada' : 'disponible'}` : 'Camina por el valle y acerca el zoom a cada sector.'}</p><span className="rounded-full bg-[#efd2b7] px-3 py-1 font-extrabold">Mundo explorable · mapa 2D</span></div>
    <AccessiblePlotList selectedPlotId={selectedPlotId} onSelect={select} />
  </section>
}

function WorldTerrain() {
  return <g aria-hidden="true">
    <rect width={MARS_WORLD.width} height={MARS_WORLD.height} fill="url(#soil-base)"/>
    <rect width={MARS_WORLD.width} height={MARS_WORLD.height} fill="url(#isometric-dust)"/>
    <path d="M0 0H4800V430Q4430 570 4060 450T3330 520 2700 420 2020 540 1270 410 650 520 0 350Z" fill="#674157" opacity=".9"/>
    <path d="M0 360Q460 520 850 400T1540 440 2210 350 2940 460 3670 370 4340 500 4800 390V680Q4290 740 3690 650T2920 730 2150 640 1480 740 760 650 0 720Z" fill="url(#soil-highland)"/>
    <path d="M0 790Q520 700 970 790T1840 780 2580 730 3440 830 4140 750 4800 800" fill="none" stroke="#e39365" strokeOpacity=".38" strokeWidth="22"/>
    <path d="M-100 990Q250 830 470 940T880 1020 1230 850 1540 760 1880 900 2240 1020 2580 860 3300 850 4020 1030 4930 740" fill="none" stroke="#efb17f" strokeWidth="170" strokeLinecap="round" opacity=".54"/>
    <path d="M-100 990Q250 830 470 940T880 1020 1230 850 1540 760 1880 900 2240 1020 2580 860 3300 850 4020 1030 4930 740" fill="none" stroke="#936052" strokeWidth="108" strokeLinecap="round"/>
    <path d="M410 1710Q680 1340 950 1260T1450 1250 1800 1460 2310 1390 2800 1120 3460 1360 4020 1540 4780 1410" fill="none" stroke="#e5a177" strokeWidth="112" strokeLinecap="round" opacity=".62"/>
    <path d="M410 1710Q680 1340 950 1260T1450 1250 1800 1460 2310 1390 2800 1120 3460 1360 4020 1540 4780 1410" fill="none" stroke="#89564d" strokeWidth="68" strokeLinecap="round"/>
    <path d="M30 2390Q680 2130 1310 2330T2470 2370 3320 2200 4080 2450 4820 2230" fill="none" stroke="#e7aa7a" strokeWidth="150" strokeLinecap="round" opacity=".58"/>
    <path d="M30 2390Q680 2130 1310 2330T2470 2370 3320 2200 4080 2450 4820 2230" fill="none" stroke="#89564d" strokeWidth="94" strokeLinecap="round"/>
    <Crater x={2650} y={430} size={260}/><Crater x={220} y={1270} size={180}/><Crater x={2930} y={1600} size={210}/><Crater x={1650} y={370} size={145}/><Crater x={4200} y={780} size={340}/><Crater x={4050} y={2520} size={250}/><Crater x={680} y={2730} size={240}/>
    <RockField x={270} y={650}/><RockField x={2050} y={570}/><RockField x={1280} y={1510}/><RockField x={3030} y={1020}/><RockField x={3720} y={1990}/><RockField x={820} y={2160}/><RockField x={4510} y={1320}/>
    <Dune x={2370} y={1160} size={280}/><Dune x={1000} y={340} size={230}/><Dune x={3480} y={850} size={340}/><Dune x={2200} y={2700} size={310}/><Dune x={4550} y={1990} size={280}/>
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
  return <g transform={`translate(${x} ${y})`}><ellipse rx={size} ry={size * .48} fill="#553447" opacity=".55"/><ellipse cy={-size * .09} rx={size * .82} ry={size * .34} fill="#d87954"/><ellipse cy={-size * .015} rx={size * .55} ry={size * .23} fill="#8b4550"/><path d={`M${-size * .78} ${-size * .06}q${size * .35} ${size * .25} ${size * .75} ${size * .05}`} fill="none" stroke="#f0a274" strokeWidth={size * .05}/></g>
}

function RockField({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} fill="#673b45" stroke="#c4785c" strokeWidth="9"><path d="m0 28 58-48 72 15 34 65-44 58-93-10-39-42Z"/><path d="m155 166 28-52 72-6 35 49-19 48-82 14Z"/><path d="m-106 201 39-65 74 14 24 68-52 40-75-12Z"/></g>
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
  return <g transform={`translate(${x} ${y})`} aria-hidden="true" className="transition-transform duration-200 ease-out motion-reduce:transition-none">
    <ellipse cy="16" rx="33" ry="18" fill="#382d3e" opacity=".52"/>
    <g transform={`rotate(${facing})`} className={moving ? 'animate-bounce motion-reduce:animate-none' : ''}>
      <path d="M-17-22q-29-9-39 17l12 31 26-8m35-40q29-9 39 17L44 26l-26-8" fill="#d88950" stroke="#39364d" strokeWidth="8" strokeLinejoin="round"/>
      <path d="M-17-13q-20-3-27 12l9 21 18-6m34-27q20-3 27 12l-9 21-18-6" fill="#35506e" stroke="#f8ead5" strokeWidth="6" strokeLinejoin="round"/>
      <path d="M-12 22-21 49l13 8 12-20m10-15 9 27-13 8-12-20" fill="#35445d" stroke="#efe5d7" strokeWidth="7" strokeLinejoin="round"/>
      <path d="m-21 48-6 15 21 5 7-10m15-10 6 15-21 5-7-10" fill="#30374d" stroke="#d5c4b1" strokeWidth="5" strokeLinejoin="round"/>
      <path d="M-21-20Q0-37 21-20L28 23Q5 39-28 23Z" fill="#f2e8d8" stroke="#3c3a51" strokeWidth="8"/>
      <path d="m-12-6 12-6 12 6v19h-24Z" fill="#46516a" stroke="#bdc9c5" strokeWidth="5"/><path d="M-10 1h20" stroke="#64dce4" strokeWidth="6" strokeLinecap="round"/>
      <path d="M-18-31q18-17 36 0v9h-36Z" fill="#b4a898" stroke="#3d3951" strokeWidth="7"/>
      <circle cy="-48" r="32" fill="#eadfcd" stroke="#3c3a51" strokeWidth="8"/>
      <path d="M-25-49a25 25 0 0 1 50 0v10h-50Z" fill="#26344f" stroke="#58d8e0" strokeWidth="6"/>
      <path d="m-12-51 5-4m19 4-5-4" stroke="#e8f9ef" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="-33" cy="-42" r="7" fill="#ffd776"/><circle cx="33" cy="-42" r="7" fill="#ffd776"/>
    </g>
    {task ? <text y="-91" textAnchor="middle" fill="#fff6df" stroke="#3a3045" strokeWidth="7" paintOrder="stroke" fontSize="23" fontWeight="900">{task === 'build' ? 'TRABAJANDO' : task === 'sow' ? 'SEMBRANDO' : task === 'harvest' ? 'COSECHANDO' : 'A RESGUARDO'}</text> : null}
  </g>
}

function WorldRadar({ x, y }: { x: number; y: number }) {
  return <div data-map-ui="true" aria-label="Radar de exploración; el punto amarillo muestra tu posición" className="absolute right-3 top-[4.8rem] z-20 hidden overflow-hidden rounded-2xl border-2 border-white/75 bg-[#322947]/90 p-2 shadow-xl sm:block">
    <svg viewBox={`0 0 ${MARS_WORLD.width} ${MARS_WORLD.height}`} role="img" aria-label="Radar de toda la superficie de juego" className="h-20 w-28 rounded-xl sm:h-24 sm:w-36">
      <rect width={MARS_WORLD.width} height={MARS_WORLD.height} rx="80" fill="#a75547"/><path d="M0 1050Q1100 670 2050 980t1750-100" fill="none" stroke="#f1b17b" strokeWidth="180"/><path d="M250 2670Q1350 1950 2250 2490t2300-200" fill="none" stroke="#724351" strokeWidth="130"/><circle cx="2650" cy="430" r="280" fill="#633c4c"/><circle cx={x} cy={y} r="92" fill="#ffe478" stroke="#fff7d5" strokeWidth="35"/>
    </svg>
    <p className="px-1 pt-1 text-center text-[9px] font-black tracking-[.12em] text-white">RADAR · {Math.round(x / MARS_WORLD.width * 100)}% / {Math.round(y / MARS_WORLD.height * 100)}%</p>
  </div>
}

function AccessiblePlotList({ selectedPlotId, onSelect }: { selectedPlotId: string | null; onSelect: (plotId: string) => void }) {
  return <details data-map-ui="true" className="border-t border-[#dec4a7] bg-[#fff3df] px-4 py-2 text-xs text-[#51434f] sm:px-6"><summary className="min-h-11 cursor-pointer py-3 font-extrabold focus-visible:outline-2 focus-visible:outline-[#493963]">Ver parcelas y estado en texto</summary><ul className="grid gap-2 pb-3 sm:grid-cols-2 lg:grid-cols-4">{marsPlots.map((plot) => <li key={plot.id}><button type="button" aria-pressed={selectedPlotId === plot.id} onClick={() => onSelect(plot.id)} className="min-h-11 w-full rounded-xl border border-[#e0c6a9] bg-white px-3 py-2 text-left hover:bg-[#fff8ed] focus-visible:outline-2 focus-visible:outline-[#493963]"><strong className="block">{plot.label}: {plot.kind === 'obstacle' ? 'Bloqueada' : plot.kind === 'occupied' ? 'Ocupada al inicio' : plot.kind === 'landing-zone' ? 'Zona de referencia' : 'Disponible para construir'}</strong><span>{plot.description}</span></button></li>)}</ul></details>
}

function DirectionPad({ onMove, onHold }: { onMove: (direction: 'up' | 'down' | 'left' | 'right') => void; onHold: (direction: 'up' | 'down' | 'left' | 'right', held: boolean) => void }) {
  return <div data-map-ui="true" role="group" aria-label="Controles del astronauta" className="absolute bottom-3 right-3 z-30 grid grid-cols-3 gap-1 sm:bottom-5 sm:right-5 sm:hidden" onPointerDown={(event) => event.stopPropagation()}><span/><DirectionButton label="Caminar hacia el norte" icon={<ChevronUp size={20}/>} onClick={() => onMove('up')} onHold={(held) => onHold('up', held)}/><span/><DirectionButton label="Caminar hacia el oeste" icon={<ChevronLeft size={20}/>} onClick={() => onMove('left')} onHold={(held) => onHold('left', held)}/><span className="grid size-11 place-items-center rounded-xl bg-[#f0e3ce] text-xl" aria-hidden="true">🧑‍🚀</span><DirectionButton label="Caminar hacia el este" icon={<ChevronRight size={20}/>} onClick={() => onMove('right')} onHold={(held) => onHold('right', held)}/><span/><DirectionButton label="Caminar hacia el sur" icon={<ChevronDown size={20}/>} onClick={() => onMove('down')} onHold={(held) => onHold('down', held)}/><span/></div>
}

function DirectionButton({ label, icon, onClick, onHold }: { label: string; icon: ReactNode; onClick: () => void; onHold: (held: boolean) => void }) {
  return <button type="button" aria-label={label} onClick={(event) => { if (event.detail === 0) onClick() }} onPointerDown={() => onHold(true)} onPointerUp={() => onHold(false)} onPointerCancel={() => onHold(false)} onPointerLeave={() => onHold(false)} className="grid size-11 touch-manipulation place-items-center rounded-xl border-2 border-white bg-[#423452]/95 text-white shadow-lg hover:bg-[#66507a] focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#332f52]">{icon}</button>
}
