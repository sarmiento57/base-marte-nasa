import { useEffect } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { getNovaMessage, resolveNovaDisplay } from './novaRules'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

export function NovaChatter({ enabled, onOpen }: { enabled: boolean; onOpen: () => void }) {
  const expanded = useGameStore((state) => state.novaExpanded)
  const novaLine = useGameStore((state) => state.novaLine)
  const speechVersion = useGameStore((state) => state.novaSpeechVersion)
  const speechVisible = useGameStore((state) => state.novaSpeechVisible)
  const setNovaLine = useGameStore((state) => state.setNovaLine)
  const hideNovaSpeech = useGameStore((state) => state.hideNovaSpeech)

  useEffect(() => {
    if (!speechVisible) return
    const timer = window.setTimeout(hideNovaSpeech, 8500)
    return () => window.clearTimeout(timer)
  }, [speechVisible, speechVersion, hideNovaSpeech])

  useEffect(() => {
    if (!enabled || expanded) return
    let nextMessageTimer = 0
    const speakLater = (delay: number) => {
      nextMessageTimer = window.setTimeout(() => {
        const { game, screen, novaExpanded } = useGameStore.getState()
        const currentMessage = getNovaMessage(game, screen)
        if (!novaExpanded && game && !game.gameOver && currentMessage.priority === 'normal') {
          setNovaLine(getRandomSuggestion(game))
        }
        speakLater(28000 + Math.random() * 22000)
      }, delay)
    }

    speakLater(18000 + Math.random() * 10000)
    return () => {
      window.clearTimeout(nextMessageTimer)
    }
  }, [enabled, expanded, speechVersion, setNovaLine])

  if (!enabled || expanded || !speechVisible || !novaLine) return null
  return <aside aria-label="Message from NOVA" className="absolute bottom-[94px] right-7 z-40 w-[320px]">
    <section role="status" aria-live="polite" className="rounded-[1.2rem] border-2 border-white/90 bg-[#fff5e4]/95 p-3 text-[#3c354d] shadow-[0_12px_34px_#211a3399] backdrop-blur-md">
      <header className="flex items-center gap-2"><NovaFace/><div className="flex-1"><p className="text-xs font-black">NOVA</p><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#718487]">Your next step</p></div><button type="button" onClick={hideNovaSpeech} aria-label="Hide NOVA message" className="grid size-8 place-items-center rounded-lg bg-[#eee2d2] text-base font-black hover:bg-[#dfcfbb] focus-visible:outline-2 focus-visible:outline-[#3c354d]">×</button></header>
      <p className="mt-2 text-xs font-semibold leading-5">{novaLine}</p>
      <button type="button" onClick={onOpen} className="mt-2 min-h-9 rounded-lg bg-[#484267] px-3 text-[10px] font-black text-white hover:bg-[#5b527d] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#484267]">Open NOVA panel</button>
    </section>
  </aside>
}

function getRandomSuggestion(game: NonNullable<ReturnType<typeof useGameStore.getState>['game']>): string {
  const suggestions = [
    'Shall we explore the southern dunes? Click the ground and I will follow you.',
    'Open the inventory whenever you want to check spare parts and seeds.',
    'You can select a free plot and walk to it before building.',
    'Check the mission chapters to plan this sol.',
    'Rocks and crater rims block the way, and soft dunes slow you down. Go around them!',
    'Ice deposits and battery cells refill a few sols after you collect them.',
    'In NASA Science you can explore the solar record that inspired the mission preparations.',
  ]
  if (game.buildings.some((building) => building.type === 'greenhouse') && game.crop.active && !game.crop.harvested) {
    suggestions.push(`Your crop is at ${game.crop.growth} %. Check its health in the Greenhouse module.`)
  } else if (game.buildings.some((building) => building.type === 'greenhouse') && !game.crop.harvested) {
    suggestions.push('Go to the greenhouse and open Crop to see the planting options.')
  } else {
    suggestions.push('The workshop can build a greenhouse, a rover garage, a water extractor, a storm bunker or a solar panel.')
  }
  return suggestions[Math.floor(Math.random() * suggestions.length)]
}

export function NovaAssistant({ embedded = false }: { embedded?: boolean } = {}) {
  const expanded = useGameStore((state) => state.novaExpanded)
  const setExpanded = useGameStore((state) => state.setNovaExpanded)
  const game = useGameStore((state) => state.game)
  const screen = useGameStore((state) => state.screen)
  const novaLine = useGameStore((state) => state.novaLine)
  const message = resolveNovaDisplay(game, screen, novaLine)
  const urgent = message.priority === 'urgent'
  if (embedded && !expanded) return null
  return <aside aria-label="NOVA mission assistant" className={embedded ? 'relative w-full' : 'fixed bottom-3 left-3 z-40 sm:bottom-5 sm:left-5'}>
    {expanded ? <div className="flex w-[min(370px,calc(100vw-1.5rem))] items-end gap-2 sm:gap-3">
      {!embedded && <NovaFigure/>}
      <section className={`relative mb-2 flex-1 rounded-[1.45rem] border-[3px] border-white p-3 shadow-[0_12px_35px_#31233c70] sm:p-4 ${urgent ? 'bg-[#ffefcb] text-[#46334c]' : 'bg-[#fff9ea] text-[#38324f]'}`} role={urgent ? 'alert' : 'status'} aria-live={urgent ? 'assertive' : 'polite'}><span className="absolute -bottom-2 left-4 size-4 rotate-45 border-b-[3px] border-r-[3px] border-white bg-inherit"/><header className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><NovaFace/><div><p className="text-base font-black sm:text-lg">NOVA</p><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-[#776970]">Mission assistant</p></div></div><button type="button" onClick={() => setExpanded(false)} aria-label="Minimize NOVA" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eee2d2] hover:bg-[#dfcfbb] focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#332f52]"><ChevronDown size={18} aria-hidden="true"/></button></header><p className="mt-3 text-xs font-semibold leading-5 sm:text-sm">{message.text}</p><p className="mt-2 inline-flex items-center gap-1 text-[9px] font-extrabold text-[#54835e]"><Sparkles size={12} aria-hidden="true"/> {urgent ? 'Priority warning' : 'Local help · I never decide for you'}</p></section>
    </div> : <button type="button" onClick={() => setExpanded(true)} aria-label="Open NOVA help" className="flex min-h-12 items-center gap-2 rounded-full border-[3px] border-white bg-[#3f3b65] px-2.5 py-1.5 text-sm font-black text-white shadow-[0_8px_24px_#33234470] hover:bg-[#5a5384] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#3f3b65]"><NovaFace/><span>NOVA help</span><ChevronUp size={16} aria-hidden="true"/></button>}
  </aside>
}

function NovaFace() {
  return <svg aria-hidden="true" viewBox="0 0 80 80" className="size-11 shrink-0"><path d="M40 5v9" stroke="#514768" strokeWidth="5" strokeLinecap="round"/><circle cx="40" cy="5" r="5" fill="#ffe265"/><rect x="10" y="15" width="60" height="57" rx="22" fill="#f2e9d7" stroke="#393854" strokeWidth="5"/><rect x="17" y="23" width="46" height="31" rx="13" fill="#292c57"/><path d="M27 38q5-8 10 0m8 0q5-8 10 0" fill="none" stroke="#56f1ec" strokeWidth="5" strokeLinecap="round"/><path d="M34 63h12" stroke="#f7a94f" strokeWidth="6" strokeLinecap="round"/><circle cx="9" cy="43" r="5" fill="#ffbd61"/><circle cx="71" cy="43" r="5" fill="#ffbd61"/></svg>
}

function NovaFigure() {
  return <svg role="img" aria-label="NOVA, the mission robot assistant" viewBox="0 0 170 220" className="hidden h-[180px] w-[130px] shrink-0 drop-shadow-xl sm:block"><ellipse cx="84" cy="200" rx="61" ry="12" fill="#302840" opacity=".35"/><path d="M66 112 35 156l30-2m40-42 31 44-32-3" fill="#f2e8d8" stroke="#514768" strokeWidth="8" strokeLinejoin="round"/><path d="M61 124 51 174m45-50 11 50" stroke="#514768" strokeWidth="11" strokeLinecap="round"/><path d="M44 166q-7 34 17 39h49q25-5 17-39l-14-36H58Z" fill="#f7eee0" stroke="#514768" strokeWidth="8"/><rect x="70" y="153" width="38" height="27" rx="9" fill="#f3a04e" stroke="#514768" strokeWidth="5"/><path d="M78 166h23" stroke="#ffe7aa" strokeWidth="5" strokeLinecap="round"/><path d="M82 10v18" stroke="#514768" strokeWidth="8" strokeLinecap="round"/><circle cx="82" cy="9" r="10" fill="#ffd65d" stroke="#514768" strokeWidth="5"/><rect x="27" y="29" width="112" height="96" rx="35" fill="#f7eee0" stroke="#514768" strokeWidth="9"/><rect x="41" y="45" width="84" height="57" rx="22" fill="#272b59"/><path d="M56 74q8-13 16 0m20 0q8-13 16 0" fill="none" stroke="#5af4ec" strokeWidth="7" strokeLinecap="round"/><path d="m29 60-13-9m125 9 13-9" stroke="#514768" strokeWidth="7" strokeLinecap="round"/><circle cx="17" cy="51" r="6" fill="#ffbd61"/><circle cx="154" cy="51" r="6" fill="#ffbd61"/></svg>
}
