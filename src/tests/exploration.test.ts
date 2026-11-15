import { describe, expect, it } from 'vitest'
import { isWithinInteractionRange, moveToward } from '../data/mars/movement'
import { dispatchGameCommand } from '../engine/actions'
import { createInitialGame } from '../engine/createInitialGame'

describe('free-roam movement', () => {
  it('requires the astronaut to walk within 180 world units of a plot', () => {
    expect(isWithinInteractionRange({ x: 100, y: 100 }, { x: 280, y: 100 }, 180)).toBe(true)
    expect(isWithinInteractionRange({ x: 100, y: 100 }, { x: 281, y: 100 }, 180)).toBe(false)
  })

  it('moves toward a tapped destination by one step without jumping past it', () => {
    expect(moveToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 36)).toEqual({ x: 36, y: 0 })
    expect(moveToward({ x: 80, y: 0 }, { x: 100, y: 0 }, 36)).toEqual({ x: 100, y: 0 })
  })

  it('blocks construction until the astronaut reaches the selected plot', () => {
    const game = createInitialGame()
    const result = dispatchGameCommand(game, { type: 'build', building: 'greenhouse', plotId: 'B1' })

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Walk to the selected plot')
    expect(result.state.resources.spareParts).toBe(4)
    expect(result.state.buildings).toHaveLength(game.buildings.length)
  })

  it('requires walking back to the greenhouse before sowing or harvesting', () => {
    const initial = createInitialGame()
    const greenhouse = { id: 'greenhouse-1', type: 'greenhouse' as const, plotId: 'B1', operational: true }
    const farGame = { ...initial, buildings: [...initial.buildings, greenhouse] }
    const sow = dispatchGameCommand(farGame, { type: 'sow' })
    const harvest = dispatchGameCommand({ ...farGame, crop: { ...farGame.crop, active: true, growth: 100 } }, { type: 'harvest' })

    expect(sow.ok).toBe(false)
    expect(sow.reason).toContain('Walk to the greenhouse')
    expect(harvest.ok).toBe(false)
    expect(harvest.reason).toContain('Walk to the greenhouse')
    expect(sow.state.resources).toEqual(farGame.resources)
  })
})
