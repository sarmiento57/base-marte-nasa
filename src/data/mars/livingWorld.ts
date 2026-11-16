import type { ScenarioId, WorldPosition } from '../../engine/types'
import { MARS_WORLD } from './world'

export interface VisitingAstronaut {
  id: string
  name: string
  role: string
  x: number
  y: number
  suit: string
  visor: string
  dialogue: readonly string[]
}

export const visitingAstronauts: readonly VisitingAstronaut[] = [
  {
    id: 'sofia', name: 'Sofia', role: 'field geologist', x: 800, y: 1090, suit: '#df8456', visor: '#62cad5',
    dialogue: [
      'The sand made a new shape around the rocks. Tomorrow I will compare it with my notes.',
      'Did you see the lights over the valley? NOVA says it might be a ship; we still do not know what it was.',
      'If dust covers the panel, check your energy before closing the sol.',
    ],
  },
  {
    id: 'amir', name: 'Amir', role: 'habitat technician', x: 2480, y: 1320, suit: '#718ab4', visor: '#84e3df',
    dialogue: [
      'The colony feels less lonely when we leave a light on near the path.',
      'The greenhouse works best when we decide how much to save each sol.',
      'I heard a buzz over the crater. The ship already vanished behind the mesa.',
    ],
  },
  {
    id: 'naomi', name: 'Naomi', role: 'rover pilot', x: 3560, y: 2300, suit: '#7eaa72', visor: '#80dfe6',
    dialogue: [
      'I left route markers so nobody gets lost in the dunes.',
      'I found parts next to the old rover. I marked them on the map to check later.',
      'I did not see who was in that ship, but it zoomed away as soon as it flew over us.',
    ],
  },
  {
    id: 'tomas', name: 'Tomas', role: 'communications technician', x: 2900, y: 570, suit: '#bd805e', visor: '#76d9e2',
    dialogue: [
      'The antenna picked up a very short pulse. I saved it to compare with the next sol.',
      'Tap NOVA to hear a tip again, so you never miss advice while exploring.',
      'The footprints leaving camp end near the mesa. Shall we follow the trail?',
    ],
  },
  {
    id: 'yara', name: 'Yara', role: 'signals analyst', x: 4350, y: 1210, suit: '#a875a7', visor: '#79e1dc',
    dialogue: [
      'I wrote down the flashes crossing the sky. I want to see if they come back on another sol.',
      'A ship disappeared behind the edge of the valley; we logged it as a mystery of this adventure.',
      'From here you can see the shape of the crater. The route goes around the tallest boulders.',
    ],
  },
  {
    id: 'mateo', name: 'Mateo', role: 'field mechanic', x: 4300, y: 1960, suit: '#688a9a', visor: '#70dddf',
    dialogue: [
      'I marked a safe route between the rocks so the rover does not hit its wheels.',
      'The parts near the old camp look useful; let us check the inventory before moving them.',
      'When the crew closes the sol, I like to check the path and the habitat.',
    ],
  },
  {
    id: 'lia', name: 'Lia', role: 'crop specialist', x: 1510, y: 2460, suit: '#9a8a54', visor: '#7ee2d9',
    dialogue: [
      'The leaves are doing well in normal mode. Check crop health before harvesting.',
      'A light boost can speed up growth, but first check how much energy is left.',
      'The storm is over and we can check on the greenhouse again.',
    ],
  },
]

/** The visitor's line for this sol, without the name (shown in a bubble over their head). */
export function visitorLine(visitorId: string, sol: number): string {
  const visitor = visitingAstronauts.find((item) => item.id === visitorId)
  if (!visitor) return 'Hello! Stay safe out there.'
  return visitor.dialogue[Math.abs(Math.trunc(sol) - 1) % visitor.dialogue.length]
}

export function getVisitorDialogue(visitorId: string, sol: number): string {
  const visitor = visitingAstronauts.find((item) => item.id === visitorId)
  if (!visitor) return 'The astronaut waves and goes back to checking her gear.'
  const index = Math.abs(Math.trunc(sol) - 1) % visitor.dialogue.length
  return `${visitor.name}: ${visitor.dialogue[index]}`
}

function hashSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export interface AlienFlybySchedule {
  seed: number
  delayMs: number
}

/** How long the ship takes to cross the screen. */
export const ALIEN_FLIGHT_MS = 7_000

/**
 * Fictional UFO sightings (story flavor, not NASA data).
 * Sol 1 always has one shortly after the mission starts so every player sees it;
 * later sols get one about half the time, at a repeatable moment.
 */
export function createAlienFlybySchedule(scenarioId: ScenarioId, sol: number): AlienFlybySchedule | null {
  const seed = hashSeed(`sighting:${scenarioId}:${sol}`)
  if (sol === 1) return { seed, delayMs: 20_000 }
  if (seed % 2 !== 0) return null
  return { seed, delayMs: 15_000 + ((seed >>> 5) % 40_000) }
}

export interface AlienFlightPath {
  from: WorldPosition
  delta: WorldPosition
}

function clamp(value: number, max: number): number {
  return Math.max(90, Math.min(max - 90, value))
}

/**
 * The ship enters from one side of the view, passes close over the astronaut and
 * leaves on the other side, so it stays on screen for most of the flight.
 */
export function createAlienFlightPath(position: WorldPosition, seed: number): AlienFlightPath {
  const startingAngle = ((seed & 0xffff) / 0xffff) * Math.PI * 2
  const buildPath = (angle: number): AlienFlightPath => {
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const from = {
      x: clamp(position.x - dx * 1250, MARS_WORLD.width),
      y: clamp(position.y - 160 - dy * 900, MARS_WORLD.height),
    }
    const to = {
      x: clamp(position.x + dx * 1250, MARS_WORLD.width),
      y: clamp(position.y - 160 + dy * 900, MARS_WORLD.height),
    }
    return { from, delta: { x: to.x - from.x, y: to.y - from.y } }
  }
  const candidates = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((offset) => buildPath(startingAngle + offset))
  return candidates.find((path) => Math.hypot(path.delta.x, path.delta.y) > 1200)
    ?? candidates.reduce((best, path) => Math.hypot(path.delta.x, path.delta.y) > Math.hypot(best.delta.x, best.delta.y) ? path : best)
}
