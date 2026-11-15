import { useEffect } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { pendingEvent } from '../../engine/events'
import { GAME_CONFIG } from '../../engine/config'
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
  }, [enabled, expanded, setNovaLine])

  if (!enabled || expanded || !speechVisible || !novaLine) return null
  return <aside aria-label="Mensaje de NOVA" className="absolute bottom-[94px] right-7 z-40 w-[320px]">
    <section role="status" aria-live="polite" className="rounded-[1.2rem] border-2 border-white/90 bg-[#fff5e4]/95 p-3 text-[#3c354d] shadow-[0_12px_34px_#211a3399] backdrop-blur-md">
      <header className="flex items-center gap-2"><NovaFace/><div className="flex-1"><p className="text-xs font-black">NOVA</p><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#718487]">Tu siguiente paso</p></div><button type="button" onClick={hideNovaSpeech} aria-label="Ocultar mensaje de NOVA" className="grid size-8 place-items-center rounded-lg bg-[#eee2d2] text-base font-black hover:bg-[#dfcfbb] focus-visible:outline-2 focus-visible:outline-[#3c354d]">×</button></header>
      <p className="mt-2 text-xs font-semibold leading-5">{novaLine}</p>
      <button type="button" onClick={onOpen} className="mt-2 min-h-9 rounded-lg bg-[#484267] px-3 text-[10px] font-black text-white hover:bg-[#5b527d] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#484267]">Abrir panel de NOVA</button>
    </section>
  </aside>
}

function getRandomSuggestion(game: NonNullable<ReturnType<typeof useGameStore.getState>['game']>): string {
  const suggestions = [
    '¿Exploramos las dunas del sur? Haz clic en el terreno y te sigo.',
    'Abre el inventario cuando quieras revisar repuestos y semillas.',
    'Puedes seleccionar una parcela libre y caminar hasta ella antes de construir.',
    'Mira los objetivos de la misión para planear este sol.',
    'En Ciencia NASA puedes explorar el registro solar que inspiró los preparativos de la misión.',
  ]
  if (game.buildings.some((building) => building.type === 'greenhouse') && game.crop.active && !game.crop.harvested) {
    suggestions.push(`Tu cultivo va por ${game.crop.growth} %. Revisa su salud en el módulo Invernadero.`)
  } else if (game.buildings.some((building) => building.type === 'greenhouse') && !game.crop.harvested) {
    suggestions.push('Acércate al invernadero y abre Cultivo para revisar las opciones de siembra.')
  } else {
    suggestions.push('El taller permite preparar un invernadero o un panel solar en una parcela disponible.')
  }
  return suggestions[Math.floor(Math.random() * suggestions.length)]
}

export function NovaAssistant({ embedded = false }: { embedded?: boolean } = {}) {
  const expanded = useGameStore((state) => state.novaExpanded)
  const setExpanded = useGameStore((state) => state.setNovaExpanded)
  const game = useGameStore((state) => state.game)
  const screen = useGameStore((state) => state.screen)
  const novaLine = useGameStore((state) => state.novaLine)
  const contextualMessage = getNovaMessage(game, screen)
  const message = screen === 'game' && novaLine ? { ...contextualMessage, text: novaLine } : contextualMessage
  const urgent = contextualMessage.priority === 'urgent'
  if (embedded && !expanded) return null
  return <aside aria-label="Asistente de misión NOVA" className={embedded ? 'relative w-full' : 'fixed bottom-3 left-3 z-40 sm:bottom-5 sm:left-5'}>
    {expanded ? <div className="flex w-[min(370px,calc(100vw-1.5rem))] items-end gap-2 sm:gap-3">
      {!embedded && <NovaFigure/>}
      <section className={`relative mb-2 flex-1 rounded-[1.45rem] border-[3px] border-white p-3 shadow-[0_12px_35px_#31233c70] sm:p-4 ${urgent ? 'bg-[#ffefcb] text-[#46334c]' : 'bg-[#fff9ea] text-[#38324f]'}`} role={urgent ? 'alert' : 'status'} aria-live={urgent ? 'assertive' : 'polite'}><span className="absolute -bottom-2 left-4 size-4 rotate-45 border-b-[3px] border-r-[3px] border-white bg-inherit"/><header className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><NovaFace/><div><p className="text-base font-black sm:text-lg">NOVA</p><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-[#776970]">Asistente de misión</p></div></div><button type="button" onClick={() => setExpanded(false)} aria-label="Minimizar NOVA" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eee2d2] hover:bg-[#dfcfbb] focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#332f52]"><ChevronDown size={18} aria-hidden="true"/></button></header><p className="mt-3 text-xs font-semibold leading-5 sm:text-sm">{message.text}</p><p className="mt-2 inline-flex items-center gap-1 text-[9px] font-extrabold text-[#54835e]"><Sparkles size={12} aria-hidden="true"/> {urgent ? 'Aviso prioritario' : 'Ayuda local · yo no tomo decisiones'}</p></section>
    </div> : <button type="button" onClick={() => setExpanded(true)} aria-label="Abrir ayuda de NOVA" className="flex min-h-12 items-center gap-2 rounded-full border-[3px] border-white bg-[#3f3b65] px-2.5 py-1.5 text-sm font-black text-white shadow-[0_8px_24px_#33234470] hover:bg-[#5a5384] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#3f3b65]"><NovaFace/><span>Ayuda NOVA</span><ChevronUp size={16} aria-hidden="true"/></button>}
  </aside>
}

function getNovaMessage(game: ReturnType<typeof useGameStore.getState>['game'], screen: ReturnType<typeof useGameStore.getState>['screen']): { text: string; priority: 'normal' | 'urgent' } {
  if (screen === 'home') return { text: '¡Hola, comandante! Elige una ruta y explora la colonia a pie. Yo te explicaré las alertas, pero tú siempre decides.', priority: 'normal' }
  if (screen === 'howto') return { text: 'Lee los pasos antes de despegar. En la misión podrás volver a abrir mi ayuda cuando quieras.', priority: 'normal' }
  if (screen === 'science') return { text: 'Aquí separamos observaciones de NASA, explicaciones científicas y números que pertenecen al juego.', priority: 'normal' }
  if (screen === 'report') return { text: game?.won ? '¡La colonia lo consiguió! El informe te muestra qué decisiones ayudaron a la misión.' : 'Cada intento enseña algo. Lee el informe para ver qué ocurrió y cómo cambiar el plan.', priority: 'normal' }
  if (!game) return { text: 'Cuando comience la misión, te ayudaré a conocer la base y a cuidar a la tripulación.', priority: 'normal' }
  const event = pendingEvent(game)
  if (event?.kind === 'dust') return { text: '¡Tormenta de polvo! Los paneles generan menos energía durante dos soles. El modo ahorro gasta menos, pero el cultivo avanza más despacio.', priority: 'urgent' }
  if (event?.kind === 'solar') return { text: game.resources.energy < GAME_CONFIG.shelterCost ? '¡Alerta solar! No alcanzan las reservas para refugiar al equipo. Si se agota el tiempo, el nivel de exposición subirá 60 puntos.' : '¡Alerta solar! Refugiar cuesta 6 de energía y ocupa al equipo durante este sol. El cultivo puede continuar si quedan recursos.', priority: 'urgent' }
  if (game.lifeSupport === 'critical') return { text: `${game.lifeSupportReason} La misión ya terminó. Revisa el informe para entender qué reserva faltó.`, priority: 'urgent' }
  if (game.resources.energy < 20 || game.resources.water < 10 || game.resources.food < 10) return { text: `${game.lifeSupportReason} El soporte vital se atiende antes que el cultivo. Revisa la vista previa de cada avance.`, priority: 'urgent' }
  if (game.crewBusy) return { text: 'La tripulación ya hizo una tarea este sol. Puedes ajustar el modo del cultivo y luego revisar los cambios antes de cerrar el sol.', priority: 'normal' }
  if (!game.buildings.some((building) => building.type === 'greenhouse')) return { text: 'Busca una parcela libre en el mapa y construye un invernadero. La construcción cuesta 2 repuestos; todavía no siembra por sí sola.', priority: 'normal' }
  if (!game.crop.active && !game.crop.harvested) return { text: 'El invernadero ya está listo. Sembrar cuesta 25 de energía, 10 de agua y una semilla; mira las reservas antes de confirmar.', priority: 'normal' }
  if (game.crop.active && !game.crop.harvested && game.crop.growth >= 100) return { text: `¡El cultivo llegó a ${game.crop.growth} %! Revisa su salud: una cosecha sana puede sumar 35 de comida, una más débil suma 25.`, priority: 'normal' }
  if (game.crop.active && !game.crop.harvested) return { text: `El cultivo lleva ${game.crop.growth} %. En modo ${game.crop.mode === 'normal' ? 'normal' : game.crop.mode === 'saving' ? 'ahorro' : 'apagado'}, cambiarás el crecimiento y el gasto de energía y agua.`, priority: 'normal' }
  return { text: 'Camina por el valle, revisa las reservas y planea la siguiente acción. Avanzar el sol resuelve primero el soporte vital y después el cultivo.', priority: 'normal' }
}

function NovaFace() {
  return <svg aria-hidden="true" viewBox="0 0 80 80" className="size-11 shrink-0"><path d="M40 5v9" stroke="#514768" strokeWidth="5" strokeLinecap="round"/><circle cx="40" cy="5" r="5" fill="#ffe265"/><rect x="10" y="15" width="60" height="57" rx="22" fill="#f2e9d7" stroke="#393854" strokeWidth="5"/><rect x="17" y="23" width="46" height="31" rx="13" fill="#292c57"/><path d="M27 38q5-8 10 0m8 0q5-8 10 0" fill="none" stroke="#56f1ec" strokeWidth="5" strokeLinecap="round"/><path d="M34 63h12" stroke="#f7a94f" strokeWidth="6" strokeLinecap="round"/><circle cx="9" cy="43" r="5" fill="#ffbd61"/><circle cx="71" cy="43" r="5" fill="#ffbd61"/></svg>
}

function NovaFigure() {
  return <svg role="img" aria-label="NOVA, robot asistente de la misión" viewBox="0 0 170 220" className="hidden h-[180px] w-[130px] shrink-0 drop-shadow-xl sm:block"><ellipse cx="84" cy="200" rx="61" ry="12" fill="#302840" opacity=".35"/><path d="M66 112 35 156l30-2m40-42 31 44-32-3" fill="#f2e8d8" stroke="#514768" strokeWidth="8" strokeLinejoin="round"/><path d="M61 124 51 174m45-50 11 50" stroke="#514768" strokeWidth="11" strokeLinecap="round"/><path d="M44 166q-7 34 17 39h49q25-5 17-39l-14-36H58Z" fill="#f7eee0" stroke="#514768" strokeWidth="8"/><rect x="70" y="153" width="38" height="27" rx="9" fill="#f3a04e" stroke="#514768" strokeWidth="5"/><path d="M78 166h23" stroke="#ffe7aa" strokeWidth="5" strokeLinecap="round"/><path d="M82 10v18" stroke="#514768" strokeWidth="8" strokeLinecap="round"/><circle cx="82" cy="9" r="10" fill="#ffd65d" stroke="#514768" strokeWidth="5"/><rect x="27" y="29" width="112" height="96" rx="35" fill="#f7eee0" stroke="#514768" strokeWidth="9"/><rect x="41" y="45" width="84" height="57" rx="22" fill="#272b59"/><path d="M56 74q8-13 16 0m20 0q8-13 16 0" fill="none" stroke="#5af4ec" strokeWidth="7" strokeLinecap="round"/><path d="m29 60-13-9m125 9 13-9" stroke="#514768" strokeWidth="7" strokeLinecap="round"/><circle cx="17" cy="51" r="6" fill="#ffbd61"/><circle cx="154" cy="51" r="6" fill="#ffbd61"/></svg>
}
