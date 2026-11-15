import { Droplets, HeartPulse, Leaf, Package, Sprout, Zap } from 'lucide-react'
import type { GameState, ResourceName } from '../../engine/types'

const resourceCards: { key: ResourceName; label: string; icon: typeof Zap; color: string; accent: string; cap?: number }[] = [
  { key: 'energy', label: 'Energía', icon: Zap, color: 'text-amber-300', accent: 'accent-amber-400', cap: 100 },
  { key: 'water', label: 'Agua', icon: Droplets, color: 'text-sky-300', accent: 'accent-sky-400', cap: 100 },
  { key: 'food', label: 'Comida', icon: Leaf, color: 'text-emerald-300', accent: 'accent-emerald-400', cap: 100 },
]

export function ResourceStatus({ game }: { game: GameState }) {
  return <section aria-label="Reservas de la colonia" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
    {resourceCards.map(({ key, label, icon: Icon, color, accent, cap = 100 }) => {
      const value = game.resources[key]
      const danger = (key === 'energy' && value < 20) || (key === 'water' && value < 10) || (key === 'food' && value < 10)
      return <article key={key} className={`rounded-2xl border-2 px-3 py-2 shadow-[0_5px_15px_#32273a18] sm:px-4 sm:py-3 ${danger ? 'border-[#e3876c] bg-[#fff0df]' : 'border-white/80 bg-[#fff8eb]'}`}>
        <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#67566a] sm:text-xs">{label}</span><Icon size={17} className={color} aria-hidden="true"/></div>
        <div className="mt-1 flex items-baseline gap-1"><strong className={`text-xl font-black tabular-nums sm:text-2xl ${danger ? 'text-[#b64d41]' : 'text-[#302c50]'}`}>{value}</strong><span className="text-[10px] font-bold text-[#796b73]">/ {cap}</span></div>
        <progress aria-label={`${label}: ${value} de ${cap}`} max={cap} value={value} className={`mt-2 h-2 w-full overflow-hidden rounded-full ${danger ? 'accent-[#d76b59]' : accent}`}/>
      </article>
    })}
    <article className="flex items-center justify-between rounded-2xl border-2 border-white/80 bg-[#fff8eb] px-3 py-2 shadow-[0_5px_15px_#32273a18] sm:px-4 sm:py-3"><div><span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#67566a] sm:text-xs">Suministros</span><div className="mt-1 flex items-center gap-3 text-xs font-black text-[#302c50]"><span className="inline-flex items-center gap-1"><Package size={14} className="text-[#a36757]" aria-hidden="true"/>{game.resources.spareParts}</span><span className="inline-flex items-center gap-1"><Sprout size={14} className="text-[#5f945f]" aria-hidden="true"/>{game.resources.seeds}</span></div></div><HeartPulse size={18} aria-label={`Soporte vital ${game.lifeSupport === 'stable' ? 'estable' : game.lifeSupport === 'risk' ? 'en riesgo' : 'crítico'}`} className={game.lifeSupport === 'stable' ? 'text-emerald-500' : game.lifeSupport === 'risk' ? 'text-amber-500' : 'text-rose-600'}/></article>
  </section>
}
