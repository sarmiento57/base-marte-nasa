import type { SafeZoneId, WorldPosition } from '../../engine/types'
import { marsPlots } from './plots'

// Terrain features drawn on the map. The same numbers are used for collisions,
// so what the player sees is what blocks or slows the astronaut.
export interface Crater { x: number; y: number; size: number }
export interface RockField { x: number; y: number }
export interface Dune { x: number; y: number; size: number }

export const craters: readonly Crater[] = [
  { x: 2650, y: 430, size: 260 }, { x: 220, y: 1270, size: 180 }, { x: 2930, y: 1600, size: 210 }, { x: 1650, y: 370, size: 145 },
  { x: 4200, y: 780, size: 340 }, { x: 4050, y: 2520, size: 250 }, { x: 680, y: 2730, size: 240 },
]

export const rockFields: readonly RockField[] = [
  { x: 270, y: 650 }, { x: 2050, y: 570 }, { x: 1280, y: 1510 }, { x: 3030, y: 1020 }, { x: 3720, y: 1990 }, { x: 820, y: 2160 }, { x: 4510, y: 1320 },
]

export const dunes: readonly Dune[] = [
  { x: 2370, y: 1160, size: 280 }, { x: 1000, y: 340, size: 230 }, { x: 3480, y: 850, size: 340 }, { x: 2200, y: 2700, size: 310 }, { x: 4550, y: 1990, size: 280 },
]

interface Ellipse { cx: number; cy: number; rx: number; ry: number }

function insideEllipse(point: WorldPosition, shape: Ellipse): boolean {
  const dx = (point.x - shape.cx) / shape.rx
  const dy = (point.y - shape.cy) / shape.ry
  return dx * dx + dy * dy <= 1
}

/** Crater rims and boulders the astronaut and the rover cannot cross. */
export const blockedAreas: readonly Ellipse[] = [
  ...craters.map(({ x, y, size }) => ({ cx: x, cy: y - size * 0.07, rx: size * 0.85, ry: size * 0.36 })),
  ...rockFields.flatMap(({ x, y }) => [
    { cx: x + 75, cy: y + 45, rx: 75, ry: 70 },
    { cx: x + 225, cy: y + 162, rx: 62, ry: 55 },
    { cx: x - 40, cy: y + 200, rx: 66, ry: 60 },
  ]),
]

/** Soft sand: walking and driving are half as fast here. */
export const slowAreas: readonly Ellipse[] = dunes.map(({ x, y, size }) => ({ cx: x - size * 0.29, cy: y + size * 0.05, rx: size * 0.71, ry: size * 0.4 }))

export function isBlocked(point: WorldPosition): boolean {
  return blockedAreas.some((area) => insideEllipse(point, area))
}

export function terrainSpeedFactor(point: WorldPosition): number {
  return slowAreas.some((area) => insideEllipse(point, area)) ? 0.5 : 1
}

/**
 * Moves from `from` toward `to` without entering blocked terrain. If the straight step is blocked,
 * it slides along one axis, so the astronaut walks around rocks instead of sticking to them.
 */
export function stepAround(from: WorldPosition, to: WorldPosition): WorldPosition {
  if (!isBlocked(to)) return to
  const alongX = { x: to.x, y: from.y }
  if (to.x !== from.x && !isBlocked(alongX)) return alongX
  const alongY = { x: from.x, y: to.y }
  if (to.y !== from.y && !isBlocked(alongY)) return alongY
  return from
}

export interface SafeZone { id: SafeZoneId; name: string; position: WorldPosition; icon: string }

/** A lava tube cave: natural shelter that NASA studies as a possible radiation refuge. Free to enter but far away. */
export const LAVA_CAVE: SafeZone = { id: 'cave', name: 'Lava tube cave', position: { x: 2600, y: 2000 }, icon: '🕳️' }

const habitatPlot = marsPlots.find((plot) => plot.id === 'A1')!
export const HABITAT_ZONE: SafeZone = { id: 'habitat', name: 'Habitat ship', position: { x: habitatPlot.x, y: habitatPlot.y }, icon: '🏠' }
