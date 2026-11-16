import type { ResourceName, WorldPosition } from '../../engine/types'

export interface SupplySite {
  id: string
  name: string
  description: string
  position: WorldPosition
  resource: ResourceName
  amount: number
  /** Sols until this spot has something to collect again. */
  refillSols: number
  kind: 'crate' | 'ice' | 'cells'
}

// Narrative cargo caches and resource spots placed for the expedition. These are authored game items,
// not NASA discoveries. Each spot refills a few sols after it is collected.
export const supplySites: readonly SupplySite[] = [
  { id: 'battery-ridge', name: 'Backup battery', description: 'A spare battery the crew left by the trail.', position: { x: 1200, y: 820 }, resource: 'energy', amount: 20, refillSols: 3, kind: 'crate' },
  { id: 'water-cargo', name: 'Water container', description: 'A sealed container for the colony reserves.', position: { x: 2090, y: 1760 }, resource: 'water', amount: 20, refillSols: 3, kind: 'crate' },
  { id: 'ration-crate', name: 'Ration box', description: 'Packed meals for the crew.', position: { x: 3220, y: 1060 }, resource: 'food', amount: 18, refillSols: 3, kind: 'crate' },
  { id: 'spare-kit', name: 'Spare parts kit', description: 'Parts that fit the base equipment.', position: { x: 4010, y: 2380 }, resource: 'spareParts', amount: 3, refillSols: 4, kind: 'crate' },
  { id: 'seed-case', name: 'Seed case', description: 'Seeds saved for the greenhouse.', position: { x: 1650, y: 2680 }, resource: 'seeds', amount: 2, refillSols: 3, kind: 'crate' },
  { id: 'ice-north', name: 'Ice deposit', description: 'Frozen water just under the dust. Melt it for the colony.', position: { x: 1900, y: 1000 }, resource: 'water', amount: 12, refillSols: 2, kind: 'ice' },
  { id: 'ice-east', name: 'Ice patch', description: 'A shiny patch of ice near the valley floor.', position: { x: 3600, y: 1500 }, resource: 'water', amount: 12, refillSols: 2, kind: 'ice' },
  { id: 'solar-cells', name: 'Solar cell cache', description: 'Charged battery cells from an old lander.', position: { x: 2700, y: 900 }, resource: 'energy', amount: 12, refillSols: 2, kind: 'cells' },
  { id: 'food-pod', name: 'Food pod', description: 'A small drop of snacks from the supply rocket.', position: { x: 1400, y: 2100 }, resource: 'food', amount: 10, refillSols: 2, kind: 'crate' },
  { id: 'rover-scrap', name: 'Rover scrap', description: 'Useful parts from the stranded rover.', position: { x: 900, y: 1950 }, resource: 'spareParts', amount: 2, refillSols: 3, kind: 'crate' },
]
