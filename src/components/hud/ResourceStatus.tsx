import { Droplets, HeartPulse, Leaf, Package, Sprout, Zap } from 'lucide-react'
import type { GameState, ResourceName } from '../../engine/types'

const resourceCards: { key: ResourceName; label: string; icon: typeof Zap; color: string; accent: string; cap?: number }[] = [
  { key: 'energy', label: 'Energy', icon: Zap, color: 'text-amber-300', accent: 'accent-amber-400', cap: 100 },
  { key: 'water', label: 'Water', icon: Droplets, color: 'text-sky-300', accent: 'accent-sky-400', cap: 100 },
  { key: 'food', label: 'Food', icon: Leaf, color: 'text-emerald-300', accent: 'accent-emerald-400', cap: 100 },
]

export function ResourceStatus({ game, immersive = false }: { game: GameState; immersive?: boolean }) {
  if (immersive) {
    const emoji: Record<'energy' | 'water' | 'food', string> = { energy: '⚡', water: '💧', food: '🍞' }
    const bar: Record<'energy' | 'water' | 'food', string> = { energy: 'accent-amber-400', water: 'accent-sky-400', food: 'accent-emerald-400' }
    return <section aria-label="Colony reserves" className="flex h-[56px] max-w-full items-center gap-1.5 overflow-x-auto rounded-[1.3rem] border-2 border-white/50 bg-[#302b48]/92 px-2 shadow-[0_10px_32px_#20172d66] backdrop-blur-md sm:h-[64px] sm:gap-2 sm:px-2.5">
      {resourceCards.map(({ key, label, cap = 100 }) => {
        const value = game.resources[key]
        const resource = key as 'energy' | 'water' | 'food'
        const danger = (key === 'energy' && value < 20) || (key === 'water' && value < 10) || (key === 'food' && value < 10)
        const empty = value <= 0
        return <article key={key} title={label} className={`flex h-[44px] w-[94px] shrink-0 items-center gap-1.5 rounded-2xl border-2 px-2 sm:h-[50px] sm:w-[126px] sm:gap-2 sm:px-2.5 lg:w-[150px] ${empty ? 'animate-pulse border-[#ff6b5e] bg-[#8a2f3a] motion-reduce:animate-none' : danger ? 'border-[#ff9c79]/80 bg-[#793e48]/85' : 'border-white/15 bg-white/[.08]'}`}>
          <span aria-hidden="true" className="text-lg sm:text-2xl">{emoji[resource]}</span>
          <div className="min-w-0 flex-1"><div className="flex items-baseline justify-between gap-1"><span className="hidden text-[11px] font-extrabold text-white/80 sm:inline">{label}</span><strong className={`text-sm font-black tabular-nums sm:text-lg ${danger ? 'text-[#ffc0a5]' : 'text-white'}`}>{value}</strong></div><progress aria-label={`${label}: ${value} of ${cap}`} max={cap} value={value} className={`mt-0.5 h-2 w-full overflow-hidden rounded-full ${danger ? 'accent-[#ff906f]' : bar[resource]}`}/></div>
        </article>
      })}
      <article className="flex h-[44px] w-[96px] shrink-0 items-center justify-around rounded-2xl border-2 border-white/15 bg-white/[.08] px-1.5 sm:h-[50px] sm:w-[126px] sm:px-2 lg:w-[150px]">
        <span title="Spare parts" className="inline-flex items-center gap-1 text-sm font-black text-white sm:text-base"><span aria-hidden="true">🔩</span>{game.resources.spareParts}<span className="sr-only">spare parts</span></span>
        <span title="Seeds" className="inline-flex items-center gap-1 text-sm font-black text-white sm:text-base"><span aria-hidden="true">🌱</span>{game.resources.seeds}<span className="sr-only">seeds</span></span>
      </article>
    </section>
  }
  return <section aria-label="Colony reserves" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
    {resourceCards.map(({ key, label, icon: Icon, color, accent, cap = 100 }) => {
      const value = game.resources[key]
      const danger = (key === 'energy' && value < 20) || (key === 'water' && value < 10) || (key === 'food' && value < 10)
      return <article key={key} className={`rounded-2xl border-2 px-3 py-2 shadow-[0_5px_15px_#32273a18] sm:px-4 sm:py-3 ${danger ? 'border-[#e3876c] bg-[#fff0df]' : 'border-white/80 bg-[#fff8eb]'}`}>
        <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#67566a] sm:text-xs">{label}</span><Icon size={17} className={color} aria-hidden="true"/></div>
        <div className="mt-1 flex items-baseline gap-1"><strong className={`text-xl font-black tabular-nums sm:text-2xl ${danger ? 'text-[#b64d41]' : 'text-[#302c50]'}`}>{value}</strong><span className="text-[10px] font-bold text-[#796b73]">/ {cap}</span></div>
        <progress aria-label={`${label}: ${value} of ${cap}`} max={cap} value={value} className={`mt-2 h-2 w-full overflow-hidden rounded-full ${danger ? 'accent-[#d76b59]' : accent}`}/>
      </article>
    })}
    <article className="flex items-center justify-between rounded-2xl border-2 border-white/80 bg-[#fff8eb] px-3 py-2 shadow-[0_5px_15px_#32273a18] sm:px-4 sm:py-3"><div><span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#67566a] sm:text-xs">Supplies</span><div className="mt-1 flex items-center gap-3 text-xs font-black text-[#302c50]"><span className="inline-flex items-center gap-1"><Package size={14} className="text-[#a36757]" aria-hidden="true"/>{game.resources.spareParts}</span><span className="inline-flex items-center gap-1"><Sprout size={14} className="text-[#5f945f]" aria-hidden="true"/>{game.resources.seeds}</span></div></div><HeartPulse size={18} aria-label={`Life support ${game.lifeSupport === 'stable' ? 'stable' : game.lifeSupport === 'risk' ? 'at risk' : 'critical'}`} className={game.lifeSupport === 'stable' ? 'text-emerald-500' : game.lifeSupport === 'risk' ? 'text-amber-500' : 'text-rose-600'}/></article>
  </section>
}
