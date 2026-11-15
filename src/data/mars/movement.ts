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
