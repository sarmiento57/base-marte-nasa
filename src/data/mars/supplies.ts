import type { ResourceName, WorldPosition } from '../../engine/types'

export interface SupplySite {
  id: string
  name: string
  description: string
  position: WorldPosition
  resource: ResourceName
  amount: number
}

// Narrative cargo caches placed for the expedition. These are authored game items, not NASA discoveries.
export const supplySites: readonly SupplySite[] = [
  { id: 'battery-ridge', name: 'Batería de respaldo', description: 'Una batería auxiliar que la tripulación dejó junto al sendero.', position: { x: 1200, y: 820 }, resource: 'energy', amount: 20 },
  { id: 'water-cargo', name: 'Contenedor de agua', description: 'Un contenedor sellado para las reservas de la colonia.', position: { x: 2090, y: 1760 }, resource: 'water', amount: 20 },
  { id: 'ration-crate', name: 'Caja de raciones', description: 'Raciones empaquetadas para la tripulación.', position: { x: 3220, y: 1060 }, resource: 'food', amount: 18 },
  { id: 'spare-kit', name: 'Kit de repuestos', description: 'Piezas compatibles con el equipo de la base.', position: { x: 4010, y: 2380 }, resource: 'spareParts', amount: 3 },
  { id: 'seed-case', name: 'Estuche de semillas', description: 'Semillas guardadas para el invernadero.', position: { x: 1650, y: 2680 }, resource: 'seeds', amount: 2 },
]
