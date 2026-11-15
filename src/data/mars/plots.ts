import type { MarsPlot } from '../../types/navigation'

// Construction plots in the 4,800 × 3,200 unit world. The marked locations stay separate from free exploration.
export const marsPlots: MarsPlot[] = [
  { id: 'A1', label: 'Parcela A1', kind: 'occupied', x: 830, y: 700, description: 'Hábitat inicial de la tripulación.' },
  { id: 'A2', label: 'Parcela A2', kind: 'occupied', x: 500, y: 630, description: 'Panel solar inicial.' },
  { id: 'A3', label: 'Cráter rocoso', kind: 'obstacle', x: 330, y: 390, description: 'Terreno irregular; no se puede construir aquí.' },
  { id: 'B1', label: 'Parcela B1', kind: 'available', x: 1110, y: 950, description: 'Suelo estable cerca del hábitat.' },
  { id: 'B2', label: 'Zona de aterrizaje', kind: 'landing-zone', x: 1260, y: 640, description: 'Zona de referencia de la colonia.' },
  { id: 'B3', label: 'Parcela B3', kind: 'available', x: 1550, y: 900, description: 'Parcela libre al este del invernadero.' },
  { id: 'C1', label: 'Parcela C1', kind: 'available', x: 1850, y: 1180, description: 'Terreno libre en la zona sur.' },
  { id: 'C2', label: 'Parcela C2', kind: 'available', x: 2150, y: 740, description: 'Terreno libre junto a las dunas.' },
  { id: 'D1', label: 'Parcela D1', kind: 'available', x: 3370, y: 1660, description: 'Suelo firme al otro lado del valle.' },
  { id: 'D2', label: 'Parcela D2', kind: 'available', x: 3970, y: 880, description: 'Llanura amplia junto al cráter del este.' },
  { id: 'E1', label: 'Parcela E1', kind: 'available', x: 3740, y: 2630, description: 'Zona elevada al sur de la antigua estación.' },
]
