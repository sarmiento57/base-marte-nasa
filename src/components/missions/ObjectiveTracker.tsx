import { currentObjective, missionSteps } from '../../engine/objectives'
import type { GameState } from '../../engine/types'

/** One clear goal at a time, with a progress row of the mission chapters. */
export function ObjectiveTracker({ game }: { game: GameState }) {
  const objective = currentObjective(game)
  if (!objective) return null
  const steps = missionSteps(game)
  return <section aria-label="Current mission goal" aria-live="polite" className={`pointer-events-auto absolute left-1/2 top-[132px] z-40 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border-[3px] px-4 py-2.5 shadow-[0_8px_0_#2d244066] sm:top-[128px] sm:w-[min(520px,calc(100vw-380px))] ${objective.urgent ? 'border-[#ff8c7a] bg-[#5b2b3b]/95 text-white' : 'border-white bg-[#fff6e3]/95 text-[#2f2a45]'}`}>
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className={`grid size-12 shrink-0 place-items-center rounded-xl text-3xl ${objective.urgent ? 'animate-pulse bg-[#d25d45] motion-reduce:animate-none' : 'bg-[#ffd98a]'}`}>{objective.icon}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-black uppercase tracking-[.14em] ${objective.urgent ? 'text-[#ffc8b8]' : 'text-[#b4673f]'}`}>{objective.urgent ? 'Urgent!' : `Mission ${objective.step} of ${objective.total}`}</p>
        <h2 className="text-lg font-black leading-6">{objective.title}</h2>
        <p className={`text-sm font-semibold leading-5 ${objective.urgent ? 'text-white/85' : 'text-[#5b5064]'}`}>{objective.hint}</p>
      </div>
    </div>
    <ol aria-label="Mission chapters" className="mt-2 flex gap-1.5">
      {steps.map((step, index) => <li key={step.title} title={step.title} className={`h-2 flex-1 rounded-full ${step.done ? 'bg-[#4caf6a]' : index + 1 === objective.step ? 'bg-[#ffb347]' : objective.urgent ? 'bg-white/25' : 'bg-[#e4d6c2]'}`}><span className="sr-only">{step.title}: {step.done ? 'done' : 'to do'}</span></li>)}
    </ol>
  </section>
}
