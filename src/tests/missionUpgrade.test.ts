import { describe, expect, it } from 'vitest'
import { dispatchGameCommand } from '../engine/actions'
import { createInitialGame } from '../engine/createInitialGame'
import { currentObjective, missionSteps } from '../engine/objectives'
import { nearestSafeZone, safeZones } from '../engine/safeZones'
import { SHELTER_COST, solSecondsFor, SOL_SECONDS } from '../engine/config'
import { marsPlots } from '../data/mars/plots'
import { supplySites } from '../data/mars/supplies'
import { visitingAstronauts } from '../data/mars/livingWorld'
import { isBlocked, LAVA_CAVE, HABITAT_ZONE, stepAround, terrainSpeedFactor } from '../data/mars/terrain'
import { ARCHIVED_CONDITIONS, levelFromKp, readInsight, summarizeSpaceWeather } from '../data/nasa/nasaApi'
import type { GameCommand, GameState } from '../engine/types'

function ok(state: GameState, command: GameCommand): GameState {
  const result = dispatchGameCommand(state, command)
  expect(result.ok, result.reason).toBe(true)
  return result.state
}

function at(state: GameState, plotId: string): GameState {
  const plot = marsPlots.find((item) => item.id === plotId)!
  return { ...state, mapPosition: { x: plot.x, y: plot.y } }
}

describe('mission timing and sleep', () => {
  it('gives each mission its own sol length so a full game lasts about 20 to 28 minutes', () => {
    expect(SOL_SECONDS).toEqual({ standard: 180, 'reserve-rich': 210, 'early-events': 150 })
    for (const id of ['standard', 'reserve-rich', 'early-events'] as const) {
      const minutes = (solSecondsFor(id) * 8) / 60
      expect(minutes).toBeGreaterThanOrEqual(20)
      expect(minutes).toBeLessThanOrEqual(28)
    }
  })

  it('lets the crew sleep only in the habitat, ending the sol without the early fee', () => {
    const start = createInitialGame()
    expect(dispatchGameCommand({ ...start, mapPosition: { x: 3000, y: 2000 } }, { type: 'sleep' }).ok).toBe(false)
    const slept = ok({ ...start, mapPosition: HABITAT_ZONE.position }, { type: 'sleep' })
    expect(slept.sol).toBe(2)
    expect(slept.resources.energy).toBe(start.resources.energy + 18 - 10)
    expect(slept.log.some((entry) => entry.action === 'Sleep until morning')).toBe(true)
  })
})

describe('walking costs and life-support emergencies', () => {
  it('uses energy, water and food on foot but only energy on the rover', () => {
    const start = createInitialGame()
    const walked = ok(start, { type: 'travel', distance: 6000, mode: 'foot' })
    expect(walked.resources).toMatchObject({ energy: start.resources.energy - 3, water: start.resources.water - 1, food: start.resources.food - 1 })
    const drove = ok(start, { type: 'travel', distance: 5000, mode: 'rover' })
    expect(drove.resources).toMatchObject({ energy: start.resources.energy - 2, water: start.resources.water, food: start.resources.food })
  })

  it('starts an emergency when walking empties a reserve, and never goes below zero', () => {
    const start = { ...createInitialGame(), resources: { ...createInitialGame().resources, food: 1 } }
    const hungry = ok(start, { type: 'travel', distance: 20_000, mode: 'foot' })
    expect(hungry.resources.food).toBe(0)
    expect(hungry.emergency).toEqual(['food'])
    expect(hungry.gameOver).toBe(false)
  })
})

describe('crops, supplies and buildings', () => {
  it('lets the colony plant again after a harvest when it has seeds', () => {
    let state = createInitialGame()
    state = ok(at(state, 'B1'), { type: 'build', building: 'greenhouse', plotId: 'B1' })
    state = ok(state, { type: 'advanceTimed' })
    state = { ...at(state, 'B1'), resources: { ...state.resources, seeds: 2, energy: 90, water: 90 }, crop: { ...state.crop, active: true, growth: 100 } }
    state = ok(state, { type: 'harvest' })
    expect(state).toMatchObject({ harvests: 1, crop: { active: false, growth: 0, harvested: true } })
    state = ok({ ...state, crewBusy: false, crewTask: undefined }, { type: 'sow' })
    expect(state.crop).toMatchObject({ active: true, growth: 0, harvested: false })
    expect(state.log.at(-1)?.action).toBe('Plant a new crop')
  })

  it('makes 5 water every sol with the water extractor', () => {
    const state = ok(at(createInitialGame(), 'C1'), { type: 'build', building: 'water', plotId: 'C1' })
    const next = ok(state, { type: 'advanceTimed' })
    expect(next.resources.water).toBe(state.resources.water + 5 - 2)
  })

  it('unlocks a rover in the garage that the astronaut can ride and park', () => {
    let state = ok(at(createInitialGame(), 'B3'), { type: 'build', building: 'garage', plotId: 'B3' })
    expect(state.rover).toMatchObject({ riding: false })
    state = ok({ ...state, crewBusy: false, crewTask: undefined, mapPosition: state.rover!.position }, { type: 'toggleRover' })
    expect(state.rover?.riding).toBe(true)
    state = ok({ ...state, mapPosition: { x: 2000, y: 1300 } }, { type: 'toggleRover' })
    expect(state.rover).toEqual({ riding: false, position: { x: 2000, y: 1300 } })
  })

  it('refuses the rover before the garage exists', () => {
    expect(dispatchGameCommand(createInitialGame(), { type: 'toggleRover' }).ok).toBe(false)
  })
})

describe('solar storm safe zones', () => {
  function solarState(position: { x: number; y: number }, energy = 20): GameState {
    const base = createInitialGame()
    return { ...base, sol: 6, mapPosition: position, resources: { ...base.resources, energy }, events: [{ id: 'solar-sol-6', kind: 'solar', sol: 6, resolved: false }] }
  }

  it('charges 6 energy in the habitat and nothing in the lava tube cave', () => {
    expect(ok(solarState(HABITAT_ZONE.position), { type: 'resolveSolar', choice: 'shelter' }).resources.energy).toBe(20 - SHELTER_COST.habitat)
    const cave = ok(solarState(LAVA_CAVE.position, 0), { type: 'resolveSolar', choice: 'shelter' })
    expect(cave).toMatchObject({ shelterZone: 'cave', crewTask: 'shelter', resources: { energy: 0 } })
  })

  it('adds the storm bunker as a cheaper safe zone once it is built', () => {
    const built = ok(at(createInitialGame(), 'D1'), { type: 'build', building: 'bunker', plotId: 'D1' })
    expect(safeZones(built).map((zone) => zone.id)).toEqual(['habitat', 'cave', 'bunker'])
    expect(nearestSafeZone(built, { x: 3300, y: 1650 }).id).toBe('bunker')
  })
})

describe('NASA data in the game', () => {
  it('adds 1 food on archived InSight nights colder than −97 °C', () => {
    const conditions = { climate: ARCHIVED_CONDITIONS.climate, spaceWeather: 'storm' as const }
    let state = createInitialGame('standard', conditions)
    state = ok(state, { type: 'advanceTimed' })
    state = ok(state, { type: 'advanceTimed' })
    expect(state.resources.food).toBe(22 - 3 - 3)
    state = ok(state, { type: 'resolveDust', choice: 'saving' })
    const cold = ok(state, { type: 'advanceTimed' })
    expect(cold.resources.food).toBe(16 - 4)
    expect(cold.log.some((entry) => entry.action === 'Cold night' && entry.consequence.includes('InSight'))).toBe(true)
  })

  it('reads InSight and DONKI responses into the game summary', () => {
    expect(readInsight({ sol_keys: ['675'], '675': { First_UTC: '2020-10-19T18:32:20Z', AT: { av: -62, mn: -96, mx: -15 } } })).toEqual([{ insightSol: 675, date: '2020-10-19', minC: -96, avgC: -62, maxC: -15 }])
    const summary = summarizeSpaceWeather('2026-10-17', '2026-11-16', [{ startTime: '2026-10-31T18:00Z', link: 'x', allKpIndex: [{ kpIndex: 4 }, { kpIndex: 6 }] }], [{ cmeAnalyses: [{ isMostAccurate: true, speed: 900 }] }], [{ classType: 'M1.2', peakTime: 'a' }, { classType: 'X1.0', peakTime: 'b' }])
    expect(summary).toMatchObject({ cmeCount: 1, fastestCmeSpeedKmS: 900, strongestStorm: { maxKp: 6 }, flareCount: 2, strongestFlare: { classType: 'X1.0' }, level: 'storm' })
    expect([levelFromKp(3), levelFromKp(4.3), levelFromKp(5)]).toEqual(['calm', 'active', 'storm'])
  })
})

describe('terrain and guidance', () => {
  it('keeps every place the player must reach outside rocks and craters', () => {
    const places = [...marsPlots.filter((plot) => plot.kind !== 'obstacle'), ...supplySites.map((site) => site.position), ...visitingAstronauts, LAVA_CAVE.position, HABITAT_ZONE.position, { x: 980, y: 820 }]
    for (const place of places) expect(isBlocked(place), JSON.stringify(place)).toBe(false)
  })

  it('slides around blocked ground and slows down on dunes', () => {
    const crater = { x: 2650, y: 412 }
    expect(isBlocked(crater)).toBe(true)
    expect(stepAround({ x: 2400, y: 412 }, crater)).not.toEqual(crater)
    expect(terrainSpeedFactor({ x: 2289, y: 1174 })).toBe(0.5)
    expect(terrainSpeedFactor({ x: 980, y: 820 })).toBe(1)
  })

  it('guides the player step by step, and urgent alerts take over', () => {
    const start = createInitialGame()
    expect(currentObjective(start)).toMatchObject({ id: 'collect', step: 1, total: 7 })
    expect(currentObjective(start)?.target).toBeDefined()
    const collected = { ...start, suppliesCollected: 1 }
    expect(currentObjective(collected)).toMatchObject({ id: 'greenhouse', step: 2 })
    const solar = { ...collected, sol: 6, events: [{ id: 'solar-sol-6', kind: 'solar' as const, sol: 6, resolved: false }] }
    expect(currentObjective(solar)).toMatchObject({ id: 'solar', urgent: true })
    expect(currentObjective({ ...collected, emergency: ['water'] })).toMatchObject({ id: 'emergency', urgent: true })
    expect(missionSteps(start).every((step) => !step.done)).toBe(true)
  })
})
