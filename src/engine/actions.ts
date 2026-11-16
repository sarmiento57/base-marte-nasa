import { marsPlots } from '../data/mars/plots'
import { supplySites } from '../data/mars/supplies'
import { MARS_WORLD } from '../data/mars/world'
import { isWithinInteractionRange } from '../data/mars/movement'
import { advanceSol } from './advanceSol'
import { BUILDING_COST, BUILDING_EFFECT, BUILDING_LABEL, BUILDING_LIMIT, RESOURCE_CAPACITY, GAME_CONFIG, SHELTER_COST, TRAVEL_COST } from './config'
import { hasUnresolvedEvent, pendingEvent } from './events'
import { safeZoneById, safeZoneInRange } from './safeZones'
import type { ActionResult, Crop, DecisionLog, GameCommand, GameState, LifeResource, ResourceName, TravelMode } from './types'

const LIFE_RESOURCES: readonly LifeResource[] = ['energy', 'water', 'food']
const RESOURCE_WORD: Record<ResourceName, string> = { energy: 'energy', water: 'water', food: 'food', spareParts: 'spare parts', seeds: 'seeds' }

export function freshCrop(harvested = false): Crop {
  return { active: false, growth: 0, health: GAME_CONFIG.cropInitialHealth, mode: 'normal', consecutiveOffSols: 0, harvested }
}

/**
 * Marks the life-support resources that are at zero. The mission does not end right away:
 * the player gets an alert with a countdown to refill them (see `expireEmergency`).
 */
export function refreshEmergency(state: GameState): GameState {
  if (state.gameOver) return state
  const empty = LIFE_RESOURCES.filter((resource) => state.resources[resource] <= 0)
  if (empty.length) {
    const same = state.emergency && state.emergency.length === empty.length && state.emergency.every((resource) => empty.includes(resource))
    return {
      ...state,
      emergency: same ? state.emergency : empty,
      lifeSupport: 'critical',
      lifeSupportReason: `${empty.map((resource) => RESOURCE_WORD[resource]).join(' and ')} ran out! Refill before the alert ends.`.replace(/^./, (letter) => letter.toUpperCase()),
    }
  }
  if (!state.emergency) return state
  return { ...state, emergency: undefined, lifeSupport: 'risk', lifeSupportReason: 'Life support is back online. Keep your reserves up!' }
}

function movementLocked(state: GameState): boolean {
  // Only a solar shelter keeps the astronaut inside; while the crew builds, the player can keep exploring.
  return state.crewBusy && state.crewTask === 'shelter'
}

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
  if (count >= BUILDING_LIMIT[command.building]) return reject(state, command.building === 'solar' ? 'You already built the second solar panel.' : `The ${BUILDING_LABEL[command.building].toLowerCase()} is already built.`)
  const cost = BUILDING_COST[command.building]
  const shortage = resourceCost(state, cost)
  if (shortage) return reject(state, shortage)
  const resources = { ...state.resources }
  for (const [resource, amount] of Object.entries(cost) as [ResourceName, number][]) resources[resource] -= amount
  const name = BUILDING_LABEL[command.building].toLowerCase()
  const costText = (Object.entries(cost) as [ResourceName, number][]).map(([resource, amount]) => `−${amount} ${RESOURCE_WORD[resource]}`).join(', ')
  const costDeltas = Object.fromEntries((Object.entries(cost) as [ResourceName, number][]).map(([resource, amount]) => [resource, -amount]))
  const next = {
    ...state,
    resources,
    crewBusy: true,
    crewTask: 'build' as const,
    buildings: [...state.buildings, { id: `${command.building}-${state.sol}-${command.plotId}`, type: command.building, plotId: command.plotId, operational: true }],
    mapPosition: workPosition(state, command.plotId),
    rover: command.building === 'garage' ? { position: { x: plot.x + 150, y: plot.y + 60 }, riding: false } : state.rover,
  }
  return accept(record(next, {
    action: `Build ${name}`,
    cost: costText,
    consequence: BUILDING_EFFECT[command.building],
    resourceDeltas: costDeltas,
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
  if (state.crop.active) return reject(state, 'A crop is already growing in the greenhouse.')
  const shortage = resourceCost(state, GAME_CONFIG.sowCost)
  if (shortage) return reject(state, shortage)
  const resources = { ...state.resources, energy: state.resources.energy - 25, water: state.resources.water - 10, seeds: state.resources.seeds - 1 }
  const next = { ...state, resources, crop: { ...freshCrop(), active: true }, crewBusy: true, crewTask: 'sow' as const }
  return accept(record(next, {
    action: (state.harvests ?? 0) > 0 ? 'Plant a new crop' : 'Plant the first crop',
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
  if (state.crop.harvested && !state.crop.active) return reject(state, 'This crop was already harvested.')
  const greenhouse = state.buildings.find((building) => building.type === 'greenhouse')
  const greenhousePlot = greenhouse ? marsPlots.find((plot) => plot.id === greenhouse.plotId) : undefined
  if (!greenhousePlot || !isWithinInteractionRange(state.mapPosition, greenhousePlot, MARS_WORLD.interactionRange)) return reject(state, 'Walk to the greenhouse to harvest.')
  if (state.crop.health < GAME_CONFIG.cropHealthFloor) {
    const next = { ...state, crop: freshCrop(true), crewBusy: true, crewTask: 'harvest' as const }
    return accept(record(next, { action: 'Harvest lost', cost: '', consequence: 'Crop health fell below 50; no food could be harvested.', resourceDeltas: {}, kind: 'action' }))
  }
  const yieldAmount = state.crop.health >= GAME_CONFIG.cropFullYieldHealth ? GAME_CONFIG.cropFullYield : GAME_CONFIG.cropReducedYield
  const food = Math.min(RESOURCE_CAPACITY.food ?? 100, state.resources.food + yieldAmount)
  const harvested = food - state.resources.food
  const next = {
    ...state,
    resources: { ...state.resources, food },
    crop: freshCrop(true),
    crewBusy: true,
    crewTask: 'harvest' as const,
    foodHarvested: state.foodHarvested + harvested,
    harvests: (state.harvests ?? 0) + 1,
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

export function supplyReadyOnSol(state: GameState, siteId: string): number {
  return state.supplyReadySol?.[siteId] ?? 1
}

function collectSupply(state: GameState, siteId: string): ActionResult {
  const inactive = state.gameOver ? 'The mission is already over.' : undefined
  if (inactive) return reject(state, inactive)
  if (movementLocked(state)) return reject(state, 'The crew cannot leave right now.')
  const site = supplySites.find((item) => item.id === siteId)
  if (!site) return reject(state, 'That supply is not on the map.')
  const readySol = supplyReadyOnSol(state, site.id)
  if (readySol > state.sol) return reject(state, `This spot is empty. It refills on sol ${readySol}.`)
  if (!isWithinInteractionRange(state.mapPosition, site.position, MARS_WORLD.interactionRange)) return reject(state, 'Walk to the supply to collect it.')
  const capacity = RESOURCE_CAPACITY[site.resource]
  const available = state.resources[site.resource]
  const amount = Math.max(0, Math.min(site.amount, capacity === undefined ? site.amount : capacity - available))
  if (amount === 0) return reject(state, `Your ${RESOURCE_WORD[site.resource]} storage is full. Use some first!`)

  const next: GameState = {
    ...state,
    resources: { ...state.resources, [site.resource]: available + amount },
    supplyReadySol: { ...state.supplyReadySol, [site.id]: state.sol + site.refillSols },
    suppliesCollected: (state.suppliesCollected ?? 0) + 1,
  }
  return accept(record(next, {
    action: `Collect ${site.name.toLowerCase()}`,
    cost: '',
    consequence: `The colony received ${amount} ${RESOURCE_WORD[site.resource]}. This spot refills on sol ${state.sol + site.refillSols}.`,
    resourceDeltas: { [site.resource]: amount },
    kind: 'action',
  }))
}

/** Walking and driving use a little of the life-support reserves. Not logged: it happens all the time. */
function travel(state: GameState, distance: number, mode: TravelMode): ActionResult {
  if (state.gameOver || !(distance > 0)) return accept(state)
  const costs = TRAVEL_COST[mode]
  const carried = { ...(state.travel ?? { energy: 0, water: 0, food: 0 }) }
  const resources = { ...state.resources }
  for (const resource of LIFE_RESOURCES) {
    const unitsPerPoint = costs[resource]
    if (!unitsPerPoint) continue
    carried[resource] += distance
    const points = Math.floor(carried[resource] / unitsPerPoint)
    if (points > 0) {
      carried[resource] -= points * unitsPerPoint
      resources[resource] = Math.max(0, resources[resource] - points)
    }
  }
  return accept({ ...state, resources, travel: carried })
}

function toggleRover(state: GameState): ActionResult {
  if (state.gameOver) return reject(state, 'The mission is already over.')
  if (!state.buildings.some((building) => building.type === 'garage') || !state.rover) return reject(state, 'Build the rover garage first.')
  if (state.rover.riding) return accept({ ...state, rover: { position: state.mapPosition, riding: false } })
  if (movementLocked(state)) return reject(state, 'The crew cannot leave right now.')
  if (!isWithinInteractionRange(state.mapPosition, state.rover.position, MARS_WORLD.interactionRange)) return reject(state, 'Walk to the rover to get on.')
  return accept({ ...state, rover: { position: state.rover.position, riding: true }, mapPosition: state.rover.position })
}

function sleep(state: GameState): ActionResult {
  if (state.gameOver) return reject(state, 'The mission is already over.')
  if (hasUnresolvedEvent(state)) return reject(state, 'Resolve the alert before sleeping.')
  if (state.emergency?.length) return reject(state, 'You cannot sleep while life support is empty. Refill it first!')
  const sheltered = state.crewTask === 'shelter'
  const zone = safeZoneInRange(state, state.mapPosition)
  if (!sheltered && zone?.id !== 'habitat') return reject(state, 'Go back to the habitat to sleep.')
  const rested = record(state, {
    action: 'Sleep until morning',
    cost: '',
    consequence: 'The crew rested and the next sol began. Life support still used its daily share.',
    resourceDeltas: {},
    kind: 'action',
  })
  return advanceGame(rested, false)
}

function expireEmergency(state: GameState): ActionResult {
  if (state.gameOver) return reject(state, 'The mission is already over.')
  const refreshed = refreshEmergency(state)
  if (!refreshed.emergency?.length) return accept(refreshed)
  const ended = record({ ...refreshed, gameOver: true, won: false, endReason: 'lifeSupport' as const }, {
    action: 'Life support stopped',
    cost: '',
    consequence: `The colony could not refill its ${refreshed.emergency.map((resource) => RESOURCE_WORD[resource]).join(' and ')} in time.`,
    resourceDeltas: {},
    kind: 'turn',
  })
  return accept(ended)
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

function resolveSolar(state: GameState, choice: 'shelter' | 'continue', missedDeadline = false, zoneId?: 'habitat' | 'bunker' | 'cave'): ActionResult {
  const event = pendingEvent(state)
  if (state.gameOver) return reject(state, 'The mission is already over.')
  if (!event || event.kind !== 'solar') return reject(state, 'There is no pending solar alert.')
  const zone = choice === 'shelter' ? (zoneId ? safeZoneById(state, zoneId) : safeZoneInRange(state, state.mapPosition)) : undefined
  if (choice === 'shelter' && (!zone || !isWithinInteractionRange(state.mapPosition, zone.position, MARS_WORLD.interactionRange))) return reject(state, 'Walk to a safe zone to take shelter: the habitat, the lava tube cave or a storm bunker.')
  const cost = zone ? SHELTER_COST[zone.id] : 0
  if (choice === 'shelter' && state.resources.energy < cost) return reject(state, `You need ${cost} energy to close the door of the ${zone!.name.toLowerCase()}. Try another safe zone!`)
  if (choice === 'shelter' && state.crewBusy && state.crewTask !== 'collect' && state.crewTask !== 'build') return reject(state, 'The crew is already busy this sol.')
  const events = state.events.map((item) => item.id === event.id ? { ...item, resolved: true, optionId: choice } : item)
  const sheltered = choice === 'shelter'
  const next: GameState = {
    ...state,
    events,
    resources: sheltered ? { ...state.resources, energy: state.resources.energy - cost } : state.resources,
    educationalRisk: sheltered ? state.educationalRisk : Math.min(100, state.educationalRisk + GAME_CONFIG.exposureOnSolarContinue),
    crewBusy: sheltered || state.crewBusy,
    crewTask: sheltered ? 'shelter' : state.crewTask,
    shelterUsed: sheltered || state.shelterUsed,
    shelterZone: sheltered ? zone!.id : state.shelterZone,
    mapPosition: sheltered ? zone!.position : state.mapPosition,
    rover: sheltered && state.rover?.riding ? { position: zone!.position, riding: false } : state.rover,
  }
  return accept(record(next, {
    action: sheltered ? `Shelter in the ${zone!.name.toLowerCase()}` : missedDeadline ? 'Did not reach the solar shelter in time' : 'Keep working during the solar alert',
    cost: sheltered ? (cost ? `−${cost} energy` : 'Free: natural shelter') : 'No immediate energy cost; +60 exposure level',
    consequence: sheltered ? `The crew is protected in the ${zone!.name.toLowerCase()} this sol; the crop keeps growing if it has resources.` : missedDeadline ? 'The shelter window closed before you arrived. The exposure level rose 60 points.' : 'The exposure level rose 60 points.',
    resourceDeltas: sheltered && cost ? { energy: -cost } : {},
    kind: 'action',
  }))
}

function route(state: GameState, command: GameCommand): ActionResult {
  switch (command.type) {
    case 'advance': return advanceGame(state, true)
    case 'advanceTimed': return advanceGame(state, false)
    case 'build': return build(state, command)
    case 'sow': return sow(state)
    case 'harvest': return harvest(state)
    case 'setMode': return setMode(state, command.mode)
    case 'accelerateCrop': return accelerateCrop(state)
    case 'resolveDust': return resolveDust(state, command.choice)
    case 'missSolarDeadline': return resolveSolar(state, 'continue', true)
    case 'collectSupply': return collectSupply(state, command.siteId)
    case 'sleep': return sleep(state)
    case 'travel': return travel(state, command.distance, command.mode)
    case 'toggleRover': return toggleRover(state)
    case 'expireEmergency': return expireEmergency(state)
    case 'resolveSolar': return resolveSolar(state, command.choice, false, command.zone)
  }
}

export function dispatchGameCommand(state: GameState, command: GameCommand): ActionResult {
  const result = route(state, command)
  return result.ok ? { ...result, state: refreshEmergency(result.state) } : result
}
