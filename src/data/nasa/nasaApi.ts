import insightSnapshot from './insight-weather.json'
import spaceWeatherSnapshot from './space-weather-snapshot.json'
import type { ClimateSol, SpaceWeatherLevel } from '../../engine/types'

const API_ROOT = 'https://api.nasa.gov'
const CACHE_KEY = 'base-marte-nasa-conditions-v1'
const CACHE_HOURS = 6

export interface SpaceWeatherSummary {
  startDate: string
  endDate: string
  cmeCount: number
  fastestCmeSpeedKmS: number | null
  strongestStorm: { startTime: string; maxKp: number; link: string } | null
  /** FLR can be unavailable; null means the flare list could not be read. */
  flareCount: number | null
  strongestFlare: { classType: string; peakTime: string } | null
  level: SpaceWeatherLevel
}

export interface NasaConditions {
  /** live = read from api.nasa.gov now (or cached for a few hours); archived = embedded snapshot. */
  source: 'live' | 'archived'
  fetchedAt: string
  climate: ClimateSol[]
  climateNote: string
  spaceWeather: SpaceWeatherSummary
}

/** Kp is the planetary geomagnetic index: 5 or more is a geomagnetic storm (NOAA G1+). */
export function levelFromKp(maxKp: number | null | undefined): SpaceWeatherLevel {
  if (maxKp === null || maxKp === undefined) return 'calm'
  if (maxKp >= 5) return 'storm'
  if (maxKp >= 4) return 'active'
  return 'calm'
}

export const ARCHIVED_CONDITIONS: NasaConditions = {
  source: 'archived',
  fetchedAt: spaceWeatherSnapshot.fetchedOn,
  climate: insightSnapshot.sols,
  climateNote: insightSnapshot.note,
  spaceWeather: {
    startDate: spaceWeatherSnapshot.startDate,
    endDate: spaceWeatherSnapshot.endDate,
    cmeCount: spaceWeatherSnapshot.cmeCount,
    fastestCmeSpeedKmS: spaceWeatherSnapshot.fastestCme.speedKmS,
    strongestStorm: { startTime: spaceWeatherSnapshot.strongestStorm.startTime, maxKp: spaceWeatherSnapshot.strongestStorm.maxKp, link: spaceWeatherSnapshot.strongestStorm.link },
    flareCount: null,
    strongestFlare: null,
    level: levelFromKp(spaceWeatherSnapshot.strongestStorm.maxKp),
  },
}

function apiKey(): string {
  const key = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_NASA_API_KEY : undefined
  return typeof key === 'string' && key.trim() ? key.trim() : 'DEMO_KEY'
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const separator = path.includes('?') ? '&' : '?'
  const response = await fetch(`${API_ROOT}${path}${separator}api_key=${encodeURIComponent(apiKey())}`, { signal })
  if (!response.ok) throw new Error(`NASA API ${response.status}`)
  return response.json() as Promise<T>
}

interface InsightDay { First_UTC?: string; AT?: { av: number; mn: number; mx: number } }
type InsightResponse = { sol_keys?: string[] } & Record<string, InsightDay | string[] | undefined>
interface GstEvent { startTime: string; link: string; allKpIndex?: { kpIndex: number }[] }
interface CmeEvent { cmeAnalyses?: { isMostAccurate?: boolean; speed?: number | null }[] | null }
interface FlareEvent { classType?: string; peakTime?: string }

function flareRank(classType: string): number {
  const letter = 'ABCMX'.indexOf(classType[0] ?? '')
  return letter * 100 + Number.parseFloat(classType.slice(1) || '0')
}

export function readInsight(response: InsightResponse): ClimateSol[] {
  return (response.sol_keys ?? []).flatMap((key) => {
    const day = response[key] as InsightDay | undefined
    if (!day?.AT) return []
    return [{ insightSol: Number(key), date: (day.First_UTC ?? '').slice(0, 10), minC: day.AT.mn, avgC: day.AT.av, maxC: day.AT.mx }]
  })
}

export function summarizeSpaceWeather(startDate: string, endDate: string, storms: GstEvent[], cmes: CmeEvent[], flares: FlareEvent[] | null): SpaceWeatherSummary {
  const strongest = storms
    .map((storm) => ({ startTime: storm.startTime, link: storm.link, maxKp: Math.max(0, ...(storm.allKpIndex ?? []).map((item) => item.kpIndex)) }))
    .sort((a, b) => b.maxKp - a.maxKp)[0] ?? null
  const speeds = cmes.flatMap((cme) => (cme.cmeAnalyses ?? []).filter((analysis) => analysis.isMostAccurate && analysis.speed).map((analysis) => analysis.speed as number))
  const bestFlare = (flares ?? []).filter((flare) => flare.classType && flare.peakTime).sort((a, b) => flareRank(b.classType!) - flareRank(a.classType!))[0]
  return {
    startDate,
    endDate,
    cmeCount: cmes.length,
    fastestCmeSpeedKmS: speeds.length ? Math.max(...speeds) : null,
    strongestStorm: strongest,
    flareCount: flares ? flares.length : null,
    strongestFlare: bestFlare ? { classType: bestFlare.classType!, peakTime: bestFlare.peakTime! } : null,
    level: levelFromKp(strongest?.maxKp),
  }
}

/** Reads InSight weather and the last 30 days of DONKI space weather. Throws if the core requests fail. */
export async function fetchNasaConditions(now = new Date(), signal?: AbortSignal): Promise<NasaConditions> {
  const endDate = isoDay(now)
  const startDate = isoDay(new Date(now.getTime() - 30 * 86_400_000))
  const range = `startDate=${startDate}&endDate=${endDate}`
  const [insight, storms, cmes, flares] = await Promise.all([
    getJson<InsightResponse>('/insight_weather/?feedtype=json&ver=1.0', signal).catch(() => null),
    getJson<GstEvent[]>(`/DONKI/GST?${range}`, signal),
    getJson<CmeEvent[]>(`/DONKI/CME?${range}`, signal),
    // The FLR endpoint sometimes answers 404; the game then keeps its archived flare.
    getJson<FlareEvent[]>(`/DONKI/FLR?${range}`, signal).catch(() => null),
  ])
  const climate = insight ? readInsight(insight) : []
  return {
    source: 'live',
    fetchedAt: now.toISOString(),
    climate: climate.length ? climate : ARCHIVED_CONDITIONS.climate,
    climateNote: ARCHIVED_CONDITIONS.climateNote,
    spaceWeather: summarizeSpaceWeather(startDate, endDate, storms ?? [], cmes ?? [], flares),
  }
}

export function readCachedConditions(now = Date.now()): NasaConditions | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw) as NasaConditions
    if (cached.source !== 'live' || now - Date.parse(cached.fetchedAt) > CACHE_HOURS * 3_600_000) return null
    return cached
  } catch {
    return null
  }
}

export function cacheConditions(conditions: NasaConditions): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(CACHE_KEY, JSON.stringify(conditions))
  } catch {
    // Storage can be full or blocked; the game works without the cache.
  }
}
