import { useEffect, useState } from 'react'
import { EMERGENCY_SECONDS } from '../../engine/config'
import type { GameState, LifeResource } from '../../engine/types'

const LABEL: Record<LifeResource, string> = { energy: '⚡ Energy', water: '💧 Water', food: '🍞 Food' }

/** Countdown shown when energy, water or food reaches zero. The mission ends if it is not refilled in time. */
export function EmergencyAlert({ game, startedAt, onExpire, lower = false }: { game: GameState; startedAt: number; onExpire: () => void; lower?: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])
  const remaining = Math.max(0, Math.ceil((startedAt + EMERGENCY_SECONDS * 1000 - now) / 1000))
  useEffect(() => {
    if (remaining === 0) onExpire()
  }, [remaining, onExpire])
  const empty = game.emergency ?? []
  return <section role="alert" aria-labelledby="emergency-title" className={`pointer-events-auto fixed left-1/2 ${lower ? 'top-[360px]' : 'top-[132px]'} z-[65] w-[min(560px,calc(100vw-40px))] -translate-x-1/2 rounded-[1.6rem] border-4 border-[#ff8c7a] bg-[#6b1f2c]/95 p-4 text-white shadow-[0_0_0_6px_#ff8c7a55,0_14px_50px_#00000088]`}>
    <div className="flex items-center gap-4">
      <span aria-hidden="true" className="animate-bounce text-5xl motion-reduce:animate-none">🚨</span>
      <div className="min-w-0 flex-1">
        <h2 id="emergency-title" className="text-2xl font-black">{empty.map((resource) => LABEL[resource]).join(' + ')} ran out!</h2>
        <p className="text-sm font-semibold leading-5 text-white/90">Follow the arrow to a supply and refill it. If not, the mission ends when the timer reaches 0.</p>
      </div>
      <output aria-label={`${remaining} seconds left`} className="grid size-20 shrink-0 place-items-center rounded-full border-4 border-white bg-[#d25d45] font-mono text-3xl font-black tabular-nums">{remaining}</output>
    </div>
    <progress aria-label="Time left to refill life support" max={EMERGENCY_SECONDS} value={remaining} className="mt-3 h-3 w-full overflow-hidden rounded-full accent-[#ffd071]"/>
  </section>
}
