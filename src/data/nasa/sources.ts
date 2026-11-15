export interface ScienceSource {
  id: string
  title: string
  url: string
  kind: 'nasa' | 'donki'
  verification: 'verified'
  checkedOn: string
}

// NASA CCMC DONKI is the primary source; the checked historical payload is archived locally for offline play.
export const nasaSources: ScienceSource[] = [
  { id: 'donki-event', title: 'Registro histórico DONKI · llamarada X1.2', url: 'https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/36210/-1', kind: 'donki', verification: 'verified', checkedOn: '2026-11-14' },
  { id: 'donki-api', title: 'DONKI · API oficial de NASA CCMC', url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/', kind: 'donki', verification: 'verified', checkedOn: '2026-11-14' },
  { id: 'nasa-open-apis', title: 'NASA Open APIs', url: 'https://api.nasa.gov/', kind: 'nasa', verification: 'verified', checkedOn: '2026-11-14' },
]
