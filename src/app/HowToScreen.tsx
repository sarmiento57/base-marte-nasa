import { ArrowLeft, ArrowRight, Cloud, Leaf, MousePointer2, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'

const steps = [
  { title: 'Camina por la superficie', text: 'Usa WASD, las flechas, el pad del celular o toca el terreno para moverte. El radar enseña dónde estás.', icon: MousePointer2 },
  { title: 'Prepara tu colonia', text: 'Elige una parcela libre, revisa el costo y confirma la construcción. Una tarea ocupa a la tripulación durante ese sol.', icon: Zap },
  { title: 'Cultiva comida', text: 'Construye el invernadero, siembra y cambia entre los modos normal, ahorro y apagado. La salud del cultivo importa.', icon: Leaf },
  { title: 'Decide ante las alertas', text: 'La tormenta baja la energía solar. En la alerta solar puedes gastar energía para refugiar al equipo.', icon: Cloud },
  { title: 'Revisa antes de actuar', text: 'Cada acción muestra su costo y lo que puede pasar antes de confirmarla. NOVA explica las consecuencias.', icon: Sparkles },
]

export function HowToScreen() {
  const setScreen = useGameStore((state) => state.setScreen)
  const game = useGameStore((state) => state.game)
  return <div className="mx-auto max-w-4xl space-y-5 p-3 pb-10 sm:p-6">
    <section className="overflow-hidden rounded-[1.8rem] border-4 border-white bg-[#4a3550] p-5 text-white shadow-[0_14px_38px_#47334935] sm:p-8"><p className="inline-flex items-center gap-2 rounded-full bg-[#f0a45f] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#43334a]"><Sparkles size={13}/> Guía de comandante</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Cómo jugar Base Marte</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">Tu misión es sostener una colonia durante ocho soles. No hay una única forma de intentarlo: explora, aprende y compara lo que pasa después de cada decisión.</p></section>
    <section className="rounded-[1.7rem] border-2 border-white bg-[#fff5e4] p-4 sm:p-6"><ol className="space-y-3">{steps.map(({ title, text, icon: Icon }, index) => <li key={title} className="flex gap-3 rounded-2xl border border-[#ead7c1] bg-white/85 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1e3ce] text-[#835b54]"><Icon size={19}/></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#9b6b60]">Paso {index + 1}</p><h2 className="mt-0.5 text-sm font-black text-[#39334f]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#6c6066]">{text}</p></div></li>)}</ol>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#f5e7ce] p-4"><p className="flex items-center gap-2 text-xs font-black text-[#4c3d56]"><ShieldCheck size={15}/> Una misión termina si…</p><p className="mt-2 text-xs leading-5 text-[#665962]">Falta energía, agua o comida para cubrir el soporte vital. También necesitas una cosecha y mantener el índice educativo de exposición bajo 50 para ganar.</p></div><div className="rounded-2xl bg-[#e6f0de] p-4"><p className="flex items-center gap-2 text-xs font-black text-[#456a4a]"><Leaf size={15}/> Aprende con la colonia</p><p className="mt-2 text-xs leading-5 text-[#5d6a59]">Los números de recursos y los eventos son parte de una simulación educativa; las observaciones científicas reales se identifican aparte.</p></div></div>
    </section>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setScreen('home')} className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-white bg-white/70 px-5 text-xs font-black text-[#4d4055] hover:bg-white focus-visible:outline-4 focus-visible:outline-[#4a3550]"><ArrowLeft size={16}/>Volver al campamento</button><button type="button" onClick={() => setScreen(game ? 'game' : 'home')} className="flex min-h-12 items-center gap-2 rounded-xl bg-[#d56d4f] px-5 text-xs font-black text-white hover:bg-[#b95642] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#4a3550]">{game ? 'Ir a la misión' : 'Elegir misión'}<ArrowRight size={16}/></button></div>
  </div>
}
