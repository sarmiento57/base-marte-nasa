import type { WorldPosition } from '../../engine/types'

export function isWithinInteractionRange(from: WorldPosition, target: WorldPosition, range: number): boolean {
  const dx = from.x - target.x
  const dy = from.y - target.y
  return dx * dx + dy * dy <= range * range
}

export function moveToward(from: WorldPosition, target: WorldPosition, distance: number): WorldPosition {
  const dx = target.x - from.x
  const dy = target.y - from.y
  const remaining = Math.hypot(dx, dy)
  if (remaining === 0 || distance <= 0) return from
  if (remaining <= distance) return target
  const ratio = distance / remaining
  return { x: from.x + dx * ratio, y: from.y + dy * ratio }
}

export type MovementDirection = 'up' | 'down' | 'left' | 'right'

// Keys are matched in lowercase so arrows ("ArrowUp" -> "arrowup") and WASD with Caps Lock both work.
const movementKeys: Record<string, MovementDirection> = {
  arrowup: 'up', w: 'up',
  arrowdown: 'down', s: 'down',
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
}

export function directionForKey(key: string): MovementDirection | undefined {
  return movementKeys[key.toLowerCase()]
}
