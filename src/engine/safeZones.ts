import { HABITAT_ZONE, LAVA_CAVE, type SafeZone } from '../data/mars/terrain'
import { marsPlots } from '../data/mars/plots'
import { isWithinInteractionRange } from '../data/mars/movement'
import { MARS_WORLD } from '../data/mars/world'
import type { GameState, SafeZoneId, WorldPosition } from './types'

/** Places where the crew can hide from a solar storm: the habitat, the lava tube cave and the bunker if built. */
export function safeZones(state: GameState): SafeZone[] {
  const zones: SafeZone[] = [HABITAT_ZONE, LAVA_CAVE]
  const bunker = state.buildings.find((building) => building.type === 'bunker')
  const plot = bunker ? marsPlots.find((item) => item.id === bunker.plotId) : undefined
  if (plot) zones.push({ id: 'bunker', name: 'Storm bunker', position: { x: plot.x, y: plot.y }, icon: '🛡️' })
  return zones
}

export function safeZoneById(state: GameState, id: SafeZoneId): SafeZone | undefined {
  return safeZones(state).find((zone) => zone.id === id)
}

export function safeZoneInRange(state: GameState, position: WorldPosition): SafeZone | undefined {
  return safeZones(state).find((zone) => isWithinInteractionRange(position, zone.position, MARS_WORLD.interactionRange))
}

export function nearestSafeZone(state: GameState, position: WorldPosition): SafeZone {
  return safeZones(state).reduce((best, zone) => Math.hypot(zone.position.x - position.x, zone.position.y - position.y) < Math.hypot(best.position.x - position.x, best.position.y - position.y) ? zone : best)
}
