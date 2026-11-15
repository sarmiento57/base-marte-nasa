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
    id: 'sofia', name: 'Sofía', role: 'geóloga de campo', x: 800, y: 1090, suit: '#df8456', visor: '#62cad5',
    dialogue: [
      'La arena dibujó otra forma alrededor de las rocas. Mañana la compararé con mis notas.',
      '¿Ya viste las luces sobre el valle? NOVA dice que quizá sea una nave; todavía no sabemos qué fue.',
      'Si el panel recibe polvo, conviene revisar la energía antes de cerrar el sol.',
    ],
  },
  {
    id: 'amir', name: 'Amir', role: 'técnico de hábitat', x: 2480, y: 1320, suit: '#718ab4', visor: '#84e3df',
    dialogue: [
      'La colonia se siente menos aislada cuando dejamos una luz encendida cerca del camino.',
      'El invernadero responde mejor cuando decidimos cuánto queremos ahorrar en cada sol.',
      'Escuché un zumbido sobre el cráter. La nave ya se perdió detrás de la meseta.',
    ],
  },
  {
    id: 'naomi', name: 'Naomi', role: 'pilota del rover', x: 3660, y: 2220, suit: '#7eaa72', visor: '#80dfe6',
    dialogue: [
      'Dejé unas marcas de ruta para que nadie se pierda entre las dunas.',
      'Encontré piezas junto al rover abandonado. Las anoté en el mapa para revisarlas luego.',
      'No vi quién iba en esa nave, pero salió disparada en cuanto pasó sobre nosotros.',
    ],
  },
  {
    id: 'tomas', name: 'Tomás', role: 'técnico de comunicaciones', x: 2900, y: 570, suit: '#bd805e', visor: '#76d9e2',
    dialogue: [
      'La antena recogió un pulso muy breve. Lo guardé para compararlo con el siguiente sol.',
      'Si NOVA repite algo, tócale el casco; así no pierdes el consejo mientras exploras.',
      'Las huellas que salen del campamento terminan cerca de la meseta. ¿Seguimos el rastro?',
    ],
  },
  {
    id: 'yara', name: 'Yara', role: 'analista de señales', x: 4350, y: 1210, suit: '#a875a7', visor: '#79e1dc',
    dialogue: [
      'Anoté los destellos que cruzan el cielo. Quiero ver si vuelven a aparecer en otro sol.',
      'Una nave se perdió detrás del borde del valle; la registramos como un misterio de la aventura.',
      'Desde aquí se distingue el relieve del cráter. La ruta rodea los bloques más altos.',
    ],
  },
  {
    id: 'mateo', name: 'Mateo', role: 'mecánico de campo', x: 4300, y: 1960, suit: '#688a9a', visor: '#70dddf',
    dialogue: [
      'Marqué una ruta segura entre las rocas para que el rover no golpee el tren de ruedas.',
      'Las piezas junto al campamento antiguo parecen útiles; revisemos el inventario antes de moverlas.',
      'Cuando el equipo cierra el sol, me gusta revisar el camino y el estado del hábitat.',
    ],
  },
  {
    id: 'lia', name: 'Lía', role: 'especialista en cultivos', x: 1510, y: 2460, suit: '#9a8a54', visor: '#7ee2d9',
    dialogue: [
      'Las hojas están respondiendo al modo normal. Fíjate en la salud antes de cosechar.',
      'Un impulso de luz puede adelantar el crecimiento, pero mira primero cuánta energía queda.',
      'La tormenta pasó y podemos volver a revisar cómo va el invernadero.',
    ],
  },
]

export function getVisitorDialogue(visitorId: string, sol: number): string {
  const visitor = visitingAstronauts.find((item) => item.id === visitorId)
  if (!visitor) return 'La astronauta saluda y vuelve a revisar su equipo.'
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

export function createAlienFlybySchedule(scenarioId: ScenarioId, sol: number): AlienFlybySchedule | null {
  const seed = hashSeed(`sighting:${scenarioId}:${sol}`)
  if (seed % 3 !== 1) return null
  return { seed, delayMs: 8_000 + ((seed >>> 5) % 22_000) }
}

export interface AlienFlightPath {
  from: WorldPosition
  delta: WorldPosition
}

function clamp(value: number, max: number): number {
  return Math.max(90, Math.min(max - 90, value))
}

export function createAlienFlightPath(position: WorldPosition, seed: number): AlienFlightPath {
  const startingAngle = ((seed & 0xffff) / 0xffff) * Math.PI * 2
  const buildPath = (angle: number): AlienFlightPath => {
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const from = {
      x: clamp(position.x + dx * 420, MARS_WORLD.width),
      y: clamp(position.y + dy * 420, MARS_WORLD.height),
    }
    const to = {
      x: clamp(from.x + dx * 1600, MARS_WORLD.width),
      y: clamp(from.y + dy * 1600, MARS_WORLD.height),
    }
    return { from, delta: { x: to.x - from.x, y: to.y - from.y } }
  }
  const path = buildPath(startingAngle)
  return Math.hypot(path.delta.x, path.delta.y) > 800 ? path : buildPath(startingAngle + Math.PI)
}
