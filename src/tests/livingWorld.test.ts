import { describe, expect, it } from 'vitest'
import { createAlienFlightPath, createAlienFlybySchedule, getVisitorDialogue, visitingAstronauts } from '../data/mars/livingWorld'
import { createSurfaceStones } from '../data/mars/surface'

describe('living Mars world', () => {
  it('has several local astronaut visitors with repeatable conversations', () => {
    expect(visitingAstronauts.length).toBeGreaterThanOrEqual(6)
    for (const visitor of visitingAstronauts) {
      expect(getVisitorDialogue(visitor.id, 1)).toBe(getVisitorDialogue(visitor.id, 1))
      expect(getVisitorDialogue(visitor.id, 1).length).toBeGreaterThan(12)
    }
  })

  it('schedules occasional, repeatable fictional alien flybys across mission sols', () => {
    const schedules = Array.from({ length: 8 }, (_, index) => createAlienFlybySchedule('standard', index + 1))
    expect(schedules).toEqual(Array.from({ length: 8 }, (_, index) => createAlienFlybySchedule('standard', index + 1)))
    expect(schedules.filter(Boolean).length).toBeGreaterThan(0)
    expect(schedules.filter(Boolean).length).toBeLessThan(8)
    for (const schedule of schedules) {
      if (schedule) expect(schedule.delayMs).toBeGreaterThanOrEqual(8000)
    }
  })

  it('always shows the alien ship on the first sol of every route', () => {
    for (const scenario of ['standard', 'reserve-rich', 'early-events'] as const) {
      expect(createAlienFlybySchedule(scenario, 1)).not.toBeNull()
    }
  })

  it('keeps an alien ship on a long flight inside the map near map edges', () => {
    const flight = createAlienFlightPath({ x: 0, y: 0 }, 32_767)
    expect(Math.hypot(flight.delta.x, flight.delta.y)).toBeGreaterThan(800)
    expect(flight.from.x).toBeGreaterThan(0)
    expect(flight.from.y).toBeGreaterThan(0)
  })

  it('flies the alien ship across the view, passing close to the astronaut', () => {
    const astronaut = { x: 2400, y: 1600 }
    for (const seed of [1, 9_999, 32_767, 65_535]) {
      const { from, delta } = createAlienFlightPath(astronaut, seed)
      const length = Math.hypot(delta.x, delta.y)
      const t = Math.max(0, Math.min(1, ((astronaut.x - from.x) * delta.x + (astronaut.y - from.y) * delta.y) / (length * length)))
      const closest = Math.hypot(from.x + delta.x * t - astronaut.x, from.y + delta.y * t - astronaut.y)
      expect(length).toBeGreaterThan(1200)
      expect(closest).toBeLessThan(400)
    }
  })

  it('adds a deterministic, detailed regolith scatter across the wide map', () => {
    const stones = createSurfaceStones()
    expect(stones.length).toBeGreaterThanOrEqual(100)
    expect(stones).toEqual(createSurfaceStones())
    expect(stones.every((stone) => stone.x > 0 && stone.x < 4800 && stone.y > 0 && stone.y < 3200)).toBe(true)
  })
})
