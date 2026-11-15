export type AppScreen = 'mission' | 'map' | 'objectives' | 'science'
export type PlotKind = 'available' | 'occupied' | 'obstacle' | 'landing-zone'
export interface MarsPlot { id: string; label: string; kind: PlotKind; x: number; y: number; description: string }
