import type { GameState } from '../../engine/types'

/** The dust-storm decision as a big card with two picture choices. */
export function DustStormCard({ game, onChoose }: { game: GameState; onChoose: (choice: 'saving' | 'normal') => void }) {
  const sols = `${game.eventSols.dust} and ${game.eventSols.dust + 1}`
  return <div role="dialog" aria-modal="true" aria-labelledby="dust-title" className="fixed inset-0 z-[90] grid place-items-center bg-[#2a1d2e]/60 p-6 backdrop-blur-[2px]">
    <section className="w-full max-w-2xl rounded-[2rem] border-4 border-[#f2b27a] bg-[#fff4e3] p-6 text-[#2f2a45] shadow-[0_14px_0_#00000033]">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="grid size-20 shrink-0 animate-[spin_6s_linear_infinite] place-items-center rounded-3xl bg-[#d9875b] text-5xl motion-reduce:animate-none">🌪️</span>
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#b4673f]">Storm alert · sols {sols}</p>
          <h2 id="dust-title" className="text-3xl font-black">A dust storm is coming!</h2>
          <p className="mt-1 text-base font-semibold leading-6 text-[#5b5064]">Dust blocks the sunlight, so the solar panels make much less energy for 2 sols. How should the greenhouse work?</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <button type="button" onClick={() => onChoose('saving')} className="rounded-3xl border-4 border-[#4d8a5c] bg-[#e7f5e6] p-4 text-left shadow-[0_6px_0_#4d8a5c] transition-transform hover:-translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#2f2a45]">
          <span aria-hidden="true" className="text-4xl">🐢</span>
          <h3 className="mt-1 text-xl font-black">Save energy</h3>
          <p className="mt-1 text-sm font-semibold leading-5">The plants grow slower, but you keep more ⚡ and 💧.</p>
          <p className="mt-2 rounded-xl bg-white/80 px-3 py-1.5 text-xs font-black text-[#3d6a47]">Safer when energy is low</p>
        </button>
        <button type="button" onClick={() => onChoose('normal')} className="rounded-3xl border-4 border-[#c9703f] bg-[#fdeadb] p-4 text-left shadow-[0_6px_0_#c9703f] transition-transform hover:-translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#2f2a45]">
          <span aria-hidden="true" className="text-4xl">🚀</span>
          <h3 className="mt-1 text-xl font-black">Keep growing fast</h3>
          <p className="mt-1 text-sm font-semibold leading-5">The plants keep their speed, but use more ⚡ and 💧.</p>
          <p className="mt-2 rounded-xl bg-white/80 px-3 py-1.5 text-xs font-black text-[#9a4f2a]">Risky if energy is low</p>
        </button>
      </div>
      <p className="mt-4 text-center text-sm font-bold text-[#6b5e6c]">You have ⚡ {game.resources.energy} energy and 💧 {game.resources.water} water right now.</p>
    </section>
  </div>
}
