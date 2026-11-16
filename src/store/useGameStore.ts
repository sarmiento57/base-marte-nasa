import { create } from 'zustand'
import { dispatchGameCommand } from '../engine/actions'
import { createInitialGame } from '../engine/createInitialGame'
import { previewDecision } from '../engine/previewDecision'
import { BUILDING_LABEL, SCENARIO_PRESETS, SHELTER_WINDOW_SECONDS } from '../engine/config'
import type { GameCommand, GameState, DecisionPreview, MissionConditions, ResourceName, ScenarioId } from '../engine/types'
import { MARS_WORLD } from '../data/mars/world'
import { supplySites } from '../data/mars/supplies'
import { ARCHIVED_CONDITIONS, cacheConditions, fetchNasaConditions, readCachedConditions, type NasaConditions } from '../data/nasa/nasaApi'

const RESOURCE_ICON: Record<ResourceName, string> = { energy: '⚡', water: '💧', food: '🍞', spareParts: '🔩', seeds: '🌱' }
const PERSIST_EVERY_MS = 3000

export interface FloatingText { id: number; text: string; tone: 'gain' | 'loss' }

const SAVE_KEY = 'base-marte-save-v1'
const SAVE_VERSION = 1
const NOVA_WELCOME = 'Hi! I am NOVA, your mission assistant. I will be with you on Mars. First step: explore the valley, check your reserves and choose a free plot to build on.'
export type GameScreen = 'home' | 'howto' | 'game' | 'science' | 'report'

interface GameStore {
  game: GameState | null
  nasa: NasaConditions
  nasaStatus: 'archived' | 'loading' | 'live' | 'offline'
  /** Real time when the empty-life-support alert started; the mission ends 60 s later if not refilled. */
  emergencyStartedAt: number | null
  floatingTexts: FloatingText[]
  loadNasaConditions: () => Promise<void>
  dropFloatingText: (id: number) => void
  solStartedAt: number | null
  screen: GameScreen
  /** Screen shown before the current one, so the mission knows whether to play its landing screen. */
  previousScreen: GameScreen
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

let lastPersistedAt = 0
function persistGame(game: GameState): void {
  lastPersistedAt = Date.now()
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, game }))
  } catch {
    // Storage may be full or blocked; the mission keeps running in memory.
  }
}

function missionConditions(nasa: NasaConditions): MissionConditions {
  return { climate: nasa.climate, spaceWeather: nasa.spaceWeather.level }
}

let floatingId = 0
function resourceChanges(before: GameState, after: GameState): FloatingText[] {
  return (Object.keys(after.resources) as ResourceName[]).flatMap((resource) => {
    const delta = after.resources[resource] - before.resources[resource]
    if (!delta) return []
    floatingId += 1
    return [{ id: floatingId, text: `${delta > 0 ? '+' : ''}${delta} ${RESOURCE_ICON[resource]}`, tone: delta > 0 ? 'gain' as const : 'loss' as const }]
  })
}

function emergencyClock(before: GameState | null, after: GameState, startedAt: number | null): number | null {
  if (!after.emergency?.length || after.gameOver) return null
  return before?.emergency?.length && startedAt !== null ? startedAt : Date.now()
}

function removeSave(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(SAVE_KEY)
}

function novaTaskMessage(command: GameCommand, game: GameState): string {
  if (game.gameOver) return game.won ? 'We did it, commander! The base completed the mission. Tap my wings any time to hear this message again.' : `The mission is over. ${game.lifeSupportReason} Open the report to see what happened and how to try again.`
  if (game.emergency?.length) return `Oh no! We ran out of ${game.emergency.join(' and ')}. Follow my arrow to a supply and refill it before the timer ends!`
  if (command.type === 'build') return `Construction of the ${BUILDING_LABEL[command.building].toLowerCase()} has started! The crew finishes when this sol ends. Tip: sleep in the habitat to make time pass faster.`
  if (command.type === 'sleep') return `Good morning, commander! It is sol ${game.sol} of ${game.maxSols}. Let us check energy, water and food.`
  if (command.type === 'toggleRover') return game.rover?.riding ? 'Vroom! The rover drives twice as fast and uses only energy. Press R to get off.' : 'You parked the rover. Press R next to it to drive again.'
  if (command.type === 'collectSupply') {
    const site = supplySites.find((item) => item.id === command.siteId)
    const amount = site ? game.log.at(-1)?.resourceDeltas[site.resource] ?? site.amount : 0
    return site ? `Got it! ${site.name}: +${amount} ${({ energy: 'energy', water: 'water', food: 'food', spareParts: 'spare parts', seeds: 'seeds' } as const)[site.resource]}. This spot refills in ${site.refillSols} sols.` : 'Supplies recovered for the colony!'
  }
  if (command.type === 'sow') return 'Seeds planted! The crop grows each time a sol ends: about 5 sols in normal mode. Sleep in the habitat to make time pass faster.'
  if (command.type === 'accelerateCrop') return 'Boost on! I used 12 energy to add up to 20 growth points. You can boost once per sol.'
  if (command.type === 'harvest') return 'Harvest done! Check your food and objectives. Press “Advance sol” when you want to close this workday.'
  if (command.type === 'setMode') return command.mode === 'off'
    ? 'The greenhouse is off: the crop is paused. You can turn it back on or close the sol when you are ready.'
    : `${command.mode === 'saving' ? 'Saving' : 'Normal'} mode selected. Each time you advance the sol I will check resources and growth; the pace depends on this mode.`
  if (command.type === 'resolveDust') return `You chose to ${command.choice === 'saving' ? 'save energy' : 'keep the normal pace'} during the storm. Press “Advance sol” to apply the effects.`
  if (command.type === 'resolveSolar') return command.choice === 'shelter'
    ? 'The crew is safe. Press “Advance sol” to close this workday and update resources.'
    : 'You chose to keep going during the alert. Press “Advance sol” to close the workday and see the consequences.'
  if (command.type === 'missSolarDeadline') return 'The shelter window closed. The exposure level rose 60 points; check the logbook.'
  if (command.type === 'advance' || command.type === 'advanceTimed') {
    const event = game.events.find((item) => item.sol === game.sol && !item.resolved)
    if (event?.kind === 'dust') return `Sol ${game.sol} has started and there is a dust storm. Open Alerts to choose how to protect the crop.`
    if (event?.kind === 'solar') return `Solar storm! Follow my arrow to a safe zone in ${SHELTER_WINDOW_SECONDS[game.conditions?.spaceWeather ?? 'active']} seconds: the habitat, the lava tube cave or a bunker.`
    if (command.type === 'advanceTimed') return `A new sol begins: sol ${game.sol} of ${game.maxSols}. Energy, life support and the crop are updated.`
    return `You closed the day. It is now sol ${game.sol} of ${game.maxSols}. Check energy, water and growth before choosing your next task.`
  }
  return NOVA_WELCOME
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  nasa: ARCHIVED_CONDITIONS,
  nasaStatus: 'archived',
  emergencyStartedAt: null,
  floatingTexts: [],
  loadNasaConditions: async () => {
    const cached = readCachedConditions()
    if (cached) {
      set({ nasa: cached, nasaStatus: 'live' })
      return
    }
    set({ nasaStatus: 'loading' })
    try {
      const live = await fetchNasaConditions()
      cacheConditions(live)
      set({ nasa: live, nasaStatus: 'live' })
    } catch {
      set({ nasa: ARCHIVED_CONDITIONS, nasaStatus: 'offline' })
    }
  },
  dropFloatingText: (id) => set((state) => ({ floatingTexts: state.floatingTexts.filter((item) => item.id !== id) })),
  solStartedAt: null,
  screen: 'home',
  previousScreen: 'home',
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
  setScreen: (screen) => set((state) => ({ screen, previousScreen: state.screen, errorMessage: null })),
  setScenario: (selectedScenarioId) => set({ selectedScenarioId }),
  startGame: () => {
    const game = createInitialGame(get().selectedScenarioId, missionConditions(get().nasa))
    const solStartedAt = Date.now()
    persistGame(game)
    set({ game, solStartedAt, screen: 'game', previousScreen: 'home', emergencyStartedAt: null, floatingTexts: [], savedGameAvailable: true, selectedPlotId: null, novaExpanded: false, novaLine: NOVA_WELCOME, novaSpeechVersion: get().novaSpeechVersion + 1, novaSpeechVisible: true, tutorialDismissed: false, previewCommand: null, errorMessage: null, message: 'Hello, commander! Your mission starts on sol 1.' })
  },
  continueGame: () => set((state) => state.game ? { screen: 'game', previousScreen: 'home', emergencyStartedAt: state.game.emergency?.length ? Date.now() : null, solStartedAt: Date.now(), novaLine: `Great to see you again, commander! We are on sol ${state.game.sol}. Check your reserves and I will help with the next step.`, novaSpeechVersion: state.novaSpeechVersion + 1, novaSpeechVisible: true } : {}),
  restartGame: () => {
    const game = createInitialGame(get().selectedScenarioId, missionConditions(get().nasa))
    const solStartedAt = Date.now()
    persistGame(game)
    set({ game, solStartedAt, screen: 'game', previousScreen: 'home', emergencyStartedAt: null, floatingTexts: [], savedGameAvailable: true, selectedPlotId: null, novaExpanded: false, novaLine: NOVA_WELCOME, novaSpeechVersion: get().novaSpeechVersion + 1, novaSpeechVisible: true, tutorialDismissed: false, previewCommand: null, errorMessage: null, message: 'The new mission is ready. Let us take care of the base!' })
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
    if (!preview.allowed) set({ errorMessage: preview.reason ?? 'This action is not possible.' })
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
      set({ errorMessage: result.reason ?? 'The action could not be completed.' })
      return false
    }
    persistGame(result.state)
    const emergencyStartedAt = emergencyClock(game, result.state, get().emergencyStartedAt)
    const solClosed = result.state.sol !== game.sol || result.state.solsCompleted > game.solsCompleted
    const solStartedAt = solClosed || get().solStartedAt === null ? Date.now() : get().solStartedAt
    const novaLine = novaTaskMessage(command, result.state)
    set({
      game: result.state,
      solStartedAt,
      emergencyStartedAt,
      floatingTexts: [...get().floatingTexts, ...resourceChanges(game, result.state)].slice(-6),
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
    if (!game || game.gameOver || (game.crewBusy && game.crewTask === 'shelter')) return
    const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const
    const [dx, dy] = directions[direction]
    const step = MARS_WORLD.moveStep
    const x = Math.max(0, Math.min(MARS_WORLD.width, game.mapPosition.x + dx * step))
    const y = Math.max(0, Math.min(MARS_WORLD.height, game.mapPosition.y + dy * step))
    set({ game: { ...game, mapPosition: { x, y } } })
  },
  setAstronautPosition: (x, y) => {
    const game = get().game
    if (!game || game.gameOver || (game.crewBusy && game.crewTask === 'shelter')) return
    const mapPosition = { x: Math.max(0, Math.min(MARS_WORLD.width, x)), y: Math.max(0, Math.min(MARS_WORLD.height, y)) }
    const riding = Boolean(game.rover?.riding)
    const moved = { ...game, mapPosition, rover: riding && game.rover ? { ...game.rover, position: mapPosition } : game.rover }
    // Walking and driving use a little energy, water and food.
    const travelled = dispatchGameCommand(moved, { type: 'travel', distance: Math.hypot(mapPosition.x - game.mapPosition.x, mapPosition.y - game.mapPosition.y), mode: riding ? 'rover' : 'foot' }).state
    const changes = resourceChanges(game, travelled)
    const emergencyStartedAt = emergencyClock(game, travelled, get().emergencyStartedAt)
    if (changes.length || Date.now() - lastPersistedAt > PERSIST_EVERY_MS) persistGame(travelled)
    set({
      game: travelled,
      emergencyStartedAt,
      ...(changes.length ? { floatingTexts: [...get().floatingTexts, ...changes].slice(-6) } : {}),
      ...(travelled.emergency?.length && !game.emergency?.length ? { novaLine: `Oh no! We ran out of ${travelled.emergency.join(' and ')}. Follow my arrow to a supply and refill it before the timer ends!`, novaSpeechVersion: get().novaSpeechVersion + 1, novaSpeechVisible: true } : {}),
    })
  },
  clearMessage: () => set({ message: null, errorMessage: null }),
}))
