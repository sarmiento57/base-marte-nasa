import { CloudSun, RadioTower, Thermometer } from 'lucide-react'
import { COLD_NIGHT_C, SHELTER_WINDOW_SECONDS } from '../../engine/config'
import { useGameStore } from '../../store/useGameStore'

const LEVEL_TEXT = { calm: 'Calm', active: 'Active', storm: 'Stormy' } as const

/** Shows the NASA data the game is using right now and what it changes in the mission. */
export function NasaLivePanel() {
  const nasa = useGameStore((state) => state.nasa)
  const status = useGameStore((state) => state.nasaStatus)
  const weather = nasa.spaceWeather
  const live = nasa.source === 'live'
  const badge = status === 'loading' ? 'Loading from api.nasa.gov…' : live ? `Live · read ${new Date(nasa.fetchedAt).toLocaleString()}` : `Archived snapshot · ${nasa.fetchedAt}${status === 'offline' ? ' (API not reachable)' : ''}`
  return <section aria-labelledby="nasa-live-title" className="space-y-3 p-4 sm:px-6">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="nasa-live-title" className="text-xl font-black text-[#38324f]">📡 NASA data in your mission</h2>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${live ? 'bg-[#dff3e3] text-[#2f6b44]' : 'bg-[#f3e6cf] text-[#7a5a3a]'}`}>{badge}</span>
    </header>
    <div className="grid gap-3 @2xl:grid-cols-2">
      <article className="rounded-2xl border-2 border-[#a9c8ce] bg-white p-4">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.12em] text-[#3f6f7a]"><RadioTower size={14}/> Space weather · DONKI (last 30 days)</p>
        <p className="mt-2 text-2xl font-black text-[#2f2a45]">{LEVEL_TEXT[weather.level]} Sun ☀️</p>
        <ul className="mt-2 space-y-1 text-sm font-semibold text-[#4d4458]">
          <li>🌪️ Solar eruptions (CMEs): <strong>{weather.cmeCount}</strong>{weather.fastestCmeSpeedKmS ? `, fastest ${Math.round(weather.fastestCmeSpeedKmS)} km/s` : ''}</li>
          <li>🧲 Strongest geomagnetic storm: <strong>{weather.strongestStorm ? `Kp ${weather.strongestStorm.maxKp} on ${weather.strongestStorm.startTime.slice(0, 10)}` : 'none'}</strong></li>
          <li>💥 Solar flares: <strong>{weather.flareCount === null ? 'list not available (game uses the archived X1.2 flare)' : weather.strongestFlare ? `${weather.flareCount}, strongest ${weather.strongestFlare.classType}` : weather.flareCount}</strong></li>
        </ul>
        <p className="mt-3 rounded-xl bg-[#e1f0f1] px-3 py-2 text-sm font-bold text-[#2f5560]">In the game: you get <strong>{SHELTER_WINDOW_SECONDS[weather.level]} seconds</strong> to reach a safe zone during the solar storm. More solar activity means less time.</p>
        <p className="mt-2 text-xs text-[#6b6170]">Measured near Earth, from {weather.startDate} to {weather.endDate}. Mars is farther from the Sun, but solar storms reach it too.</p>
      </article>
      <article className="rounded-2xl border-2 border-[#e8caa8] bg-[#fff8ee] p-4">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.12em] text-[#936342]"><Thermometer size={14}/> Mars weather · InSight (archived 2020)</p>
        <ol className="mt-2 grid grid-cols-7 gap-1 text-center">
          {nasa.climate.map((day, index) => {
            const cold = day.minC < COLD_NIGHT_C
            return <li key={day.insightSol} className={`rounded-xl px-1 py-2 ${cold ? 'bg-[#cfe3ff] ring-2 ring-[#5b8bd6]' : 'bg-white'}`}>
              <p className="text-[10px] font-black text-[#6b5e6c]">Sol {index + 1}</p>
              <p aria-hidden="true" className="text-lg">{cold ? '🥶' : '🌙'}</p>
              <p className="text-xs font-black text-[#2f2a45]">{Math.round(day.minC)}°</p>
            </li>
          })}
        </ol>
        <p className="mt-3 rounded-xl bg-[#ffe9cc] px-3 py-2 text-sm font-bold text-[#6b4426]"><CloudSun size={14} className="mr-1 inline"/>Nights colder than {COLD_NIGHT_C} °C make the crew eat <strong>1 extra food</strong>. Game sol 1 uses InSight sol {nasa.climate[0]?.insightSol} and the week repeats.</p>
        <p className="mt-2 text-xs text-[#6b6170]">{nasa.climateNote}</p>
      </article>
    </div>
  </section>
}
