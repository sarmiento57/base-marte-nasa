import { useEffect } from 'react'
import { BookOpen, House, Orbit, Radio, Trophy } from 'lucide-react'
import { GameScreen } from './GameScreen'
import { HomeScreen } from './HomeScreen'
import { HowToScreen } from './HowToScreen'
import { MissionReportScreen } from './MissionReportScreen'
import { NovaAssistant } from '../components/nova/NovaAssistant'
import { ScienceSources } from '../components/science/ScienceSources'
import { useGameStore } from '../store/useGameStore'

const screenTitles = { home: 'Campamento', howto: 'Cómo jugar', game: 'Misión en Marte', science: 'Ciencia NASA', report: 'Informe de misión' }

export default function App() {
  const screen = useGameStore((state) => state.screen)
  const game = useGameStore((state) => state.game)
  const setScreen = useGameStore((state) => state.setScreen)
  const restoreGame = useGameStore((state) => state.restoreGame)
  useEffect(() => { restoreGame() }, [restoreGame])

  if (screen === 'game') return <GameScreen />

  const navigate = (target: 'home' | 'howto' | 'game' | 'science' | 'report') => {
    if (target === 'report' && !game?.gameOver) return
    if (target === 'game' && !game) return setScreen('home')
    setScreen(target)
  }
  const links = [
    { target: 'home' as const, label: 'Campamento', mobileLabel: 'Base', icon: House },
    { target: 'howto' as const, label: 'Cómo jugar', mobileLabel: 'Guía', icon: BookOpen },
    { target: 'game' as const, label: 'Explorar', mobileLabel: 'Mapa', icon: Orbit, disabled: !game },
    { target: 'science' as const, label: 'Ciencia', mobileLabel: 'Ciencia', icon: Radio },
    ...(game?.gameOver ? [{ target: 'report' as const, label: 'Informe', mobileLabel: 'Informe', icon: Trophy }] : []),
  ]

  return <div className="min-h-screen bg-[linear-gradient(180deg,#f4d5b3_0%,#f4dfc4_32%,#f2e2cc_100%)] font-[Trebuchet_MS,ui-rounded,system-ui,sans-serif] text-[#302c50] selection:bg-[#69d5d5]/50">
    <a href="#contenido" className="sr-only z-50 rounded-lg bg-white p-3 text-[#302c50] focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Saltar al juego</a>
    <header className="sticky top-0 z-30 border-b border-white/20 bg-[#322e56]/95 text-white shadow-[0_6px_20px_#342a4655] backdrop-blur-sm"><div className="mx-auto flex max-w-[1560px] items-center justify-between gap-3 px-3 py-2.5 sm:px-6"><button type="button" onClick={() => navigate('home')} className="flex min-h-11 items-center gap-2 rounded-xl px-1 text-left hover:opacity-90 focus-visible:outline-4 focus-visible:outline-white"><span className="grid size-10 place-items-center rounded-2xl bg-[#ffae73] text-[#473454]"><Orbit size={23} aria-hidden="true"/></span><span><span className="block text-[9px] font-extrabold text-[#ffe1b5] sm:text-[10px]">NASA SPACE APPS CHALLENGE 2026</span><span className="block text-base font-black leading-5 sm:text-lg">Base Marte <span className="font-semibold text-[#c9f4e2]">· {screenTitles[screen]}</span></span></span></button><span className="hidden rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold sm:inline-flex sm:items-center sm:gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-[#9be8bb]"/> Modo exploración sin conexión</span></div>
      <nav className="mx-auto flex max-w-[1560px] flex-wrap justify-center gap-1.5 px-2 pb-2 sm:gap-2 sm:px-6" aria-label="Navegación del juego">{links.map(({ target, label, mobileLabel, icon: Icon, disabled }) => <button key={target} type="button" disabled={disabled} onClick={() => navigate(target)} aria-current={screen === target ? 'page' : undefined} className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-xl border px-2 text-[9px] font-extrabold transition-colors focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#c8f5ed] sm:gap-1.5 sm:px-4 sm:text-xs ${screen === target ? 'border-[#ffe7b5] bg-[#ffe7b5] text-[#413650] shadow' : 'border-white/10 bg-white/5 text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40'}`}><Icon size={14} aria-hidden="true"/><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{mobileLabel}</span></button>)}</nav>
    </header>
    <main id="contenido" className="mx-auto max-w-[1560px] px-0 pb-8 pt-3 sm:px-3 sm:pt-5">
      {screen === 'home' && <HomeScreen/>}
      {screen === 'howto' && <HowToScreen/>}
      {screen === 'science' && <div className="space-y-4 px-3 sm:px-3"><ScienceSources/><button type="button" onClick={() => navigate(game ? 'game' : 'home')} className="min-h-11 rounded-xl border-2 border-white bg-white/70 px-5 text-xs font-black text-[#4e4053] hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#493550]">Volver a {game ? 'la misión' : 'campamento'}</button></div>}
      {screen === 'report' && game?.gameOver && <MissionReportScreen game={game}/>}
    </main>
    <NovaAssistant/>
  </div>
}
