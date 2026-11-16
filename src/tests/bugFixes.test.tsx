import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../app/App'
import { CropPanel, DecisionPreviewModal } from '../app/GameScreen'
import { HowToScreen } from '../app/HowToScreen'
import { MissionReportScreen } from '../app/MissionReportScreen'
import { BuildingPreview } from '../components/buildings/BuildingPreview'
import { EventStatus } from '../components/events/EventStatus'
import { ShipInterior } from '../components/map/ShipInterior'
import { resolveNovaDisplay } from '../components/nova/novaRules'
import { readCachedConditions } from '../data/nasa/nasaApi'
import { marsPlots } from '../data/mars/plots'
import { HABITAT_ZONE } from '../data/mars/terrain'
import { dispatchGameCommand, sleepBlockedReasonFor } from '../engine/actions'
import { createInitialGame } from '../engine/createInitialGame'
import { currentObjective } from '../engine/objectives'
import { previewDecision } from '../engine/previewDecision'
import type { GameState } from '../engine/types'
import { useGameStore } from '../store/useGameStore'

function createStorageStub() {
  const entries = new Map<string, string>()
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
    clear: () => entries.clear(),
    key: (index: number) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size
    },
  }
}

describe('bug fixes regression suite', () => {
  beforeEach(() => {
    useGameStore.setState({
      game: createInitialGame(),
      solStartedAt: Date.now(),
      solRemainingMs: null,
      emergencyStartedAt: null,
      emergencyRemainingMs: null,
      solarEventId: null,
      solarDeadlineAt: null,
      solarRemainingMs: null,
      timersPaused: false,
      endingDismissed: false,
      screen: 'game',
      previousScreen: 'home',
      selectedPlotId: null,
      novaExpanded: false,
      novaLine: null,
      novaSpeechVersion: 0,
      novaSpeechVisible: false,
      tutorialDismissed: false,
      previewCommand: null,
      errorMessage: null,
      message: null,
      floatingTexts: [],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('guides to harvesting when the crop reaches 100% even if supplies or the rover garage were skipped', () => {
    const plotB1 = marsPlots.find((plot) => plot.id === 'B1')!
    const base = createInitialGame()
    const readyWithoutGarage: GameState = {
      ...base,
      sol: 7,
      suppliesCollected: 0,
      resources: { ...base.resources, spareParts: 0 },
      buildings: [
        ...base.buildings,
        { id: 'greenhouse-1', type: 'greenhouse', plotId: 'B1', operational: true },
        { id: 'solar-2', type: 'solar', plotId: 'C2', operational: true },
      ],
      crop: { active: true, growth: 100, health: 100, mode: 'normal', consecutiveOffSols: 0, harvested: false },
    }
    expect(currentObjective(readyWithoutGarage)).toMatchObject({
      id: 'harvest',
      step: 6,
      target: { x: plotB1.x, y: plotB1.y },
    })
  })

  it('does not trap the mission tracker on the rover garage when the crop is growing and spare parts are gone or crew is busy', () => {
    const base = createInitialGame()
    const growingBusy: GameState = {
      ...base,
      sol: 2,
      suppliesCollected: 1,
      crewBusy: true,
      crewTask: 'sow',
      buildings: [...base.buildings, { id: 'greenhouse-1', type: 'greenhouse', plotId: 'B1', operational: true }],
      crop: { active: true, growth: 0, health: 100, mode: 'normal', consecutiveOffSols: 0, harvested: false },
    }
    expect(currentObjective(growingBusy)).toMatchObject({ id: 'grow', step: 5 })

    const growingWithoutParts: GameState = {
      ...growingBusy,
      sol: 4,
      crewBusy: false,
      crewTask: undefined,
      resources: { ...growingBusy.resources, spareParts: 0 },
      crop: { ...growingBusy.crop, growth: 40 },
    }
    expect(currentObjective(growingWithoutParts)).toMatchObject({ id: 'grow', step: 5 })
  })

  it('advances the mission tracker to survive once a crop has been harvested even if optional steps were skipped', () => {
    const base = createInitialGame()
    const harvested: GameState = {
      ...base,
      sol: 7,
      suppliesCollected: 0,
      foodHarvested: 35,
      harvests: 1,
      buildings: [...base.buildings, { id: 'greenhouse-1', type: 'greenhouse', plotId: 'B1', operational: true }],
      crop: { active: false, growth: 0, health: 100, mode: 'normal', consecutiveOffSols: 0, harvested: true },
    }
    expect(currentObjective(harvested)).toMatchObject({ id: 'survive', step: 7 })
  })

  it('lets a sheltered astronaut sleep until morning when sheltering dropped energy to zero', () => {
    const base = createInitialGame()
    const sol6: GameState = {
      ...base,
      sol: 6,
      mapPosition: HABITAT_ZONE.position,
      resources: { ...base.resources, energy: 6 },
      events: [{ id: 'solar-sol-6', kind: 'solar', sol: 6, resolved: false }],
    }
    const sheltered = dispatchGameCommand(sol6, { type: 'resolveSolar', choice: 'shelter' })
    expect(sheltered.ok).toBe(true)
    expect(sheltered.state.resources.energy).toBe(0)
    expect(sheltered.state.emergency).toEqual(['energy'])

    const woke = dispatchGameCommand(sheltered.state, { type: 'sleep' })
    expect(woke.ok, woke.reason).toBe(true)
    expect(woke.state.sol).toBe(7)
    expect(woke.state.resources.energy).toBe(8)
    expect(woke.state.emergency).toBeUndefined()
  })

  it('syncs the riding rover position if the astronaut builds while riding', () => {
    const base = createInitialGame()
    const plot = marsPlots.find((item) => item.id === 'B1')!
    const ridingState: GameState = {
      ...base,
      mapPosition: { x: plot.x, y: plot.y },
      buildings: [...base.buildings, { id: 'garage-1', type: 'garage', plotId: 'B3', operational: true }],
      rover: { position: { x: plot.x, y: plot.y }, riding: true },
    }
    const built = dispatchGameCommand(ridingState, { type: 'build', building: 'greenhouse', plotId: 'B1' })
    expect(built.ok).toBe(true)
    expect(built.state.rover?.position).toEqual(built.state.mapPosition)
  })

  it('updates lifeSupport status and reason immediately when actions or travel enter low-reserve thresholds', () => {
    const base = createInitialGame()
    const plot = marsPlots.find((item) => item.id === 'B1')!
    const ready: GameState = {
      ...base,
      mapPosition: { x: plot.x, y: plot.y },
      resources: { ...base.resources, energy: 40 },
      buildings: [...base.buildings, { id: 'greenhouse-1', type: 'greenhouse', plotId: 'B1', operational: true }],
    }
    const sowed = dispatchGameCommand(ready, { type: 'sow' })
    expect(sowed.ok).toBe(true)
    expect(sowed.state.resources.energy).toBe(15)
    expect(sowed.state.lifeSupport).toBe('risk')
    expect(sowed.state.lifeSupportReason.toLowerCase()).toContain('energy')
  })

  it('starts clocks when entering the game screen after restoring a saved game in emergency', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T00:00:00Z'))
    const storage = createStorageStub()
    vi.stubGlobal('localStorage', storage)

    const saved = {
      ...createInitialGame(),
      resources: { energy: 40, water: 0, food: 20, spareParts: 4, seeds: 1 },
      emergency: ['water' as const],
      lifeSupport: 'critical' as const,
    }
    storage.setItem('base-marte-save-v1', JSON.stringify({ version: 1, game: saved }))
    useGameStore.setState({ game: null, solStartedAt: null, emergencyStartedAt: null, screen: 'home', savedGameAvailable: false })

    useGameStore.getState().restoreGame()
    useGameStore.getState().setScreen('game')

    expect(useGameStore.getState().solStartedAt).not.toBeNull()
    expect(useGameStore.getState().emergencyStartedAt).not.toBeNull()
  })

  it('pauses and preserves sol and solar timers when visiting Science and returning', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T00:00:00Z'))

    const solarGame: GameState = {
      ...createInitialGame(),
      sol: 6,
      events: [{ id: 'solar-sol-6', kind: 'solar', sol: 6, resolved: false }],
    }
    useGameStore.setState({ game: solarGame, screen: 'game', solStartedAt: Date.now() })
    useGameStore.getState().ensureSolarTimer('solar-sol-6', 45)

    vi.advanceTimersByTime(15_000)
    useGameStore.getState().setScreen('science')
    vi.advanceTimersByTime(120_000)
    useGameStore.getState().setScreen('game')

    const { solStartedAt, solarDeadlineAt } = useGameStore.getState()
    expect(Date.now() - solStartedAt!).toBe(15_000)
    expect(Math.round((solarDeadlineAt! - Date.now()) / 1000)).toBe(30)
  })

  it('persists the astronaut position immediately when walking ends even within 3 seconds of start', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T00:00:00Z'))
    const storage = createStorageStub()
    vi.stubGlobal('localStorage', storage)

    useGameStore.getState().startGame()
    vi.advanceTimersByTime(400)
    useGameStore.getState().setAstronautPosition(1450, 950, true)

    useGameStore.setState({ game: null, savedGameAvailable: false, screen: 'home' })
    useGameStore.getState().restoreGame()

    expect(useGameStore.getState().game?.mapPosition).toEqual({ x: 1450, y: 950 })
  })

  it('does not show a stale log consequence toast when toggling the rover', () => {
    const base = createInitialGame()
    const plot = marsPlots.find((item) => item.id === 'B3')!
    const state: GameState = {
      ...base,
      mapPosition: { x: plot.x + 150, y: plot.y + 60 },
      buildings: [...base.buildings, { id: 'garage-1', type: 'garage', plotId: 'B3', operational: true }],
      rover: { position: { x: plot.x + 150, y: plot.y + 60 }, riding: false },
      log: [{ sol: 1, action: 'Collect backup battery', cost: '', consequence: 'The colony received 20 energy.', resourceDeltas: { energy: 20 }, kind: 'action' }],
    }
    useGameStore.setState({ game: state, message: null })
    expect(useGameStore.getState().dispatch({ type: 'toggleRover' })).toBe(true)
    expect(useGameStore.getState().message).not.toContain('received 20 energy')
  })

  it('ignores a malformed cached NASA payload in localStorage', () => {
    const storage = createStorageStub()
    vi.stubGlobal('localStorage', storage)
    storage.setItem('base-marte-nasa-conditions-v1', JSON.stringify({ source: 'live', fetchedAt: new Date().toISOString() }))
    expect(readCachedConditions()).toBeNull()
  })

  it('disables build buttons in BuildingPreview when an unresolved alert is pending', () => {
    const plot = marsPlots.find((item) => item.id === 'B1')!
    const game: GameState = {
      ...createInitialGame(),
      sol: 6,
      mapPosition: { x: plot.x, y: plot.y },
      events: [{ id: 'solar-sol-6', kind: 'solar', sol: 6, resolved: false }],
    }
    const markup = renderToStaticMarkup(<BuildingPreview game={game} selectedPlotId="B1" playerPosition={game.mapPosition} onBuild={() => {}} />)
    const previewButtons = markup.match(/<button[^>]*>Preview<\/button>/g) ?? []
    expect(previewButtons.length).toBeGreaterThan(0)
    expect(previewButtons.every((button) => button.includes('disabled='))).toBe(true)
    expect(markup).toContain('Resolve the active alert')
  })

  it('shows the actual building name in DecisionPreviewModal for water extractor, rover garage and storm bunker', () => {
    const plot = marsPlots.find((item) => item.id === 'B1')!
    const game: GameState = { ...createInitialGame(), mapPosition: { x: plot.x, y: plot.y } }
    for (const [building, label] of [['water', 'Build water extractor'], ['garage', 'Build rover garage'], ['bunker', 'Build storm bunker'], ['solar', 'Build second solar panel']] as const) {
      const command = { type: 'build' as const, building, plotId: 'B1' }
      const markup = renderToStaticMarkup(<DecisionPreviewModal game={game} command={command} preview={previewDecision(game, command)} onCancel={() => {}} onConfirm={() => {}} />)
      expect(markup).toContain(label)
      expect(markup).not.toContain('Build greenhouse')
    }
  })

  it('keeps urgent NOVA contextual warnings visible instead of showing stale idle chatter', () => {
    const base = createInitialGame()
    const dustGame: GameState = {
      ...base,
      sol: 3,
      events: [{ id: 'dust-sol-3', kind: 'dust', sol: 3, resolved: false }],
    }
    const resolved = resolveNovaDisplay(dustGame, 'game', 'Shall we explore the southern dunes? Click the ground and I will follow you.')
    expect(resolved.priority).toBe('urgent')
    expect(resolved.text).toContain('Dust storm!')
    expect(resolved.text).not.toContain('southern dunes')
  })

  it('allows sleeping when sheltered at 0 energy in sleepBlockedReasonFor and warns on damaged ready crops in CropPanel', () => {
    const base = createInitialGame()
    const shelteredZero: GameState = {
      ...base,
      sol: 6,
      crewBusy: true,
      crewTask: 'shelter',
      shelterZone: 'bunker',
      emergency: ['energy'],
      resources: { ...base.resources, energy: 0 },
    }
    expect(sleepBlockedReasonFor(shelteredZero)).toBeNull()

    const plot = marsPlots.find((item) => item.id === 'B1')!
    const spoiledCrop: GameState = {
      ...base,
      mapPosition: { x: plot.x, y: plot.y },
      buildings: [...base.buildings, { id: 'greenhouse-1', type: 'greenhouse', plotId: 'B1', operational: true }],
      crop: { active: true, growth: 100, health: 25, mode: 'normal', consecutiveOffSols: 2, harvested: false },
    }
    const cropMarkup = renderToStaticMarkup(<CropPanel game={spoiledCrop} playerPosition={spoiledCrop.mapPosition} onAction={() => {}} />)
    expect(cropMarkup).toContain('Health fell below 50%')
    expect(cropMarkup).toContain('Clear crop')
  })

  it('keeps ShipInterior scrollable on short laptop viewports instead of clipping the Sleep button', () => {
    const game = createInitialGame()
    const markup = renderToStaticMarkup(<ShipInterior game={game} onExit={() => {}} onSleep={() => {}} sleepBlockedReason={null} />)
    expect(markup).not.toContain('min-h-[700px]')
    expect(markup).toContain('overflow-y-auto')
  })

  it('mentions all safe zones in EventStatus instead of only the ship', () => {
    const base = createInitialGame()
    const solarGame: GameState = {
      ...base,
      sol: 6,
      events: [{ id: 'solar-sol-6', kind: 'solar', sol: 6, resolved: false }],
    }
    const markup = renderToStaticMarkup(<EventStatus game={solarGame} onDustChoice={() => {}} onSolarChoice={() => {}} />)
    expect(markup).toContain('safe zone')
    expect(markup).toContain('lava')
  })

  it('keeps bottom clearance and right-aligned navigation actions on non-map pages so floating NOVA does not cover Back buttons', () => {
    const howtoMarkup = renderToStaticMarkup(<HowToScreen />)
    expect(howtoMarkup).toContain('justify-end')

    const finishedGame = { ...createInitialGame(), gameOver: true, won: true, endReason: 'win' as const, solsCompleted: 8, foodHarvested: 35 }
    const reportMarkup = renderToStaticMarkup(<MissionReportScreen game={finishedGame} />)
    expect(reportMarkup).toContain('justify-end')

    const appMarkup = renderToStaticMarkup(<App />)
    expect(appMarkup).toContain('pb-24')
  })
})
