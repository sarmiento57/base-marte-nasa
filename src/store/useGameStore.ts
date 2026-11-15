import { create } from 'zustand'
import { dispatchGameCommand } from '../engine/actions'
import { createInitialGame } from '../engine/createInitialGame'
import { previewDecision } from '../engine/previewDecision'
import { SCENARIO_PRESETS } from '../engine/config'
import type { GameCommand, GameState, DecisionPreview, ScenarioId } from '../engine/types'
import { MARS_WORLD } from '../data/mars/world'

const SAVE_KEY = 'base-marte-save-v1'
const SAVE_VERSION = 1
export type GameScreen = 'home' | 'howto' | 'game' | 'science' | 'report'

interface GameStore {
  game: GameState | null
  screen: GameScreen
  selectedScenarioId: ScenarioId
  selectedPlotId: string | null
  novaExpanded: boolean
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

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  screen: 'home',
  selectedScenarioId: 'standard',
  selectedPlotId: null,
  novaExpanded: false,
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
    persistGame(game)
    set({ game, screen: 'game', savedGameAvailable: true, selectedPlotId: null, novaExpanded: false, tutorialDismissed: false, previewCommand: null, errorMessage: null, message: '¡Hola, comandante! Tu misión comienza en el sol 1.' })
  },
  continueGame: () => set((state) => state.game ? { screen: state.game.gameOver ? 'report' : 'game' } : {}),
  restartGame: () => {
    const game = createInitialGame(get().selectedScenarioId)
    persistGame(game)
    set({ game, screen: 'game', savedGameAvailable: true, selectedPlotId: null, novaExpanded: false, tutorialDismissed: false, previewCommand: null, errorMessage: null, message: 'La nueva misión está lista. ¡Vamos a cuidar la base!' })
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
    set({
      game: result.state,
      screen: result.state.gameOver ? 'report' : 'game',
      errorMessage: null,
      message: command.type === 'advance' ? result.state.log.at(-1)?.consequence ?? null : result.state.log.at(-1)?.consequence ?? null,
      selectedPlotId: command.type === 'build' ? null : get().selectedPlotId,
    })
    return true
  },
  moveAstronaut: (direction) => {
    const game = get().game
    if (!game || game.gameOver) return
    const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const
    const [dx, dy] = directions[direction]
    const step = MARS_WORLD.moveStep
    const x = Math.max(0, Math.min(MARS_WORLD.width, game.mapPosition.x + dx * step))
    const y = Math.max(0, Math.min(MARS_WORLD.height, game.mapPosition.y + dy * step))
    set({ game: { ...game, mapPosition: { x, y } } })
  },
  setAstronautPosition: (x, y) => {
    const game = get().game
    if (!game || game.gameOver) return
    set({ game: { ...game, mapPosition: { x: Math.max(0, Math.min(MARS_WORLD.width, x)), y: Math.max(0, Math.min(MARS_WORLD.height, y)) } } })
  },
  clearMessage: () => set({ message: null }),
}))
