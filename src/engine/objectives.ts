import { marsPlots } from '../data/mars/plots'
import { supplySites } from '../data/mars/supplies'
import { HABITAT_ZONE } from '../data/mars/terrain'
import { supplyReadyOnSol } from './actions'
import { pendingEvent } from './events'
import { nearestSafeZone } from './safeZones'
import { GAME_CONFIG } from './config'
import type { GameState, LifeResource, ResourceName, WorldPosition } from './types'

export interface Objective {
  id: string
  /** 1-based chapter of the main mission chain (urgent goals keep the current chapter). */
  step: number
  total: number
  icon: string
  title: string
  hint: string
  target?: WorldPosition
  targetLabel?: string
  urgent?: boolean
}

const RESOURCE_WORD: Record<ResourceName, string> = { energy: 'energy', water: 'water', food: 'food', spareParts: 'spare parts', seeds: 'seeds' }
const RESOURCE_ICON: Record<ResourceName, string> = { energy: '⚡', water: '💧', food: '🍞', spareParts: '🔩', seeds: '🌱' }

function distance(a: WorldPosition, b: WorldPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function nearestSupply(state: GameState, resource?: ResourceName) {
  const ready = supplySites.filter((site) => supplyReadyOnSol(state, site.id) <= state.sol && (!resource || site.resource === resource))
  return ready.sort((a, b) => distance(a.position, state.mapPosition) - distance(b.position, state.mapPosition))[0]
}

function nearestFreePlot(state: GameState) {
  return marsPlots
    .filter((plot) => plot.kind === 'available' && !state.buildings.some((building) => building.plotId === plot.id))
    .sort((a, b) => distance(a, state.mapPosition) - distance(b, state.mapPosition))[0]
}

function greenhousePosition(state: GameState): WorldPosition | undefined {
  const greenhouse = state.buildings.find((building) => building.type === 'greenhouse')
  const plot = greenhouse ? marsPlots.find((item) => item.id === greenhouse.plotId) : undefined
  return plot ? { x: plot.x, y: plot.y } : undefined
}

const TOTAL_STEPS = 7

/** Steps of the main mission, in order, with whether each one is already done. */
export function missionSteps(state: GameState): { title: string; done: boolean }[] {
  const has = (type: string) => state.buildings.some((building) => building.type === type)
  const harvested = (state.harvests ?? 0) > 0 || state.foodHarvested > 0
  return [
    { title: 'Collect a supply', done: (state.suppliesCollected ?? 0) > 0 || (state.collectedSupplyIds?.length ?? 0) > 0 },
    { title: 'Build a greenhouse', done: has('greenhouse') },
    { title: 'Plant seeds', done: state.crop.active || harvested },
    { title: 'Build the rover garage', done: has('garage') },
    { title: 'Grow the crop to 100 %', done: harvested || state.crop.growth >= GAME_CONFIG.cropHarvestGrowth },
    { title: 'Harvest the food', done: harvested },
    { title: `Keep the colony safe until sol ${state.maxSols}`, done: state.gameOver && state.won },
  ]
}

/** The one thing the player should do now, with a map target for the guide arrow. */
export function currentObjective(state: GameState): Objective | undefined {
  if (state.gameOver) return undefined
  const steps = missionSteps(state)
  const step = Math.min(TOTAL_STEPS, steps.findIndex((item) => !item.done) + 1 || TOTAL_STEPS)
  const base = { step, total: TOTAL_STEPS }

  if (state.emergency?.length) {
    const resource: LifeResource = state.emergency[0]
    const supply = nearestSupply(state, resource)
    return { ...base, id: 'emergency', urgent: true, icon: '🚨', title: `Refill your ${RESOURCE_WORD[resource]}!`, hint: supply ? `Life support is empty. Grab the ${supply.name.toLowerCase()} before the timer ends!` : 'Life support is empty. Find any supply that refills it!', target: supply?.position, targetLabel: supply?.name }
  }
  const event = pendingEvent(state)
  if (event?.kind === 'solar') {
    const zone = nearestSafeZone(state, state.mapPosition)
    return { ...base, id: 'solar', urgent: true, icon: '☀️', title: 'Run to a safe zone!', hint: `Solar storm! The closest shelter is the ${zone.name.toLowerCase()}. Get inside before time runs out.`, target: zone.position, targetLabel: zone.name }
  }
  if (event?.kind === 'dust') return { ...base, id: 'dust', urgent: true, icon: '🌪️', title: 'Choose a plan for the dust storm', hint: 'Dust is blocking the sunlight. Pick how the greenhouse should work.' }
  if (state.crewBusy && state.crewTask === 'build') return { ...base, id: 'building', icon: '🛠️', title: 'Building in progress…', hint: 'The crew finishes when the sol ends. Sleep in the habitat to make time pass faster.', target: HABITAT_ZONE.position, targetLabel: 'Habitat' }
  if (state.crewBusy && state.crewTask === 'shelter') return { ...base, id: 'sheltered', icon: '🛡️', title: 'Safe! Wait for the storm to pass', hint: 'Sleep until morning to skip the rest of this sol.' }

  const hasGreenhouse = state.buildings.some((building) => building.type === 'greenhouse')
  const hasGarage = state.buildings.some((building) => building.type === 'garage')
  const harvested = (state.harvests ?? 0) > 0 || state.foodHarvested > 0
  const collected = (state.suppliesCollected ?? 0) > 0 || (state.collectedSupplyIds?.length ?? 0) > 0
  const greenhouse = greenhousePosition(state)
  const plot = nearestFreePlot(state)

  // Harvest and post-harvest survival never get blocked by skipped optional steps (supplies or rover garage).
  if (harvested) {
    return { ...base, step: TOTAL_STEPS, id: 'survive', icon: '🏁', title: `Keep the colony safe until sol ${state.maxSols}`, hint: 'Keep energy, water and food up. A water extractor or a storm bunker can help!', target: HABITAT_ZONE.position, targetLabel: 'Habitat' }
  }
  if (state.crop.active && !state.crop.harvested && state.crop.growth >= GAME_CONFIG.cropHarvestGrowth) {
    if (state.crewBusy) {
      return { ...base, step: 6, id: 'grow', icon: '⏳', title: 'Crop ready tomorrow!', hint: 'The crew finished working for today. Sleep in the habitat to harvest next sol.', target: HABITAT_ZONE.position, targetLabel: 'Habitat' }
    }
    return { ...base, step: 6, id: 'harvest', icon: '🧺', title: 'Harvest the food', hint: 'The crop is ready! Walk to the greenhouse and harvest it.', target: greenhouse, targetLabel: 'Greenhouse' }
  }
  if (state.crop.active && !state.crop.harvested) {
    if (!hasGarage && !state.crewBusy && state.resources.spareParts >= 2) {
      return { ...base, step: 4, id: 'garage', icon: '🚙', title: 'Build the rover garage', hint: 'A rover drives twice as fast. Build the garage on a free plot.', target: plot ? { x: plot.x, y: plot.y } : undefined, targetLabel: plot?.label }
    }
    return { ...base, step: 5, id: 'grow', icon: '⏳', title: `Grow the crop to 100 % (now ${state.crop.growth} %)`, hint: 'Crops grow when a sol ends. Keep water and energy up, or sleep in the habitat to make time pass.', target: HABITAT_ZONE.position, targetLabel: 'Habitat' }
  }
  if (hasGreenhouse) {
    if (state.crewBusy) {
      return { ...base, step: 3, id: 'grow', icon: '⏳', title: 'Crew busy this sol', hint: 'Sleep in the habitat so the crew is free to plant next sol.', target: HABITAT_ZONE.position, targetLabel: 'Habitat' }
    }
    if (state.resources.seeds < 1) {
      const seeds = nearestSupply(state, 'seeds')
      return { ...base, step: 3, id: 'seeds', icon: RESOURCE_ICON.seeds, title: 'Find seeds', hint: 'You need a seed to plant. Look for a seed case.', target: seeds?.position, targetLabel: seeds?.name }
    }
    return { ...base, step: 3, id: 'sow', icon: '🌱', title: 'Plant seeds', hint: 'Walk to the greenhouse, open Crop and press Plant.', target: greenhouse, targetLabel: 'Greenhouse' }
  }
  if (collected) {
    if (state.resources.spareParts < 2) {
      const parts = nearestSupply(state, 'spareParts')
      return { ...base, step: 2, id: 'parts', icon: RESOURCE_ICON.spareParts, title: 'Find spare parts', hint: 'You need 2 spare parts to build. Grab some!', target: parts?.position, targetLabel: parts?.name }
    }
    return { ...base, step: 2, id: 'greenhouse', icon: '🌱', title: 'Build a greenhouse', hint: 'Walk to a free plot, tap it, open Build and choose Greenhouse.', target: plot ? { x: plot.x, y: plot.y } : undefined, targetLabel: plot?.label }
  }
  const supply = nearestSupply(state)
  return { ...base, step: 1, id: 'collect', icon: '📦', title: 'Collect a supply', hint: 'Walk to the glowing box and press E (or tap it) to collect it.', target: supply?.position, targetLabel: supply?.name }
}
