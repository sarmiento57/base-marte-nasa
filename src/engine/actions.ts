import { marsPlots } from '../data/mars/plots'
import { supplySites } from '../data/mars/supplies'
import { MARS_WORLD } from '../data/mars/world'
import { isWithinInteractionRange } from '../data/mars/movement'
import { advanceSol } from './advanceSol'
import { BUILDING_COST, BUILDING_EFFECT, BUILDING_LIMIT, RESOURCE_CAPACITY, GAME_CONFIG } from './config'
import { hasUnresolvedEvent, pendingEvent } from './events'
import type { ActionResult, DecisionLog, GameCommand, GameState, ResourceName } from './types'

function reject(state: GameState, reason: string): ActionResult {
  return { ok: false, state, reason }
}

function accept(state: GameState): ActionResult {
  return { ok: true, state }
}

function record(state: GameState, entry: Omit<DecisionLog, 'sol'>): GameState {
  return { ...state, log: [...state.log, { ...entry, sol: state.sol }] }
}

function requireActiveSol(state: GameState): string | undefined {
  if (state.gameOver) return 'The mission is already over.'
  if (hasUnresolvedEvent(state)) return 'Resolve the alert before continuing.'
  return undefined
}

function resourceCost(state: GameState, cost: Partial<Record<ResourceName, number>>): string | undefined {
  const labels: Record<ResourceName, string> = { energy: 'energy', water: 'water', food: 'food', spareParts: 'spare parts', seeds: 'seeds' }
  for (const [resource, value] of Object.entries(cost) as [ResourceName, number][]) {
    if (state.resources[resource] < value) return `Not enough ${labels[resource]}.`
  }
  return undefined
}

function workPosition(state: GameState, plotId: string): GameState['mapPosition'] {
  const plot = marsPlots.find((item) => item.id === plotId)
  return plot ? { x: plot.x, y: Math.min(MARS_WORLD.height, plot.y + 110) } : state.mapPosition
}

function build(state: GameState, command: Extract<GameCommand, { type: 'build' }>): ActionResult {
  const inactive = requireActiveSol(state)
  if (inactive) return reject(state, inactive)
  if (state.crewBusy) return reject(state, 'The crew is busy this sol.')
  const plot = marsPlots.find((item) => item.id === command.plotId)
  if (!plot || plot.kind !== 'available') return reject(state, 'Choose an available plot to build on.')
  if (state.buildings.some((building) => building.plotId === command.plotId)) return reject(state, 'That plot is already taken.')
  if (!isWithinInteractionRange(state.mapPosition, plot, MARS_WORLD.interactionRange)) return reject(state, 'Walk to the selected plot to build.')
  const count = state.buildings.filter((building) => building.type === command.building).length
  if (count >= BUILDING_LIMIT[command.building]) return reject(state, command.building === 'solar' ? 'You already built the second solar panel.' : 'The greenhouse is already built.')
  const cost = BUILDING_COST[command.building]
  const shortage = resourceCost(state, cost)
  if (shortage) return reject(state, shortage)
  const resources = { ...state.resources }
  for (const [resource, amount] of Object.entries(cost) as [ResourceName, number][]) resources[resource] -= amount
  const name = command.building === 'solar' ? 'solar panel' : 'greenhouse'
  const next = {
    ...state,
    resources,
    crewBusy: true,
    crewTask: 'build' as const,
    buildings: [...state.buildings, { id: `${command.building}-${state.sol}-${command.plotId}`, type: command.building, plotId: command.plotId, operational: true }],
    mapPosition: workPosition(state, command.plotId),
  }
  return accept(record(next, {
    action: `Build ${name}`,
    cost: '−2 spare parts',
    consequence: BUILDING_EFFECT[command.building],
    resourceDeltas: { spareParts: -2 },
    kind: 'action',
  }))
}

function sow(state: GameState): ActionResult {
  const inactive = requireActiveSol(state)
  if (inactive) return reject(state, inactive)
  if (state.crewBusy) return reject(state, 'The crew is busy this sol.')
  const greenhouse = state.buildings.find((building) => building.type === 'greenhouse')
  if (!greenhouse) return reject(state, 'Build the greenhouse before planting.')
  const greenhousePlot = marsPlots.find((plot) => plot.id === greenhouse.plotId)
  if (!greenhousePlot || !isWithinInteractionRange(state.mapPosition, greenhousePlot, MARS_WORLD.interactionRange)) return reject(state, 'Walk to the greenhouse to plant.')
  if (state.crop.active || state.crop.harvested) return reject(state, 'This game allows only one crop.')
  const shortage = resourceCost(state, GAME_CONFIG.sowCost)
  if (shortage) return reject(state, shortage)
  const resources = { ...state.resources, energy: state.resources.energy - 25, water: state.resources.water - 10, seeds: state.resources.seeds - 1 }
  const next = { ...state, resources, crop: { ...state.crop, active: true }, crewBusy: true, crewTask: 'sow' as const }
  return accept(record(next, {
    action: 'Plant the first crop',
    cost: '−25 energy, −10 water and −1 seed',
    consequence: 'The crop started at 0 % growth and does not make food yet.',
    resourceDeltas: { energy: -25, water: -10, seeds: -1 },
    kind: 'action',
  }))
}

function harvest(state: GameState): ActionResult {
  const inactive = requireActiveSol(state)
  if (inactive) return reject(state, inactive)
  if (state.crewBusy) return reject(state, 'The crew is busy this sol.')
  if (!state.crop.active || state.crop.growth < GAME_CONFIG.cropHarvestGrowth) return reject(state, 'The crop is not ready to harvest yet.')
  if (state.crop.harvested) return reject(state, 'This crop was already harvested.')
  const greenhouse = state.buildings.find((building) => building.type === 'greenhouse')
  const greenhousePlot = greenhouse ? marsPlots.find((plot) => plot.id === greenhouse.plotId) : undefined
  if (!greenhousePlot || !isWithinInteractionRange(state.mapPosition, greenhousePlot, MARS_WORLD.interactionRange)) return reject(state, 'Walk to the greenhouse to harvest.')
  if (state.crop.health < GAME_CONFIG.cropHealthFloor) {
    const next = { ...state, crop: { ...state.crop, harvested: true }, crewBusy: true, crewTask: 'harvest' as const }
    return accept(record(next, { action: 'Harvest lost', cost: '', consequence: 'Crop health fell below 50; no food could be harvested.', resourceDeltas: {}, kind: 'action' }))
  }
  const yieldAmount = state.crop.health >= GAME_CONFIG.cropFullYieldHealth ? GAME_CONFIG.cropFullYield : GAME_CONFIG.cropReducedYield
  const food = Math.min(RESOURCE_CAPACITY.food ?? 100, state.resources.food + yieldAmount)
  const harvested = food - state.resources.food
  const next = {
    ...state,
    resources: { ...state.resources, food },
    crop: { ...state.crop, harvested: true },
    crewBusy: true,
    crewTask: 'harvest' as const,
    foodHarvested: state.foodHarvested + harvested,
  }
  return accept(record(next, {
    action: 'Harvest food',
    cost: '',
    consequence: `The colony gained ${harvested} food with crop health at ${state.crop.health}.`,
    resourceDeltas: { food: harvested },
    kind: 'action',
  }))
}

function setMode(state: GameState, mode: 'normal' | 'saving' | 'off'): ActionResult {
  const inactive = requireActiveSol(state)
  if (inactive) return reject(state, inactive)
  if (!state.crop.active || state.crop.harvested || state.crop.growth >= GAME_CONFIG.cropHarvestGrowth) return reject(state, 'There is no active crop to change.')
  if (state.crop.mode === mode) return reject(state, 'The crop is already in that mode.')
  const next = { ...state, crop: { ...state.crop, mode } }
  return accept(record(next, {
    action: `Switch crop to ${mode === 'normal' ? 'normal mode' : mode === 'saving' ? 'saving mode' : 'off mode'}`,
    cost: '',
    consequence: mode === 'normal' ? 'The crop will use its normal pace and consumption.' : mode === 'saving' ? 'The crop will grow more slowly and use fewer resources.' : 'The crop will not grow while it is off.',
    resourceDeltas: {},
    kind: 'action',
  }))
}

function accelerateCrop(state: GameState): ActionResult {
  const inactive = requireActiveSol(state)
  if (inactive) return reject(state, inactive)
  if (!state.crop.active || state.crop.harvested || state.crop.growth >= GAME_CONFIG.cropHarvestGrowth) return reject(state, 'There is no active crop to boost.')
  if (state.cropBoostedSol === state.sol) return reject(state, 'You already used the crop boost this sol.')
  const shortage = resourceCost(state, { energy: GAME_CONFIG.cropBoost.energy })
  if (shortage) return reject(state, 'There is not enough energy for the greenhouse boost.')
  const growth = Math.min(GAME_CONFIG.cropHarvestGrowth, state.crop.growth + GAME_CONFIG.cropBoost.growth)
  const next = {
    ...state,
    resources: { ...state.resources, energy: state.resources.energy - GAME_CONFIG.cropBoost.energy },
    crop: { ...state.crop, growth },
    cropBoostedSol: state.sol,
  }
  return accept(record(next, {
    action: 'Boost crop growth',
    cost: `−${GAME_CONFIG.cropBoost.energy} energy`,
    consequence: `The greenhouse lights added ${growth - state.crop.growth} growth points.`,
    resourceDeltas: { energy: -GAME_CONFIG.cropBoost.energy },
    kind: 'action',
  }))
}

function collectSupply(state: GameState, siteId: string): ActionResult {
  const inactive = requireActiveSol(state)
  if (inactive) return reject(state, inactive)
  if (state.crewBusy) return reject(state, 'The crew already did a task this sol.')
  const site = supplySites.find((item) => item.id === siteId)
  if (!site) return reject(state, 'That supply is not on the map.')
  const collected = state.collectedSupplyIds ?? []
  if (collected.includes(site.id)) return reject(state, 'The crew already collected this supply.')
  if (!isWithinInteractionRange(state.mapPosition, site.position, MARS_WORLD.interactionRange)) return reject(state, 'Walk to the supply to collect it.')
  const capacity = RESOURCE_CAPACITY[site.resource]
  const available = state.resources[site.resource]
  const amount = Math.max(0, Math.min(site.amount, capacity === undefined ? site.amount : capacity - available))
  if (amount === 0) return reject(state, 'There is no room to store more of this supply.')

  const next: GameState = {
    ...state,
    resources: { ...state.resources, [site.resource]: available + amount },
    collectedSupplyIds: [...collected, site.id],
    crewBusy: true,
    crewTask: 'collect',
  }
  const label = { energy: 'energy', water: 'water', food: 'food', spareParts: 'spare parts', seeds: 'seeds' }[site.resource]
  return accept(record(next, {
    action: `Collect ${site.name.toLowerCase()}`,
    cost: '',
    consequence: `The colony received ${amount} ${label}.`,
    resourceDeltas: { [site.resource]: amount },
    kind: 'action',
  }))
}

function advanceGame(state: GameState, fastForward: boolean): ActionResult {
  if (state.gameOver || state.sol > state.maxSols) return reject(state, 'The mission is already over.')
  if (hasUnresolvedEvent(state)) return reject(state, 'Resolve the alert before advancing.')
  if (fastForward && state.resources.energy < GAME_CONFIG.fastForwardEnergyCost) return reject(state, `You need ${GAME_CONFIG.fastForwardEnergyCost} energy to advance now. Wait for the sol to end on its own.`)

  const prepared = fastForward
    ? record({ ...state, resources: { ...state.resources, energy: state.resources.energy - GAME_CONFIG.fastForwardEnergyCost } }, {
      action: 'Advance a sol early',
      cost: `−${GAME_CONFIG.fastForwardEnergyCost} energy`,
      consequence: 'The crew used energy to close the sol early.',
      resourceDeltas: { energy: -GAME_CONFIG.fastForwardEnergyCost },
      kind: 'action',
    })
    : state
  return accept(advanceSol(prepared))
}

function resolveDust(state: GameState, choice: 'saving' | 'normal'): ActionResult {
  const event = pendingEvent(state)
  if (state.gameOver) return reject(state, 'The mission is already over.')
  if (!event || event.kind !== 'dust') return reject(state, 'There is no pending storm.')
  const events = state.events.map((item) => item.id === event.id ? { ...item, resolved: true, optionId: choice } : item)
  const next = { ...state, events, crop: { ...state.crop, mode: choice } }
  return accept(record(next, {
    action: choice === 'saving' ? 'Choose to save during the storm' : 'Choose to stay in normal mode',
    cost: '',
    consequence: choice === 'saving' ? 'The crop uses less and grows more slowly during the storm.' : 'The crop keeps its normal growth and uses more resources.',
    resourceDeltas: {},
    kind: 'action',
  }))
}

function resolveSolar(state: GameState, choice: 'shelter' | 'continue', missedDeadline = false): ActionResult {
  const event = pendingEvent(state)
  if (state.gameOver) return reject(state, 'The mission is already over.')
  if (!event || event.kind !== 'solar') return reject(state, 'There is no pending solar alert.')
  if (choice === 'shelter' && state.resources.energy < GAME_CONFIG.shelterCost) return reject(state, 'You did not save enough energy for the shelter.')
  if (choice === 'shelter' && state.crewBusy) return reject(state, 'The crew is already busy this sol.')
  const habitat = state.buildings.find((building) => building.type === 'habitat')
  const habitatPlot = habitat ? marsPlots.find((plot) => plot.id === habitat.plotId) : undefined
  if (choice === 'shelter' && (!habitatPlot || !isWithinInteractionRange(state.mapPosition, habitatPlot, MARS_WORLD.interactionRange))) return reject(state, 'Walk to the habitat ship door to take shelter.')
  const events = state.events.map((item) => item.id === event.id ? { ...item, resolved: true, optionId: choice } : item)
  const sheltered = choice === 'shelter'
  const next = {
    ...state,
    events,
    resources: sheltered ? { ...state.resources, energy: state.resources.energy - GAME_CONFIG.shelterCost } : state.resources,
    educationalRisk: sheltered ? state.educationalRisk : Math.min(100, state.educationalRisk + GAME_CONFIG.exposureOnSolarContinue),
    crewBusy: sheltered || state.crewBusy,
    crewTask: sheltered ? 'shelter' as const : state.crewTask,
    shelterUsed: sheltered || state.shelterUsed,
  }
  return accept(record(next, {
    action: sheltered ? 'Shelter the crew in the ship' : missedDeadline ? 'Did not reach the solar shelter in time' : 'Keep working during the solar alert',
    cost: sheltered ? '−6 energy' : 'No immediate energy cost; +60 exposure level',
    consequence: sheltered ? 'The crew entered the ship and is protected this sol; the crop keeps growing if it has resources.' : missedDeadline ? 'The shelter window closed before you arrived. The exposure level rose 60 points.' : 'The exposure level rose 60 points.',
    resourceDeltas: sheltered ? { energy: -6 } : {},
    kind: 'action',
  }))
}

export function dispatchGameCommand(state: GameState, command: GameCommand): ActionResult {
  if (command.type === 'advance') return advanceGame(state, true)
  if (command.type === 'advanceTimed') return advanceGame(state, false)
  if (command.type === 'build') return build(state, command)
  if (command.type === 'sow') return sow(state)
  if (command.type === 'harvest') return harvest(state)
  if (command.type === 'setMode') return setMode(state, command.mode)
  if (command.type === 'accelerateCrop') return accelerateCrop(state)
  if (command.type === 'resolveDust') return resolveDust(state, command.choice)
  if (command.type === 'missSolarDeadline') return resolveSolar(state, 'continue', true)
  if (command.type === 'collectSupply') return collectSupply(state, command.siteId)
  return resolveSolar(state, command.choice)
}
