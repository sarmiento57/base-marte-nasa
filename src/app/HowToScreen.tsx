import { ArrowLeft, ArrowRight, Cloud, Leaf, MousePointer2, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'

const steps = [
  { title: 'Walk the surface', text: 'Use WASD, the arrow keys, the direction pad or click the ground to move. The radar shows where you are.', icon: MousePointer2 },
  { title: 'Set up your colony', text: 'Pick a free plot, check the cost and confirm the build. One task keeps the crew busy for that sol.', icon: Zap },
  { title: 'Grow food', text: 'Build the greenhouse, plant, and switch between normal, saving and off modes. Crop health matters.', icon: Leaf },
  { title: 'Decide during alerts', text: 'A dust storm lowers solar power. During a solar alert you can spend energy to shelter the crew.', icon: Cloud },
  { title: 'Check before you act', text: 'Every action shows its cost and what may happen before you confirm it. NOVA explains the consequences.', icon: Sparkles },
]

export function HowToScreen() {
  const setScreen = useGameStore((state) => state.setScreen)
  const game = useGameStore((state) => state.game)
  return <div className="mx-auto max-w-4xl space-y-5 p-3 pb-10 sm:p-6">
    <section className="overflow-hidden rounded-[1.8rem] border-4 border-white bg-[#4a3550] p-5 text-white shadow-[0_14px_38px_#47334935] sm:p-8"><p className="inline-flex items-center gap-2 rounded-full bg-[#f0a45f] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#43334a]"><Sparkles size={13}/> Commander guide</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">How to play Mars Base</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">Your mission is to keep a colony alive for eight sols (a sol is one Martian day). There is no single way to do it: explore, learn and compare what happens after each decision.</p></section>
    <section className="rounded-[1.7rem] border-2 border-white bg-[#fff5e4] p-4 sm:p-6"><ol className="space-y-3">{steps.map(({ title, text, icon: Icon }, index) => <li key={title} className="flex gap-3 rounded-2xl border border-[#ead7c1] bg-white/85 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1e3ce] text-[#835b54]"><Icon size={19}/></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#9b6b60]">Step {index + 1}</p><h2 className="mt-0.5 text-sm font-black text-[#39334f]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#6c6066]">{text}</p></div></li>)}</ol>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#f5e7ce] p-4"><p className="flex items-center gap-2 text-xs font-black text-[#4c3d56]"><ShieldCheck size={15}/> A mission ends if…</p><p className="mt-2 text-xs leading-5 text-[#665962]">Energy, water or food runs out for life support. To win you also need a harvest and an exposure level below 50.</p></div><div className="rounded-2xl bg-[#e6f0de] p-4"><p className="flex items-center gap-2 text-xs font-black text-[#456a4a]"><Leaf size={15}/> Learn with the colony</p><p className="mt-2 text-xs leading-5 text-[#5d6a59]">Watch how your reserves change, care for the greenhouse and decide when to protect the crew. In NASA Science you can explore the solar record that inspired the preparations of NOVA.</p></div></div>
    </section>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setScreen('home')} className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-white bg-white/70 px-5 text-xs font-black text-[#4d4055] hover:bg-white focus-visible:outline-4 focus-visible:outline-[#4a3550]"><ArrowLeft size={16}/>Back to camp</button><button type="button" onClick={() => setScreen(game ? 'game' : 'home')} className="flex min-h-12 items-center gap-2 rounded-xl bg-[#d56d4f] px-5 text-xs font-black text-white hover:bg-[#b95642] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#4a3550]">{game ? 'Go to the mission' : 'Choose mission'}<ArrowRight size={16}/></button></div>
  </div>
}
