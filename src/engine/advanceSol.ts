import { GAME_CONFIG, GREENHOUSE_MODE, RESOURCE_CAPACITY } from './config'
import { evaluateMission } from './evaluateMission'
import { eventForSol } from './events'
import type { DecisionLog, GameState, ResourceName } from './types'

function clampResource(resource: ResourceName, value: number): number {
  const capacity = RESOURCE_CAPACITY[resource]
  return Math.max(0, capacity === undefined ? value : Math.min(capacity, value))
}

function addTurnLog(state: GameState, entry: DecisionLog): GameState {
  return { ...state, log: [...state.log, entry] }
}

export function advanceSol(state: GameState): GameState {
  if (state.gameOver || state.sol > state.maxSols || state.events.some((event) => event.sol === state.sol && !event.resolved)) return state

  const sol = state.sol
  const storm = sol === state.eventSols.dust || sol === state.eventSols.dust + 1
  const solarPanels = state.buildings.filter((building) => building.type === 'solar' && building.operational).length
  const generation = solarPanels === 0 ? 0 : (storm ? GAME_CONFIG.dustGeneration : GAME_CONFIG.solarGeneration) + Math.max(0, solarPanels - 1) * (storm ? GAME_CONFIG.secondSolarDustBonus : GAME_CONFIG.secondSolarBonus)
  const beforeSolar = state.resources.energy
  let working: GameState = {
    ...state,
    resources: { ...state.resources, energy: clampResource('energy', state.resources.energy + generation) },
  }
  const gainedEnergy = working.resources.energy - beforeSolar
  working = addTurnLog(working, {
    sol,
    action: 'Solar power',
    cost: '',
    consequence: storm ? `The panels made ${gainedEnergy} energy during the storm.` : `The panels made ${gainedEnergy} energy.`,
    resourceDeltas: { energy: gainedEnergy },
    kind: 'turn',
  })

  const supportDeltas: Partial<Record<'energy' | 'water' | 'food', number>> = {}
  const missed: string[] = []
  for (const resource of ['energy', 'water', 'food'] as const) {
    const demand = GAME_CONFIG.lifeSupport[resource]
    const available = working.resources[resource]
    const covered = available >= demand
    const consumed = covered ? demand : available
    supportDeltas[resource] = -consumed
    if (!covered) missed.push(resource)
    working = { ...working, resources: { ...working.resources, [resource]: clampResource(resource, available - consumed) } }
  }
  working = addTurnLog(working, {
    sol,
    action: 'Life support',
    cost: '−10 energy, −2 water and −3 food needed',
    consequence: missed.length ? `Not enough ${missed.map((resource) => ({ energy: 'energy', water: 'water', food: 'food' })[resource]).join(', ')} to cover all of life support.` : 'Life support kept the crew alive.',
    resourceDeltas: supportDeltas,
    kind: 'turn',
  })

  if (working.crop.active && !working.crop.harvested && working.crop.growth < GAME_CONFIG.cropHarvestGrowth) {
    const mode = GREENHOUSE_MODE[working.crop.mode]
    const enoughEnergy = working.resources.energy >= mode.energy
    const enoughWater = working.resources.water >= mode.water
    if (working.crop.mode !== 'off' && enoughEnergy && enoughWater) {
      working = {
        ...working,
        resources: {
          ...working.resources,
          energy: clampResource('energy', working.resources.energy - mode.energy),
          water: clampResource('water', working.resources.water - mode.water),
        },
        crop: { ...working.crop, growth: Math.min(GAME_CONFIG.cropHarvestGrowth, working.crop.growth + mode.growth), consecutiveOffSols: 0 },
      }
      working = addTurnLog(working, {
        sol,
        action: 'Crop growth',
        cost: `−${mode.energy} energy, −${mode.water} water`,
        consequence: `The crop grew ${mode.growth} points and reached ${working.crop.growth} %.`,
        resourceDeltas: { energy: -mode.energy, water: -mode.water },
        kind: 'turn',
      })
    } else {
      const consecutiveOffSols = working.crop.consecutiveOffSols + 1
      const healthLoss = consecutiveOffSols >= 2 ? GAME_CONFIG.cropOffHealthLoss : 0
      working = {
        ...working,
        crop: { ...working.crop, consecutiveOffSols, health: Math.max(0, working.crop.health - healthLoss) },
      }
      const reason = working.crop.mode === 'off' ? 'The mode is off' : !enoughEnergy ? 'Not enough energy' : 'Not enough water'
      working = addTurnLog(working, {
        sol,
        action: 'Crop paused',
        cost: '',
        consequence: `${reason}; the crop did not grow.${healthLoss ? ` It lost ${healthLoss} health from another pause in a row.` : ''}`,
        resourceDeltas: {},
        kind: 'turn',
      })
    }
  }

  const lifeSupport = missed.length
    ? 'critical'
    : working.resources.energy < GAME_CONFIG.energyRiskBelow || working.resources.water < GAME_CONFIG.waterRiskBelow || working.resources.food < GAME_CONFIG.foodRiskBelow
      ? 'risk'
      : 'stable'
  const reason = missed.length
    ? `Life support was missing ${missed.map((resource) => ({ energy: 'energy', water: 'water', food: 'food' })[resource]).join(', ')}.`
    : working.resources.energy < GAME_CONFIG.energyRiskBelow
      ? 'Energy is low after covering what the colony needs.'
      : working.resources.water < GAME_CONFIG.waterRiskBelow
        ? 'Water is low after covering what the colony needs.'
        : working.resources.food < GAME_CONFIG.foodRiskBelow
          ? 'Food is low after covering what the colony needs.'
          : 'Life-support reserves are stable.'
  working = {
    ...working,
    lifeSupport,
    lifeSupportReason: reason,
    crewBusy: false,
    crewTask: undefined,
    solsCompleted: sol,
  }

  const result = evaluateMission(working)
  if (result.gameOver) return result

  const nextSol = sol + 1
  let nextCrop = working.crop
  if (nextSol === state.eventSols.dust + 2 && nextCrop.mode === 'saving') {
    nextCrop = { ...nextCrop, mode: 'normal' }
    working = addTurnLog({ ...working, crop: nextCrop }, {
      sol: nextSol,
      action: 'Storm over',
      cost: '',
      consequence: 'The storm is over; the crop goes back to normal mode automatically.',
      resourceDeltas: {},
      kind: 'turn',
    })
  }
  const nextEvent = eventForSol(nextSol, state.eventSols)
  const next = {
    ...working,
    sol: nextSol,
    crop: nextCrop,
    events: nextEvent ? [...working.events, nextEvent] : working.events,
  }
  return evaluateMission(next)
}
