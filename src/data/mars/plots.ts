import type { MarsPlot } from '../../types/navigation'

// Construction plots in the 4,800 × 3,200 unit world. The marked locations stay separate from free exploration.
export const marsPlots: MarsPlot[] = [
  { id: 'A1', label: 'Plot A1', kind: 'occupied', x: 830, y: 700, description: 'First habitat of the crew.' },
  { id: 'A2', label: 'Plot A2', kind: 'occupied', x: 500, y: 630, description: 'Starting solar panel.' },
  { id: 'A3', label: 'Rocky crater', kind: 'obstacle', x: 330, y: 390, description: 'Uneven ground; you cannot build here.' },
  { id: 'B1', label: 'Plot B1', kind: 'available', x: 1110, y: 950, description: 'Solid ground near the habitat.' },
  { id: 'B2', label: 'Landing zone', kind: 'landing-zone', x: 1260, y: 640, description: 'The colony landmark.' },
  { id: 'B3', label: 'Plot B3', kind: 'available', x: 1550, y: 900, description: 'Free plot east of the greenhouse.' },
  { id: 'C1', label: 'Plot C1', kind: 'available', x: 1850, y: 1180, description: 'Free ground in the south.' },
  { id: 'C2', label: 'Plot C2', kind: 'available', x: 2150, y: 740, description: 'Free ground next to the dunes.' },
  { id: 'D1', label: 'Plot D1', kind: 'available', x: 3370, y: 1660, description: 'Firm ground across the valley.' },
  { id: 'D2', label: 'Plot D2', kind: 'available', x: 3970, y: 880, description: 'Wide plain next to the eastern crater.' },
  { id: 'E1', label: 'Plot E1', kind: 'available', x: 3740, y: 2630, description: 'High ground south of the old station.' },
]
