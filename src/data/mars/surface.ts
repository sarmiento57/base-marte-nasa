import { MARS_WORLD } from './world'

export interface SurfaceStone {
  id: string
  x: number
  y: number
  radiusX: number
  radiusY: number
  angle: number
  shade: string
}

const stoneShades = ['#62414a', '#76504d', '#503c4c', '#86564b', '#68434a'] as const

export function createSurfaceStones(count = 140): SurfaceStone[] {
  let seed = 0x4d617273
  const nextValue = () => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0
    return seed / 4_294_967_296
  }
  return Array.from({ length: count }, (_, index) => {
    const radiusX = 12 + nextValue() * 27
    return {
      id: `regolith-${index + 1}`,
      x: 70 + nextValue() * (MARS_WORLD.width - 140),
      y: 70 + nextValue() * (MARS_WORLD.height - 140),
      radiusX,
      radiusY: radiusX * (0.38 + nextValue() * 0.36),
      angle: -25 + nextValue() * 50,
      shade: stoneShades[Math.floor(nextValue() * stoneShades.length)],
    }
  })
}

export const surfaceStones = createSurfaceStones()
