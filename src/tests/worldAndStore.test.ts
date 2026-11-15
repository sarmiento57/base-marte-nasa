import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nasaSources } from '../data/nasa/sources'
import { marsPlots } from '../data/mars/plots'
import { MARS_WORLD } from '../data/mars/world'
import { createInitialGame } from '../engine/createInitialGame'
import { SCENARIO_PRESETS } from '../engine/config'
import { useGameStore } from '../store/useGameStore'

describe('exploration world and one game store', () => {
  beforeEach(() => useGameStore.setState({ game: createInitialGame(), solStartedAt: Date.now(), screen: 'game', selectedPlotId: null, novaLine: null, novaSpeechVisible: false, novaExpanded: false, tutorialDismissed: false, previewCommand: null, errorMessage: null, message: null }))
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

  it('repeats the most recent NOVA line when the companion is tapped', () => {
    useGameStore.getState().setNovaLine('¡Hola! Primero revisa la energía disponible.')
    const spokenVersion = useGameStore.getState().novaSpeechVersion
    useGameStore.getState().hideNovaSpeech()
    useGameStore.getState().repeatNovaLine()
    expect(useGameStore.getState()).toMatchObject({
      novaLine: '¡Hola! Primero revisa la energía disponible.',
      novaSpeechVisible: true,
      novaSpeechVersion: spokenVersion + 1,
    })
  })

  it('keeps the astronaut at the construction site until the sol closes', () => {
    const initial = createInitialGame()
    const plot = marsPlots.find((item) => item.id === 'B1')!
    useGameStore.setState({ game: { ...initial, mapPosition: { x: plot.x, y: plot.y } } })
    expect(useGameStore.getState().dispatch({ type: 'build', building: 'greenhouse', plotId: 'B1' })).toBe(true)
    const workPosition = useGameStore.getState().game?.mapPosition
    useGameStore.getState().moveAstronaut('right')
    useGameStore.getState().setAstronautPosition(plot.x + 500, plot.y)
    expect(useGameStore.getState().game?.mapPosition).toEqual(workPosition)
  })

  it('keeps the astronaut sheltered at the habitat until the sol closes', () => {
    const initial = createInitialGame()
    const habitat = marsPlots.find((plot) => plot.id === 'A1')!
    useGameStore.setState({ game: { ...initial, sol: 6, mapPosition: { x: habitat.x, y: habitat.y }, events: [{ id: 'solar-sol-6', kind: 'solar', sol: 6, resolved: false }] } })
    expect(useGameStore.getState().dispatch({ type: 'resolveSolar', choice: 'shelter' })).toBe(true)
    useGameStore.getState().moveAstronaut('right')
    useGameStore.getState().setAstronautPosition(habitat.x + 500, habitat.y)
    expect(useGameStore.getState().game?.mapPosition).toEqual({ x: habitat.x, y: habitat.y })
    expect(useGameStore.getState().game?.crewTask).toBe('shelter')
  })

  it('announces and logs a missed solar shelter deadline', () => {
    const initial = createInitialGame()
    useGameStore.setState({ game: { ...initial, sol: 6, events: [{ id: 'solar-sol-6', kind: 'solar', sol: 6, resolved: false }] } })
    expect(useGameStore.getState().dispatch({ type: 'missSolarDeadline' })).toBe(true)
    expect(useGameStore.getState().game?.log.at(-1)?.action).toBe('No llegar a tiempo al refugio solar')
    expect(useGameStore.getState().novaLine).toContain('subió 60 puntos')
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
