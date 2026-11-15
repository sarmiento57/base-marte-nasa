import { createPortal } from 'react-dom'
import { ExternalLink, ShieldAlert, Timer } from 'lucide-react'
import { GAME_CONFIG } from '../../engine/config'

interface SolarShelterAlertProps {
  sol: number
  secondsRemaining: number
  atShip: boolean
  canEnter: boolean
  onGoToShip: () => void
  onEnterShip: () => void
}

export function SolarShelterAlert({ sol, secondsRemaining, atShip, canEnter, onGoToShip, onEnterShip }: SolarShelterAlertProps) {
  const minutes = String(Math.floor(secondsRemaining / 60)).padStart(2, '0')
  const seconds = String(secondsRemaining % 60).padStart(2, '0')

  return createPortal(<section role="alert" aria-labelledby="solar-shelter-title" className="solar-alert-glow fixed left-1/2 top-[92px] z-[60] w-[min(660px,calc(100vw-40px))] -translate-x-1/2 rounded-[1.4rem] border-2 border-[#ffd08a] bg-[#392d45]/[.97] p-3 text-white shadow-[0_14px_50px_#201b35bb] backdrop-blur-lg sm:p-4">
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="solar-alert-beacon grid size-11 shrink-0 place-items-center rounded-xl bg-[#d25d45] text-[#fff0b4]"><ShieldAlert size={22}/></span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#ffd491]">Mission alert · Sol {String(sol).padStart(2, '0')}</p>
        <h2 id="solar-shelter-title" className="mt-0.5 text-base font-black sm:text-lg">Strong solar activity! Take shelter in the ship</h2>
        <p className="mt-1 text-[10px] font-semibold leading-4 text-white/75">NOVA recommends entering the ship before the countdown ends.</p>
      </div>
      <div className="grid shrink-0 justify-items-end gap-1 rounded-xl border border-[#ffdcaa]/35 bg-black/20 px-2.5 py-1.5">
        <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wide text-[#ffe3b2]"><Timer size={12}/> Time</span>
        <output aria-label={`${minutes} minutes and ${seconds} seconds to reach the shelter`} aria-live="off" className="font-mono text-lg font-black tabular-nums text-white">{minutes}:{seconds}</output>
      </div>
    </div>
    <progress aria-label="Time to reach the ship" max={GAME_CONFIG.solarShelterWindowSeconds} value={secondsRemaining} className="mt-3 h-2 w-full overflow-hidden rounded-full accent-[#ffd071]"/>
    <div className="mt-2 flex items-center justify-between gap-3">
      <a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1.5 text-[9px] font-bold text-[#d8e8ff] underline decoration-white/35 underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">DONKI · historical X1.2 flare · Jan 3, 2025 <ExternalLink size={11}/></a>
      <button type="button" disabled={atShip && !canEnter} onClick={atShip ? onEnterShip : onGoToShip} className="flex min-h-10 shrink-0 items-center gap-2 rounded-xl border-2 border-white/70 bg-[#e67a50] px-4 text-[11px] font-black text-white shadow-lg hover:bg-[#f39462] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/15 disabled:text-white/60">{atShip ? 'Enter the ship' : 'Go to the ship'} <span aria-hidden="true">→</span></button>
    </div>
    {atShip && !canEnter && <p className="mt-2 text-right text-[10px] font-extrabold text-[#ffd391]">You need 6 ⚡ and a free crew to close the hatch.</p>}
  </section>, document.getElementById('game-screen-root') ?? document.body)
}
