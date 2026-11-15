import { create } from 'zustand'
import { dispatchGameCommand } from '../engine/actions'
import { createInitialGame } from '../engine/createInitialGame'
import { previewDecision } from '../engine/previewDecision'
import { GAME_CONFIG, SCENARIO_PRESETS } from '../engine/config'
import type { GameCommand, GameState, DecisionPreview, ScenarioId } from '../engine/types'
import { MARS_WORLD } from '../data/mars/world'
import { supplySites } from '../data/mars/supplies'

const SAVE_KEY = 'base-marte-save-v1'
const SAVE_VERSION = 1
const NOVA_WELCOME = '¡Hola! Soy NOVA, tu asistente de misión. Te acompañaré por Marte. Primer paso: explora el valle, revisa tus reservas y elige una parcela libre para construir.'
export type GameScreen = 'home' | 'howto' | 'game' | 'science' | 'report'

interface GameStore {
  game: GameState | null
  solStartedAt: number | null
  screen: GameScreen
  selectedScenarioId: ScenarioId
  selectedPlotId: string | null
  novaExpanded: boolean
  novaLine: string | null
  novaSpeechVersion: number
  novaSpeechVisible: boolean
  tutorialDismissed: boolean
  previewCommand: GameCommand | null
  errorMessage: string | null
  message: string | null
  corruptSave: boolean
  savedGameAvailable: boolean
  setScreen: (screen: GameScreen) => void
  setScenario: (scenarioId: ScenarioId) => void
  startGame: () => void
  continueGame: () => void
  restartGame: () => void
  restoreGame: () => void
  clearCorruptSave: () => void
  selectPlot: (plotId: string | null) => void
  setNovaExpanded: (expanded: boolean) => void
  setNovaLine: (line: string) => void
  repeatNovaLine: () => void
  hideNovaSpeech: () => void
  dismissTutorial: () => void
  openPreview: (command: GameCommand) => DecisionPreview | null
  cancelPreview: () => void
  confirmPreview: () => void
  dispatch: (command: GameCommand) => boolean
  moveAstronaut: (direction: 'up' | 'down' | 'left' | 'right') => void
  setAstronautPosition: (x: number, y: number) => void
  clearMessage: () => void
}

function isSavedGame(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<GameState>
  return candidate.version === 1
    && typeof candidate.scenarioId === 'string'
    && candidate.scenarioId in SCENARIO_PRESETS
    && typeof candidate.eventSols?.dust === 'number'
    && typeof candidate.eventSols?.solar === 'number'
    && Number.isInteger(candidate.sol)
    && typeof candidate.gameOver === 'boolean'
    && candidate.resources !== undefined
    && (Object.values(candidate.resources).every((resource) => typeof resource === 'number' && resource >= 0))
    && Array.isArray(candidate.buildings)
    && Array.isArray(candidate.events)
    && Array.isArray(candidate.log)
    && candidate.crop !== undefined
    && candidate.mapPosition !== undefined
}

function persistGame(game: GameState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, game }))
}

function removeSave(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(SAVE_KEY)
}

function novaTaskMessage(command: GameCommand, game: GameState): string {
  if (game.gameOver) return game.won ? '¡Lo logramos, comandante! La base completó la misión. Toca mis alas cuando quieras que te repita este mensaje.' : `La misión terminó. ${game.lifeSupportReason} Abre el informe para revisar qué ocurrió y cómo intentarlo de nuevo.`
  if (command.type === 'build') {
    const name = command.building === 'greenhouse' ? 'Invernadero' : 'Panel solar'
    return `Empezó la construcción del ${name.toLowerCase()}. La estructura se ve en montaje; la tripulación queda ocupada hasta que cierres este sol.`
  }
  if (command.type === 'collectSupply') {
    const site = supplySites.find((item) => item.id === command.siteId)
    const amount = site ? game.log.at(-1)?.resourceDeltas[site.resource] ?? site.amount : 0
    return site ? `¡Suministros recuperados! ${site.name}: +${amount} ${({ energy: 'energía', water: 'agua', food: 'comida', spareParts: 'repuestos', seeds: 'semillas' } as const)[site.resource]}. La tripulación ya realizó su tarea de este sol.` : '¡Suministros recuperados para la colonia!'
  }
  if (command.type === 'sow') return '¡Semillas plantadas! El cultivo crece cuando cierras cada sol. En modo normal tarda unos 5 avances de sol en llegar al 100 %, si hay agua y energía.'
  if (command.type === 'accelerateCrop') return '¡Impulso activado! Usé 12 de energía para adelantar hasta 20 puntos de crecimiento. Puedes impulsarlo una vez en cada sol.'
  if (command.type === 'harvest') return '¡Cosecha lista! Revisa la comida y tus objetivos. Pulsa «Avanzar sol» cuando quieras cerrar esta jornada.'
  if (command.type === 'setMode') return command.mode === 'off'
    ? 'El invernadero está apagado: el cultivo queda en pausa. Puedes volver a activarlo o cerrar el sol cuando estés lista.'
    : `Modo ${command.mode === 'saving' ? 'ahorro' : 'normal'} seleccionado. Cada vez que avances el sol revisaré recursos y crecimiento; el ritmo depende de este modo.`
  if (command.type === 'resolveDust') return `Elegiste ${command.choice === 'saving' ? 'ahorrar energía' : 'mantener el ritmo normal'} durante la tormenta. Pulsa «Avanzar sol» para aplicar sus efectos.`
  if (command.type === 'resolveSolar') return command.choice === 'shelter'
    ? 'La tripulación quedó a resguardo. Pulsa «Avanzar sol» para cerrar esta jornada y actualizar los recursos.'
    : 'Decidiste continuar durante la alerta. Pulsa «Avanzar sol» para cerrar la jornada y ver las consecuencias.'
  if (command.type === 'missSolarDeadline') return 'La ventana del refugio terminó. El nivel de exposición subió 60 puntos; revisa la bitácora.'
  if (command.type === 'advance' || command.type === 'advanceTimed') {
    const event = game.events.find((item) => item.sol === game.sol && !item.resolved)
    if (event?.kind === 'dust') return `Empezó el sol ${game.sol} y hay tormenta de polvo. Abre Alertas para elegir cómo cuidar el cultivo.`
    if (event?.kind === 'solar') return `¡Alerta solar! Camina hasta la nave y entra antes de 00:${String(GAME_CONFIG.solarShelterWindowSeconds).padStart(2, '0')} para proteger al equipo. Sin refugio, sube el nivel de exposición.`
    if (command.type === 'advanceTimed') return `Pasaron seis minutos de juego. Comenzó el sol ${game.sol} de ${game.maxSols}; energía, soporte vital y cultivo ya se actualizaron.`
    return `Cerraste el día. Ahora es el sol ${game.sol} de ${game.maxSols}. Revisa energía, agua y crecimiento antes de elegir tu siguiente tarea.`
  }
  return NOVA_WELCOME
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  solStartedAt: null,
  screen: 'home',
  selectedScenarioId: 'standard',
  selectedPlotId: null,
  novaExpanded: false,
  novaLine: null,
  novaSpeechVersion: 0,
  novaSpeechVisible: false,
  tutorialDismissed: false,
  previewCommand: null,
  errorMessage: null,
  message: null,
  corruptSave: false,
  savedGameAvailable: false,
  setScreen: (screen) => set({ screen, errorMessage: null }),
  setScenario: (selectedScenarioId) => set({ selectedScenarioId }),
  startGame: () => {
    const game = createInitialGame(get().selectedScenarioId)
    const solStartedAt = Date.now()
    persistGame(game)
    set({ game, solStartedAt, screen: 'game', savedGameAvailable: true, selectedPlotId: null, novaExpanded: false, novaLine: NOVA_WELCOME, novaSpeechVersion: get().novaSpeechVersion + 1, novaSpeechVisible: true, tutorialDismissed: false, previewCommand: null, errorMessage: null, message: '¡Hola, comandante! Tu misión comienza en el sol 1.' })
  },
  continueGame: () => set((state) => state.game ? { screen: 'game', solStartedAt: Date.now(), novaLine: `¡Qué bueno verte de nuevo, comandante! Seguimos en el sol ${state.game.sol}. Revisa tus reservas y te acompaño con el siguiente paso.`, novaSpeechVersion: state.novaSpeechVersion + 1, novaSpeechVisible: true } : {}),
  restartGame: () => {
    const game = createInitialGame(get().selectedScenarioId)
    const solStartedAt = Date.now()
    persistGame(game)
    set({ game, solStartedAt, screen: 'game', savedGameAvailable: true, selectedPlotId: null, novaExpanded: false, novaLine: NOVA_WELCOME, novaSpeechVersion: get().novaSpeechVersion + 1, novaSpeechVisible: true, tutorialDismissed: false, previewCommand: null, errorMessage: null, message: 'La nueva misión está lista. ¡Vamos a cuidar la base!' })
  },
  restoreGame: () => {
    try {
      if (typeof localStorage === 'undefined') return
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { version?: number; game?: unknown }
      if (parsed.version !== SAVE_VERSION || !isSavedGame(parsed.game)) {
        set({ corruptSave: true })
        return
      }
      set({ game: parsed.game, savedGameAvailable: true })
    } catch {
      set({ corruptSave: true })
    }
  },
  clearCorruptSave: () => {
    removeSave()
    set({ corruptSave: false, savedGameAvailable: false })
  },
  selectPlot: (selectedPlotId) => set({ selectedPlotId }),
  setNovaExpanded: (novaExpanded) => set({ novaExpanded }),
  setNovaLine: (novaLine) => set((state) => ({ novaLine, novaSpeechVersion: state.novaSpeechVersion + 1, novaSpeechVisible: true })),
  repeatNovaLine: () => set((state) => ({ novaLine: state.novaLine ?? NOVA_WELCOME, novaSpeechVersion: state.novaSpeechVersion + 1, novaSpeechVisible: true })),
  hideNovaSpeech: () => set({ novaSpeechVisible: false }),
  dismissTutorial: () => set({ tutorialDismissed: true }),
  openPreview: (command) => {
    const game = get().game
    if (!game) return null
    const preview = previewDecision(game, command)
    if (!preview.allowed) set({ errorMessage: preview.reason ?? 'No se puede realizar esta acción.' })
    else set({ previewCommand: command, errorMessage: null })
    return preview
  },
  cancelPreview: () => set({ previewCommand: null }),
  confirmPreview: () => {
    const command = get().previewCommand
    if (!command) return
    set({ previewCommand: null })
    get().dispatch(command)
  },
  dispatch: (command) => {
    const game = get().game
    if (!game) return false
    const result = dispatchGameCommand(game, command)
    if (!result.ok) {
      set({ errorMessage: result.reason ?? 'No se pudo realizar la acción.' })
      return false
    }
    persistGame(result.state)
    const solClosed = result.state.sol !== game.sol || result.state.solsCompleted > game.solsCompleted
    const solStartedAt = solClosed || get().solStartedAt === null ? Date.now() : get().solStartedAt
    const novaLine = novaTaskMessage(command, result.state)
    set({
      game: result.state,
      solStartedAt,
      screen: 'game',
      novaLine,
      novaSpeechVersion: get().novaSpeechVersion + 1,
      novaSpeechVisible: true,
      errorMessage: null,
      message: command.type === 'advance' ? result.state.log.at(-1)?.consequence ?? null : result.state.log.at(-1)?.consequence ?? null,
      previewCommand: solClosed ? null : get().previewCommand,
      selectedPlotId: command.type === 'build' ? null : get().selectedPlotId,
    })
    return true
  },
  moveAstronaut: (direction) => {
    const game = get().game
    if (!game || game.gameOver || (game.crewBusy && (game.crewTask === 'build' || game.crewTask === 'shelter'))) return
    const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const
    const [dx, dy] = directions[direction]
    const step = MARS_WORLD.moveStep
    const x = Math.max(0, Math.min(MARS_WORLD.width, game.mapPosition.x + dx * step))
    const y = Math.max(0, Math.min(MARS_WORLD.height, game.mapPosition.y + dy * step))
    set({ game: { ...game, mapPosition: { x, y } } })
  },
  setAstronautPosition: (x, y) => {
    const game = get().game
    if (!game || game.gameOver || (game.crewBusy && (game.crewTask === 'build' || game.crewTask === 'shelter'))) return
    set({ game: { ...game, mapPosition: { x: Math.max(0, Math.min(MARS_WORLD.width, x)), y: Math.max(0, Math.min(MARS_WORLD.height, y)) } } })
  },
  clearMessage: () => set({ message: null, errorMessage: null }),
}))
