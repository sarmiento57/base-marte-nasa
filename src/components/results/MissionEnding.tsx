import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildMissionReport } from '../../engine/buildMissionReport'
import { SCENARIO_PRESETS } from '../../engine/config'
import type { GameState } from '../../engine/types'

const CONFETTI = Array.from({ length: 28 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: (index % 7) * 0.35,
  color: ['#ffd166', '#7af0d8', '#ff8c7a', '#9dffb0', '#c7a6ff'][index % 5],
}))

function lessons(game: GameState): string[] {
  const list = ['Solar panels make much less energy when dust blocks the Sun.']
  list.push(game.shelterUsed ? 'Safe zones protect astronauts from solar radiation.' : 'During a solar storm, astronauts must hide in a safe zone.')
  list.push(game.foodHarvested > 0 ? 'Plants need water, energy and time to become food.' : 'A greenhouse needs water and energy every sol to grow food.')
  if (game.log.some((entry) => entry.action === 'Cold night')) list.push('Mars nights can be colder than −97 °C, so the crew needs more food to keep warm.')
  return list.slice(0, 3)
}

/** Kid-friendly ending: a rocket launch and a printable certificate, or a gentle rescue with a tip. */
export function MissionEnding({ game, onReport, onRetry, onHome }: { game: GameState; onReport: () => void; onRetry: () => void; onHome: () => void }) {
  const report = useMemo(() => buildMissionReport(game), [game])
  const [name, setName] = useState('')
  const won = game.won
  const built = game.buildings.filter((building) => building.id !== 'habitat-1' && building.id !== 'solar-1').length
  const printCertificate = () => {
    document.body.classList.add('printing-certificate')
    window.print()
    window.setTimeout(() => document.body.classList.remove('printing-certificate'), 500)
  }

  return createPortal(<div role="dialog" aria-modal="true" aria-labelledby="ending-title" className="mission-ending fixed inset-0 z-[180] overflow-y-auto bg-[radial-gradient(ellipse_at_50%_10%,#5b3f6e_0%,#2a2140_60%,#1a1530_100%)] p-6 text-white">
    {won && <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden print:hidden">
      {CONFETTI.map((piece, index) => <span key={index} className="absolute -top-6 block h-4 w-2.5 animate-[confetti-fall_3.2s_linear_infinite] rounded-sm motion-reduce:hidden" style={{ left: `${piece.left}%`, animationDelay: `${piece.delay}s`, backgroundColor: piece.color }}/>)}
    </div>}
    <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
      <div aria-hidden="true" className={`text-8xl ${won ? 'animate-[rocket-launch_2.6s_ease-in_infinite]' : 'animate-[guide-bob_1.4s_ease-in-out_infinite]'} motion-reduce:animate-none print:hidden`}>{won ? '🚀' : '🛸'}</div>
      <p className="mt-2 text-sm font-black uppercase tracking-[.2em] text-[#ffd491] print:hidden">{SCENARIO_PRESETS[game.scenarioId].name} · {game.solsCompleted} of {game.maxSols} sols</p>
      <h1 id="ending-title" className="mt-1 text-4xl font-black sm:text-5xl print:hidden">{won ? 'Mission complete!' : 'A rescue ship is on its way!'}</h1>
      <p className="mt-3 max-w-xl text-lg font-semibold leading-7 text-white/85 print:hidden">{won ? 'The crew is safe, the greenhouse grew food and the colony survived on Mars. You are a real Junior Astronaut!' : `${report.consequence} Every astronaut learns from a hard mission.`}</p>

      {won ? <section aria-label="Junior Astronaut certificate" className="certificate mt-6 w-full rounded-[2rem] border-[6px] border-[#ffd166] bg-[#fff8e8] p-6 text-[#2f2a45] shadow-[0_14px_0_#00000044]">
        <p className="text-xs font-black uppercase tracking-[.25em] text-[#b4673f]">NASA Space Apps Challenge 2026 · Mars Base</p>
        <h2 className="mt-2 text-3xl font-black">Junior Astronaut Certificate</h2>
        <label className="mt-4 block text-sm font-bold text-[#6b5e6c] print:hidden" htmlFor="astronaut-name">Write your name</label>
        <input id="astronaut-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={32} placeholder="Commander…" className="mx-auto mt-1 block w-full max-w-sm rounded-2xl border-[3px] border-[#e4c48d] bg-white px-4 py-2 text-center text-2xl font-black text-[#2f2a45] outline-none focus-visible:border-[#b4673f] print:hidden"/>
        <p className="mt-3 hidden text-3xl font-black print:block">{name || 'Commander'}</p>
        <p className="mt-3 text-base font-semibold">kept a colony alive on Mars for {game.solsCompleted} sols.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat icon="🍞" label="Food grown" value={game.foodHarvested}/>
          <Stat icon="🏗️" label="Buildings" value={built}/>
          <Stat icon="📦" label="Supplies" value={game.suppliesCollected ?? 0}/>
          <Stat icon="🛡️" label="Exposure" value={`${game.educationalRisk}/100`}/>
        </div>
        <h3 className="mt-5 text-left text-lg font-black">What you learned</h3>
        <ul className="mt-1 space-y-1 text-left text-base font-semibold">{lessons(game).map((lesson) => <li key={lesson}>✅ {lesson}</li>)}</ul>
      </section> : <section aria-label="Tip for next time" className="mt-6 w-full rounded-[2rem] border-4 border-[#7af0d8] bg-[#173b3e] p-6 text-left">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#7af0d8]">NOVA's tip for next time</p>
        <p className="mt-2 text-xl font-black leading-7">💡 {report.advice}</p>
        <ul className="mt-3 space-y-1 text-base font-semibold text-white/85">{lessons(game).map((lesson) => <li key={lesson}>⭐ {lesson}</li>)}</ul>
      </section>}

      <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
        {won && <button type="button" onClick={printCertificate} className="min-h-14 rounded-2xl border-[3px] border-white bg-[#4caf6a] px-6 text-lg font-black shadow-[0_6px_0_#00000055] hover:bg-[#5cc27b] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white">🖨️ Print certificate</button>}
        <button type="button" onClick={onRetry} className="min-h-14 rounded-2xl border-[3px] border-white bg-[#e67a50] px-6 text-lg font-black shadow-[0_6px_0_#00000055] hover:bg-[#f39462] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white">🔁 Play again</button>
        <button type="button" onClick={onReport} className="min-h-14 rounded-2xl border-[3px] border-white bg-white/15 px-6 text-lg font-black hover:bg-white/25 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white">📋 See mission report</button>
        <button type="button" onClick={onHome} className="min-h-14 rounded-2xl border-[3px] border-white/50 px-6 text-lg font-black text-white/85 hover:bg-white/10 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white">🏕️ Camp</button>
      </div>
    </div>
  </div>, document.body)
}

function Stat({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return <div className="rounded-2xl bg-[#f3e6cf] px-3 py-2"><p aria-hidden="true" className="text-2xl">{icon}</p><p className="text-xl font-black">{value}</p><p className="text-xs font-bold text-[#6b5e6c]">{label}</p></div>
}
