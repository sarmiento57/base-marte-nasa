import { describe, expect, it } from 'vitest'
import { createInitialGame } from '../engine/createInitialGame'
import { dispatchGameCommand } from '../engine/actions'
import { previewDecision } from '../engine/previewDecision'
import { buildMissionReport } from '../engine/buildMissionReport'
import type { GameCommand, GameState } from '../engine/types'
import { marsPlots } from '../data/mars/plots'

function apply(state: GameState, command: GameCommand): GameState {
  let readyState = state
  const targetPlotId = command.type === 'build' ? command.plotId : command.type === 'sow' || command.type === 'harvest' ? state.buildings.find((building) => building.type === 'greenhouse')?.plotId : undefined
  const target = targetPlotId ? marsPlots.find((plot) => plot.id === targetPlotId) : undefined
  if (target) readyState = { ...state, mapPosition: { x: target.x, y: target.y } }
  const result = dispatchGameCommand(readyState, command)
  expect(result.ok, result.reason).toBe(true)
  return result.state
}

function runRoute(route: 'A' | 'B' | 'C' | 'D') {
  let state = createInitialGame()
  if (route !== 'C') state = apply(state, { type: 'build', building: 'greenhouse', plotId: 'B1' })
  state = apply(state, { type: 'advance' })
  if (route !== 'C') state = apply(state, { type: 'sow' })
  state = apply(state, { type: 'advance' })
  state = apply(state, { type: 'resolveDust', choice: route === 'A' ? 'saving' : 'normal' })
  if (route === 'D') state = apply(state, { type: 'build', building: 'solar', plotId: 'C2' })
  state = apply(state, { type: 'advance' })
  state = apply(state, { type: 'advance' })
  state = apply(state, { type: 'advance' })
  state = apply(state, { type: 'resolveSolar', choice: route === 'B' ? 'continue' : 'shelter' })
  state = apply(state, { type: 'advance' })
  if (route === 'A') {
    state = apply(state, { type: 'advance' })
    state = apply(state, { type: 'harvest' })
    state = apply(state, { type: 'advance' })
  } else {
    if (route === 'D' || route === 'B') state = apply(state, { type: 'harvest' })
    state = apply(state, { type: 'advance' })
    state = apply(state, { type: 'advance' })
  }
  return state
}

describe('closed simulation rules', () => {
  it('creates one deterministic eight-sol game with the V3 starting inventory and buildings', () => {
    const state = createInitialGame()
    expect(state).toMatchObject({ sol: 1, maxSols: 8, gameOver: false, resources: { energy: 48, water: 60, food: 22, spareParts: 4, seeds: 1 } })
    expect(state.buildings.map(({ type }) => type)).toEqual(['habitat', 'solar'])
    expect(state).toEqual(createInitialGame())
  })

  it('previews construction without mutation and charges exactly once', () => {
    const initial = createInitialGame()
    const state = { ...initial, mapPosition: { x: 1110, y: 950 } }
    const before = JSON.stringify(state)
    const preview = previewDecision(state, { type: 'build', building: 'greenhouse', plotId: 'B1' })
    expect(preview).toMatchObject({ allowed: true, immediateDeltas: { spareParts: -2 } })
    expect(JSON.stringify(state)).toBe(before)
    const built = apply(state, { type: 'build', building: 'greenhouse', plotId: 'B1' })
    expect(built.resources.spareParts).toBe(2)
    expect(built.crewBusy).toBe(true)
    expect(dispatchGameCommand(built, { type: 'build', building: 'greenhouse', plotId: 'B1' }).ok).toBe(false)
  })

  it('uses the selected rule that one critical support-life closure ends the mission', () => {
    const state = { ...createInitialGame(), buildings: [], resources: { energy: 0, water: 60, food: 22, spareParts: 4, seeds: 1 } }
    const result = dispatchGameCommand(state, { type: 'advance' })
    expect(result.state.gameOver).toBe(true)
    expect(result.state.endReason).toBe('lifeSupport')
  })

  it('reproduces winning route A (storm savings)', () => {
    const state = runRoute('A')
    expect(state).toMatchObject({ sol: 8, gameOver: true, won: true, endReason: 'win', resources: { energy: 15, water: 18, food: 33 }, crop: { growth: 100 } })
    expect(state.solsCompleted).toBe(8)
  })

  it('reproduces winning route D (second solar panel)', () => {
    const state = runRoute('D')
    expect(state).toMatchObject({ sol: 8, gameOver: true, won: true, endReason: 'win', resources: { energy: 43, water: 19, food: 33 }, crop: { growth: 100 } })
  })

  it('reproduces losing route B (crew exposed) and route C (life support)', () => {
    const exposed = runRoute('B')
    const noHarvest = runRoute('C')
    expect(exposed).toMatchObject({ gameOver: true, won: false, endReason: 'crewExposed', educationalRisk: 60 })
    expect(noHarvest).toMatchObject({ gameOver: true, won: false, endReason: 'lifeSupport', lifeSupport: 'critical' })
  })

  it('applies the chosen deterministic event schedule to the early-events scenario', () => {
    let state = createInitialGame('early-events')
    state = apply(state, { type: 'advance' })
    expect(state.sol).toBe(2)
    expect(state.events.at(-1)).toMatchObject({ kind: 'dust', sol: 2, resolved: false })
    state = apply(state, { type: 'resolveDust', choice: 'saving' })
    state = apply(state, { type: 'advance' })
    expect(state.sol).toBe(3)
    expect(state.crop.mode).toBe('saving')
    state = apply(state, { type: 'advance' })
    expect(state.crop.mode).toBe('normal')
  })

  it('reduces crop health after two consecutive off-mode sols', () => {
    let state: GameState = { ...createInitialGame(), buildings: [...createInitialGame().buildings, { id: 'greenhouse-1', type: 'greenhouse', plotId: 'B1', operational: true }], crop: { active: true, growth: 20, health: 100, mode: 'off', consecutiveOffSols: 0, harvested: false } }
    state = apply(state, { type: 'advance' })
    expect(state.crop).toMatchObject({ growth: 20, health: 100, consecutiveOffSols: 1 })
    state = apply(state, { type: 'advance' })
    expect(state.crop).toMatchObject({ growth: 20, health: 75, consecutiveOffSols: 2 })
  })

  it('awards the reduced food yield when a ready crop has lower but harvestable health', () => {
    const initial = createInitialGame()
    const state = { ...initial, mapPosition: { x: 1110, y: 950 }, buildings: [...initial.buildings, { id: 'greenhouse-1', type: 'greenhouse' as const, plotId: 'B1', operational: true }], crop: { active: true, growth: 100, health: 74, mode: 'normal' as const, consecutiveOffSols: 0, harvested: false } }
    const harvested = apply(state, { type: 'harvest' })
    expect(harvested.resources.food).toBe(47)
    expect(harvested.foodHarvested).toBe(25)
  })

  it('builds a causal report from recorded decisions rather than invented actions', () => {
    const state = runRoute('A')
    const report = buildMissionReport(state)
    expect(report).toMatchObject({ result: 'win', solsCompleted: 8, foodHarvested: 35 })
    expect(report.decisions).toEqual(state.log.filter((entry) => entry.kind === 'action').slice(-2))
    expect(report.decisions.length).toBeGreaterThanOrEqual(2)
    expect(report.advice.length).toBeGreaterThan(5)
  })
})
