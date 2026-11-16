import { createPortal } from 'react-dom'
import { ExternalLink, ShieldAlert, Timer } from 'lucide-react'
import { useGameStore } from '../../store/useGameStore'

interface SolarShelterAlertProps {
  sol: number
  secondsRemaining: number
  windowSeconds: number
  zoneName: string | null
  canEnter: boolean
  enterLabel: string
  onGoToShelter: () => void
  onEnter: () => void
}

/** Big, bright solar-storm card: countdown, the safe zones and the real NASA data behind the alert. */
export function SolarShelterAlert({ sol, secondsRemaining, windowSeconds, zoneName, canEnter, enterLabel, onGoToShelter, onEnter }: SolarShelterAlertProps) {
  const nasa = useGameStore((state) => state.nasa)
  const storm = nasa.spaceWeather.strongestStorm
  const minutes = String(Math.floor(secondsRemaining / 60)).padStart(2, '0')
  const seconds = String(secondsRemaining % 60).padStart(2, '0')
  const urgent = secondsRemaining <= 10

  return createPortal(<section role="alert" aria-labelledby="solar-shelter-title" className="solar-alert-glow fixed left-1/2 top-[132px] z-[60] w-[min(720px,calc(100vw-40px))] -translate-x-1/2 rounded-[1.6rem] border-4 border-[#ffd08a] bg-[#392d45]/[.97] p-4 text-white shadow-[0_14px_50px_#201b35bb] backdrop-blur-lg">
    <div className="flex items-start gap-4">
      <span aria-hidden="true" className="solar-alert-beacon grid size-16 shrink-0 place-items-center rounded-2xl bg-[#d25d45] text-4xl">☀️</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-[.16em] text-[#ffd491]">Solar storm · Sol {String(sol).padStart(2, '0')}</p>
        <h2 id="solar-shelter-title" className="mt-0.5 text-2xl font-black">Run to a safe zone!</h2>
        <p className="mt-1 text-sm font-semibold leading-5 text-white/85">Follow the arrow. 🏠 Habitat −6 ⚡ · 🛡️ Bunker −3 ⚡ · 🕳️ Lava cave free</p>
      </div>
      <div className={`grid shrink-0 justify-items-center gap-1 rounded-2xl border-2 px-4 py-2 ${urgent ? 'animate-pulse border-[#ff8c7a] bg-[#7a2f3a]' : 'border-[#ffdcaa]/45 bg-black/25'} motion-reduce:animate-none`}>
        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-[#ffe3b2]"><Timer size={13}/> Time</span>
        <output aria-label={`${minutes} minutes and ${seconds} seconds to reach a safe zone`} aria-live="off" className="font-mono text-3xl font-black tabular-nums text-white">{minutes}:{seconds}</output>
      </div>
    </div>
    <progress aria-label="Time to reach a safe zone" max={windowSeconds} value={secondsRemaining} className="mt-3 h-3 w-full overflow-hidden rounded-full accent-[#ffd071]"/>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <a href={storm?.link ?? 'https://ccmc.gsfc.nasa.gov/tools/DONKI/'} target="_blank" rel="noreferrer" className="inline-flex min-h-9 max-w-[380px] items-center gap-1.5 text-xs font-bold leading-4 text-[#d8e8ff] underline decoration-white/35 underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <ShieldAlert size={14} className="shrink-0"/>
        {storm ? `Real NASA data (${nasa.source === 'live' ? 'live' : 'archived'}): a Kp ${storm.maxKp} space-weather storm and ${nasa.spaceWeather.cmeCount} solar eruptions in 30 days. You get ${windowSeconds} s.` : `NASA DONKI space weather. You get ${windowSeconds} s.`}
        <ExternalLink size={12} className="shrink-0"/>
      </a>
      <button type="button" disabled={Boolean(zoneName) && !canEnter} onClick={zoneName ? onEnter : onGoToShelter} className="flex min-h-14 shrink-0 items-center gap-2 rounded-2xl border-[3px] border-white bg-[#e67a50] px-6 text-base font-black text-white shadow-[0_6px_0_#00000055] hover:bg-[#f39462] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:border-white/30 disabled:bg-white/15 disabled:text-white/60">{zoneName ? enterLabel : '🏃 Go to the closest safe zone'}</button>
    </div>
    {zoneName && !canEnter && <p className="mt-2 text-right text-sm font-extrabold text-[#ffd391]">Not enough energy here. Try the lava tube cave: it is free!</p>}
  </section>, document.getElementById('game-screen-root') ?? document.body)
}
