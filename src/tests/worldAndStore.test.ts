import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nasaSources } from '../data/nasa/sources'
import { marsPlots } from '../data/mars/plots'
import { MARS_WORLD } from '../data/mars/world'
import { createInitialGame } from '../engine/createInitialGame'
import { SCENARIO_PRESETS } from '../engine/config'
import { useGameStore } from '../store/useGameStore'

describe('exploration world and one game store', () => {
  beforeEach(() => useGameStore.setState({ game: createInitialGame(), screen: 'game', selectedPlotId: null, novaExpanded: false, tutorialDismissed: false, previewCommand: null, errorMessage: null, message: null }))
  afterEach(() => vi.unstubAllGlobals())

  it('defines a large explorable surface with construction plots, obstacles and landmarks', () => {
    expect(MARS_WORLD).toMatchObject({ width: 4800, height: 3200 })
    expect(marsPlots.length).toBeGreaterThanOrEqual(10)
    expect(marsPlots.filter((plot) => plot.kind === 'available').length).toBeGreaterThanOrEqual(6)
    expect(marsPlots.some((plot) => plot.kind === 'obstacle')).toBe(true)
    expect(marsPlots.every((plot) => plot.x > 0 && plot.x < MARS_WORLD.width && plot.y > 0 && plot.y < MARS_WORLD.height)).toBe(true)
  })

  it('moves the astronaut through the game state without changing colony resources', () => {
    const start = useGameStore.getState().game!
    const resources = { ...start.resources }
    useGameStore.getState().moveAstronaut('right')
    expect(useGameStore.getState().game?.mapPosition).toEqual({ x: start.mapPosition.x + MARS_WORLD.moveStep, y: start.mapPosition.y })
    expect(useGameStore.getState().game?.resources).toEqual(resources)
    useGameStore.getState().setAstronautPosition(MARS_WORLD.width + 200, -20)
    expect(useGameStore.getState().game?.mapPosition).toEqual({ x: MARS_WORLD.width, y: 0 })
  })

  it('keeps NOVA minimizable in the same Zustand store as the game', () => {
    useGameStore.getState().setNovaExpanded(true)
    expect(useGameStore.getState().novaExpanded).toBe(true)
    useGameStore.getState().setNovaExpanded(false)
    expect(useGameStore.getState().novaExpanded).toBe(false)
    expect('resources' in useGameStore.getState()).toBe(false)
  })

  it('uses deterministic scenario presets for initial energy and event sols', () => {
    const standard = createInitialGame()
    const reinforced = createInitialGame('reserve-rich')
    const early = createInitialGame('early-events')
    expect(standard).toMatchObject({ resources: { energy: 48 }, eventSols: { dust: 3, solar: 6 } })
    expect(reinforced).toMatchObject({ resources: { energy: 56 }, eventSols: { dust: 4, solar: 7 } })
    expect(early).toMatchObject({ resources: { energy: 48 }, eventSols: { dust: 2, solar: 5 } })
    expect(early).toEqual(createInitialGame('early-events'))
    expect(Object.keys(SCENARIO_PRESETS)).toHaveLength(3)
  })

  it('shows only sources whose NASA CCMC records were checked', () => {
    expect(nasaSources.length).toBeGreaterThan(0)
    expect(nasaSources.every((source) => source.verification === 'verified' && source.checkedOn === '2026-11-14')).toBe(true)
  })

  it('cancels a store preview without changing the game and confirms only once', () => {
    useGameStore.getState().moveAstronaut('right')
    useGameStore.getState().moveAstronaut('down')
    const before = JSON.stringify(useGameStore.getState().game)
    useGameStore.getState().openPreview({ type: 'build', building: 'greenhouse', plotId: 'B1' })
    useGameStore.getState().cancelPreview()
    expect(JSON.stringify(useGameStore.getState().game)).toBe(before)
    useGameStore.getState().openPreview({ type: 'build', building: 'greenhouse', plotId: 'B1' })
    useGameStore.getState().confirmPreview()
    expect(useGameStore.getState().game?.resources.spareParts).toBe(2)
    useGameStore.getState().confirmPreview()
    expect(useGameStore.getState().game?.resources.spareParts).toBe(2)
  })

  it('restores a saved game from browser storage and reports an unreadable save', () => {
    const entries = new Map<string, string>()
    const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value), removeItem: (key: string) => entries.delete(key), clear: () => entries.clear(), key: (index: number) => [...entries.keys()][index] ?? null, get length() { return entries.size } }
    vi.stubGlobal('localStorage', storage)
    useGameStore.getState().startGame()
    useGameStore.getState().moveAstronaut('right')
    useGameStore.getState().moveAstronaut('down')
    useGameStore.getState().dispatch({ type: 'build', building: 'greenhouse', plotId: 'B1' })
    useGameStore.setState({ game: null, savedGameAvailable: false, screen: 'home' })
    useGameStore.getState().restoreGame()
    expect(useGameStore.getState().game?.resources.spareParts).toBe(2)
    expect(useGameStore.getState().savedGameAvailable).toBe(true)
    entries.set('base-marte-save-v1', '{ bad json')
    useGameStore.setState({ game: null, savedGameAvailable: false, corruptSave: false })
    useGameStore.getState().restoreGame()
    expect(useGameStore.getState().corruptSave).toBe(true)
  })
})
