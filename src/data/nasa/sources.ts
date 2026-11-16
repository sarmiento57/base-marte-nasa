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
  { id: 'donki-event', title: 'Historical DONKI record · X1.2 flare', url: 'https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/36210/-1', kind: 'donki', verification: 'verified', checkedOn: '2026-11-14' },
  { id: 'donki-api', title: 'DONKI · official NASA CCMC API', url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/', kind: 'donki', verification: 'verified', checkedOn: '2026-11-14' },
  { id: 'nasa-open-apis', title: 'NASA Open APIs', url: 'https://api.nasa.gov/', kind: 'nasa', verification: 'verified', checkedOn: '2026-11-16' },
  { id: 'donki-gst-cme', title: 'DONKI GST and CME · space weather, last 30 days', url: 'https://api.nasa.gov/DONKI/GST', kind: 'donki', verification: 'verified', checkedOn: '2026-11-16' },
  { id: 'insight-weather', title: 'InSight Mars Weather Service · archived 2020', url: 'https://api.nasa.gov/insight_weather/', kind: 'nasa', verification: 'verified', checkedOn: '2026-11-16' },
]
