import { memo, useEffect, useRef, useState } from 'react'
import { MARS_WORLD } from '../../data/mars/world'
import { solSecondsFor } from '../../engine/config'
import { useGameStore } from '../../store/useGameStore'
import type { WorldPosition } from '../../engine/types'

// Extra map pieces for the mission upgrade: new buildings, the rover, safe zones,
// the objective guide arrow, speech bubbles and small feedback animations.

export const WaterExtractor = memo(function WaterExtractor({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} aria-hidden="true">
    <ellipse cy="100" rx="230" ry="70" fill="#432c3e" opacity=".42"/>
    <path d="m-190 70 190-90 190 90-190 90Z" fill="#7d5a63" stroke="#e8c39a" strokeWidth="10"/>
    <rect x="-130" y="-130" width="150" height="180" rx="42" fill="#d8edf2" stroke="#3d4a63" strokeWidth="10"/>
    <rect x="-122" y="-40" width="134" height="84" rx="30" fill="#5fb7d8" opacity=".9"/>
    <path d="M-100-70h90" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" opacity=".7"/>
    <path d="M80 70V-180m-45 40h90M55-110h50" stroke="#e8c39a" strokeWidth="14" strokeLinecap="round"/>
    <path d="M80 70v45" stroke="#3d4a63" strokeWidth="20" strokeLinecap="round"/>
    <path d="M160-70q24 34 0 52-24-18 0-52Z" fill="#7fd8ff" stroke="#3d4a63" strokeWidth="5"/>
    <rect x="-150" y="150" width="300" height="42" rx="20" fill="#2f4e63" stroke="#d8edf2" strokeWidth="4"/>
    <text y="180" textAnchor="middle" fill="#e6fbff" fontSize="24" fontWeight="900">💧 WATER EXTRACTOR</text>
  </g>
})

export const RoverGarage = memo(function RoverGarage({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} aria-hidden="true">
    <ellipse cy="110" rx="260" ry="78" fill="#432c3e" opacity=".42"/>
    <path d="M-215 95V-5q0-135 215-155 215 20 215 155v100Z" fill="#e2d6c5" stroke="#4a3f57" strokeWidth="12"/>
    <path d="M-115 95V5q0-62 115-72 115 10 115 72v90Z" fill="#3b3550" stroke="#f0b26a" strokeWidth="9"/>
    <path d="M-115 35h230M-115 65h230" stroke="#f0b26a" strokeWidth="5" opacity=".55"/>
    <path d="M-170-40q170-120 340 0" fill="none" stroke="#fff6e6" strokeWidth="10" opacity=".6"/>
    <rect x="-140" y="150" width="280" height="42" rx="20" fill="#4a3a5c" stroke="#f0b26a" strokeWidth="4"/>
    <text y="180" textAnchor="middle" fill="#fff1dc" fontSize="24" fontWeight="900">🚙 ROVER GARAGE</text>
  </g>
})

export const StormBunker = memo(function StormBunker({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} aria-hidden="true">
    <ellipse cy="100" rx="250" ry="72" fill="#432c3e" opacity=".42"/>
    <path d="M-225 95q20-160 225-170 205 10 225 170Z" fill="#8f817a" stroke="#3f3a4d" strokeWidth="12"/>
    <path d="M-150 60q150-90 300 0" fill="none" stroke="#b9aca4" strokeWidth="10"/>
    <path d="M-62 95V45q62-44 124 0v50Z" fill="#2d2b3e" stroke="#ffd166" strokeWidth="9"/>
    <path d="M0-50 55-28v42q0 44-55 66-55-22-55-66v-42Z" fill="#7ad0c8" stroke="#2d2b3e" strokeWidth="8"/>
    <rect x="-140" y="150" width="280" height="42" rx="20" fill="#2e3f4a" stroke="#7ad0c8" strokeWidth="4"/>
    <text y="180" textAnchor="middle" fill="#e8fffb" fontSize="24" fontWeight="900">🛡️ STORM BUNKER</text>
  </g>
})

export const LavaCave = memo(function LavaCave({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} aria-hidden="true">
    <ellipse cy="85" rx="270" ry="82" fill="#3d2638" opacity=".5"/>
    <path d="M-255 95q30-215 255-235 235 20 255 235Z" fill="#6b3f4a" stroke="#c4785c" strokeWidth="12"/>
    <path d="M-200 30q40-60 90-40m180 10q60-20 100 50" fill="none" stroke="#9c5a50" strokeWidth="12" strokeLinecap="round"/>
    <path d="M-115 95q10-145 115-155 105 10 115 155Z" fill="#1c1426"/>
    <path d="M-85 95q10-95 85-105" stroke="#ff9a5c" strokeWidth="6" opacity=".45" fill="none"/>
    <text y="175" textAnchor="middle" fill="#fff0d8" stroke="#3c2a3e" strokeWidth="6" paintOrder="stroke" fontSize="32" fontWeight="900">LAVA TUBE CAVE</text>
  </g>
})

function RoverBody({ withAstronaut }: { withAstronaut: boolean }) {
  return <>
    <ellipse cy="52" rx="120" ry="28" fill="#382c3d" opacity=".45"/>
    <rect x="-95" y="-30" width="190" height="58" rx="20" fill="#f2e6d6" stroke="#3d3a52" strokeWidth="8"/>
    <rect x="-62" y="-66" width="96" height="40" rx="13" fill="#5fc9d6" stroke="#3d3a52" strokeWidth="7"/>
    {withAstronaut && <><circle cx="-14" cy="-48" r="17" fill="#eee4d5" stroke="#3d3a52" strokeWidth="4"/><path d="M-27-50a13 13 0 0 1 26 0v6h-26Z" fill="#25354c"/></>}
    <path d="M62-30v-50m-13 0h28" stroke="#3d3a52" strokeWidth="7" strokeLinecap="round"/>
    <circle cx="72" cy="-86" r="10" fill="#ffd166" stroke="#3d3a52" strokeWidth="4"/>
    <path d="M-70 -2h140" stroke="#e0a86a" strokeWidth="6" strokeLinecap="round"/>
    {[-64, 0, 64].map((cx) => <circle key={cx} cx={cx} cy="36" r="23" fill="#2f2c3f" stroke="#c9b9a6" strokeWidth="6"/>)}
  </>
}

export const ParkedRover = memo(function ParkedRover({ x, y, near }: { x: number; y: number; near: boolean }) {
  return <g transform={`translate(${x} ${y})`} role="img" aria-label="Mars rover. Press R next to it to drive.">
    <title>Mars rover. Press R next to it to drive.</title>
    {near && <circle r="150" fill="#ffe08a" opacity=".18"/>}
    <RoverBody withAstronaut={false}/>
    <rect x="-80" y="-140" width="160" height="38" rx="18" fill="#342c48" stroke="#fff0d8" strokeWidth="3"/>
    <text y="-114" textAnchor="middle" fill="#fff5de" fontSize="21" fontWeight="900">{near ? 'Press R 🚙' : 'Rover'}</text>
  </g>
})

export function RidingRover({ x, y, facing }: { x: number; y: number; facing: number }) {
  const left = facing < 0 || facing > 180
  return <g transform={`translate(${x} ${y})`} aria-hidden="true" pointerEvents="none">
    <g transform={left ? 'scale(-1 1)' : undefined}><RoverBody withAstronaut/></g>
  </g>
}

export function SafeZoneMarkers({ zones }: { zones: { id: string; name: string; position: WorldPosition; icon: string; cost: number }[] }) {
  return <g aria-hidden="true">
    {zones.map((zone) => {
      const text = `${zone.icon} ${zone.cost ? `−${zone.cost} ⚡` : 'FREE'}`
      return <g key={zone.id} transform={`translate(${zone.position.x} ${zone.position.y - 260})`}>
        <circle cy="250" r="230" fill="none" stroke="#7af0d8" strokeWidth="12" strokeDasharray="30 22" opacity=".85" className="animate-[spin_12s_linear_infinite] [transform-box:fill-box] origin-center motion-reduce:animate-none"/>
        <rect x="-95" y="-30" width="190" height="52" rx="24" fill="#16443f" stroke="#7af0d8" strokeWidth="5"/>
        <text y="6" textAnchor="middle" fill="#e9fffa" fontSize="26" fontWeight="900">{text}</text>
      </g>
    })}
  </g>
}

/** Guide arrow drawn in view coordinates: a bouncing pin over the target, or an arrow on the screen edge. */
export function ObjectiveGuide({ target, label, icon, urgent, camera, from }: { target: WorldPosition; label: string; icon: string; urgent: boolean; camera: WorldPosition; from: WorldPosition }) {
  const { zoom, viewWidth, viewHeight } = MARS_WORLD
  const vx = target.x * zoom - camera.x
  const vy = target.y * zoom - camera.y
  const margin = 95
  const color = urgent ? '#ff6b5e' : '#ffd166'
  const meters = Math.round(Math.hypot(target.x - from.x, target.y - from.y) / 10)
  const caption = `${icon} ${label}${meters > 25 ? ` · ${meters} m` : ''}`
  const pillWidth = Math.max(140, caption.length * 11.5 + 30)
  if (vx > margin && vx < viewWidth - margin && vy > margin && vy < viewHeight - margin) {
    return <g transform={`translate(${vx} ${vy - 95})`} aria-hidden="true">
      <g className="animate-[guide-bob_1s_ease-in-out_infinite] motion-reduce:animate-none">
        <path d="M-26-30h52v26h26L0 34-26-4h-26Z" fill={color} stroke="#2d2440" strokeWidth="6" strokeLinejoin="round" transform="translate(0 -6)"/>
        <rect x={-pillWidth / 2} y="-86" width={pillWidth} height="38" rx="19" fill="#2d2440" stroke={color} strokeWidth="4"/>
        <text y="-60" textAnchor="middle" fill="#fff8e6" fontSize="20" fontWeight="900">{caption}</text>
      </g>
    </g>
  }
  const cx = viewWidth / 2
  const cy = viewHeight / 2
  const dx = vx - cx
  const dy = vy - cy
  const scale = Math.min(Math.abs((viewWidth / 2 - margin) / (dx || 1e-6)), Math.abs((viewHeight / 2 - margin) / (dy || 1e-6)))
  const ex = cx + dx * scale
  const ey = cy + dy * scale
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  return <g aria-hidden="true">
    <g transform={`translate(${ex} ${ey}) rotate(${angle})`}>
      <g className="animate-[guide-push_0.9s_ease-in-out_infinite] motion-reduce:animate-none">
        <circle r="38" fill="#2d2440" stroke={color} strokeWidth="6"/>
        <path d="M-14-18 18 0-14 18Z" fill={color}/>
      </g>
    </g>
    <g transform={`translate(${Math.min(viewWidth - pillWidth / 2 - 8, Math.max(pillWidth / 2 + 8, ex))} ${ey > cy ? ey - 62 : ey + 70})`}>
      <rect x={-pillWidth / 2} y="-22" width={pillWidth} height="38" rx="19" fill="#2d2440" stroke={color} strokeWidth="4"/>
      <text y="4" textAnchor="middle" fill="#fff8e6" fontSize="20" fontWeight="900">{caption}</text>
    </g>
  </g>
}

function FloatingText({ id, text, tone, index }: { id: number; text: string; tone: 'gain' | 'loss'; index: number }) {
  const ref = useRef<SVGTextElement | null>(null)
  const dropFloatingText = useGameStore((state) => state.dropFloatingText)
  useEffect(() => {
    const element = ref.current
    const done = () => dropFloatingText(id)
    if (!element || typeof element.animate !== 'function') {
      const timer = window.setTimeout(done, 1200)
      return () => window.clearTimeout(timer)
    }
    const animation = element.animate([{ transform: 'translate(0px, 0px)', opacity: 1 }, { transform: 'translate(0px, -90px)', opacity: 0 }], { duration: 1400, easing: 'ease-out', fill: 'forwards' })
    animation.onfinish = done
    return () => animation.cancel()
  }, [id, dropFloatingText])
  return <text ref={ref} x={60 + index * 8} y={-150 - index * 34} fill={tone === 'gain' ? '#9dffb0' : '#ffd0c7'} stroke="#2d2440" strokeWidth="7" paintOrder="stroke" fontSize="34" fontWeight="900">{text}</text>
}

/** "+20 💧" and "−1 ⚡" pop-ups next to the astronaut. */
export function FloatingTexts({ x, y }: { x: number; y: number }) {
  const items = useGameStore((state) => state.floatingTexts)
  return <g transform={`translate(${x} ${y})`} aria-hidden="true" pointerEvents="none">
    {items.map((item, index) => <FloatingText key={item.id} {...item} index={index % 3}/>)}
  </g>
}

/** Ring that fills while the astronaut collects a supply. */
export function CollectRing({ x, y, durationMs }: { x: number; y: number; durationMs: number }) {
  const ref = useRef<SVGCircleElement | null>(null)
  const circumference = 2 * Math.PI * 70
  useEffect(() => {
    const ring = ref.current
    if (!ring || typeof ring.animate !== 'function') return
    const animation = ring.animate([{ strokeDashoffset: circumference }, { strokeDashoffset: 0 }], { duration: durationMs, fill: 'forwards' })
    return () => animation.cancel()
  }, [circumference, durationMs])
  return <g transform={`translate(${x} ${y - 4})`} aria-hidden="true">
    <circle r="70" fill="none" stroke="#2d2440" strokeWidth="18" opacity=".5"/>
    <circle ref={ref} r="70" fill="none" stroke="#9dffb0" strokeWidth="14" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference} transform="rotate(-90)"/>
    <text y="-96" textAnchor="middle" fill="#fff8e6" stroke="#2d2440" strokeWidth="6" paintOrder="stroke" fontSize="26" fontWeight="900">Collecting…</text>
  </g>
}

/** Spinning gear and a bar that fills until the sol ends, shown on the build site. */
export function BuildProgress({ x, y }: { x: number; y: number }) {
  const solStartedAt = useGameStore((state) => state.solStartedAt)
  const scenarioId = useGameStore((state) => state.game?.scenarioId ?? 'standard')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const total = solSecondsFor(scenarioId) * 1000
  const progress = solStartedAt === null ? 0 : Math.max(0, Math.min(1, (now - solStartedAt) / total))
  return <g transform={`translate(${x} ${y - 300})`} role="img" aria-label={`Building: ${Math.round(progress * 100)} percent`}>
    <rect x="-170" y="-38" width="340" height="96" rx="26" fill="#2d2440" stroke="#ffd166" strokeWidth="5"/>
    <text x="-118" y="20" textAnchor="middle" fontSize="54" className="animate-[spin_2s_linear_infinite] [transform-box:fill-box] origin-center motion-reduce:animate-none">⚙️</text>
    <text x="35" y="0" textAnchor="middle" fill="#fff5dc" fontSize="26" fontWeight="900">Building…</text>
    <rect x="-60" y="18" width="190" height="20" rx="10" fill="#4b3e5e"/>
    <rect x="-60" y="18" width={Math.max(20, 190 * progress)} height="20" rx="10" fill="#ffd166"/>
  </g>
}

/** Speech bubble above a visiting astronaut's head, separate from NOVA's messages. */
export function VisitorBubble({ x, y, name, text }: { x: number; y: number; name: string; text: string }) {
  return <foreignObject x={x - 210} y={y - 300} width="420" height="200" aria-live="polite">
    <div className="flex h-full items-end justify-center">
      <div className="relative rounded-3xl border-4 border-[#3c3a51] bg-[#fffaf0] px-5 py-3 text-[24px] leading-[30px] text-[#2f2a45] shadow-[0_8px_0_#3c3a5155]">
        <p className="text-[18px] font-black uppercase tracking-[.12em] text-[#c0663f]">{name}</p>
        <p className="font-semibold">{text}</p>
        <span aria-hidden="true" className="absolute -bottom-[22px] left-1/2 size-0 -translate-x-1/2 border-x-[18px] border-t-[22px] border-x-transparent border-t-[#3c3a51]"/>
      </div>
    </div>
  </foreignObject>
}
