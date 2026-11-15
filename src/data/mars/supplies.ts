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
  { id: 'battery-ridge', name: 'Backup battery', description: 'A spare battery the crew left by the trail.', position: { x: 1200, y: 820 }, resource: 'energy', amount: 20 },
  { id: 'water-cargo', name: 'Water container', description: 'A sealed container for the colony reserves.', position: { x: 2090, y: 1760 }, resource: 'water', amount: 20 },
  { id: 'ration-crate', name: 'Ration box', description: 'Packed meals for the crew.', position: { x: 3220, y: 1060 }, resource: 'food', amount: 18 },
  { id: 'spare-kit', name: 'Spare parts kit', description: 'Parts that fit the base equipment.', position: { x: 4010, y: 2380 }, resource: 'spareParts', amount: 3 },
  { id: 'seed-case', name: 'Seed case', description: 'Seeds saved for the greenhouse.', position: { x: 1650, y: 2680 }, resource: 'seeds', amount: 2 },
]
