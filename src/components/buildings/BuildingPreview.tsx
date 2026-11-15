import { Construction, Leaf, Radio, ShieldAlert } from 'lucide-react'
import { BUILDING_EFFECT, BUILDING_LIMIT, BUILDING_COST } from '../../engine/config'
import { isWithinInteractionRange } from '../../data/mars/movement'
import { marsPlots } from '../../data/mars/plots'
import { MARS_WORLD } from '../../data/mars/world'
import type { BuildingType, GameState, WorldPosition } from '../../engine/types'

export function BuildingPreview({ game, selectedPlotId, playerPosition, onBuild }: { game: GameState; selectedPlotId: string | null; playerPosition: WorldPosition; onBuild: (building: 'solar' | 'greenhouse', plotId: string) => void }) {
  const selectedPlot = selectedPlotId ? selectedPlotId : null
  const selectedLocation = selectedPlotId ? marsPlots.find((plot) => plot.id === selectedPlotId) : undefined
  const plotAvailable = Boolean(selectedLocation?.kind === 'available' && !game.buildings.some((building) => building.plotId === selectedPlotId))
  const nearSelectedPlot = Boolean(selectedLocation && isWithinInteractionRange(playerPosition, selectedLocation, MARS_WORLD.interactionRange))
  const plotReady = plotAvailable && nearSelectedPlot
  const count = (type: BuildingType) => game.buildings.filter((building) => building.type === type).length
  const options = [
    { type: 'greenhouse' as const, name: 'Invernadero', description: BUILDING_EFFECT.greenhouse, icon: Leaf, owned: count('greenhouse') },
    { type: 'solar' as const, name: 'Segundo panel', description: BUILDING_EFFECT.solar, icon: Radio, owned: Math.max(0, count('solar') - 1) },
  ]
  return <section aria-labelledby="construction-title" className="rounded-[1.5rem] border-2 border-white bg-[#fff5e2] p-4 shadow-[0_8px_20px_#513a5a20] sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#94645d]">Taller de la colonia</p><h2 id="construction-title" className="mt-1 text-lg font-black text-[#332f52]">Construir</h2></div><span className="grid size-10 place-items-center rounded-2xl bg-[#f4dfb8] text-[#78504c]"><Construction size={19}/></span></div>
    <p className="mt-2 rounded-xl bg-[#f2e2cc] px-3 py-2 text-xs font-semibold leading-5 text-[#655560]">{!selectedPlot ? 'Camina hasta una parcela libre y tócala para elegir dónde construir.' : !plotAvailable ? `${selectedLocation?.label ?? selectedPlot} no está libre para construir.` : !nearSelectedPlot ? `La parcela ${selectedPlot} queda lejos. Camina hasta acercarte para construir.` : `Estás junto a ${selectedPlot}. Elige qué quieres construir.`} Cada obra ocupa a la tripulación por este sol.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      {options.map(({ type, name, description, icon: Icon, owned }) => {
        const exhausted = owned >= BUILDING_LIMIT[type]
        const available = !exhausted && plotReady && !game.crewBusy && game.resources.spareParts >= BUILDING_COST[type].spareParts!
        return <article key={type} className="rounded-2xl border border-[#e8d3bb] bg-white/90 p-3">
          <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e3efdb] text-[#54794d]"><Icon size={18}/></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-black text-[#39324f]">{name}</h3><span className="text-[10px] font-extrabold text-[#86747a]">{owned}/{BUILDING_LIMIT[type]}</span></div><p className="mt-1 text-[11px] leading-4 text-[#685d65]">{description}</p></div></div>
          <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] font-black text-[#80564f]">Costo: 2 repuestos</span><button type="button" disabled={!available} onClick={() => selectedPlot && onBuild(type, selectedPlot)} className="min-h-10 rounded-xl bg-[#d56d4f] px-3 text-[11px] font-black text-white hover:bg-[#ba553f] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#7c4b51] disabled:cursor-not-allowed disabled:bg-[#bdb1ac]">{exhausted ? 'Límite usado' : 'Vista previa'}</button></div>
          {!exhausted && !selectedPlot && <p className="mt-1 text-[10px] font-semibold text-[#8c7473]">Elige primero una parcela libre.</p>}
          {!exhausted && selectedPlot && plotAvailable && !nearSelectedPlot && <p className="mt-1 text-[10px] font-semibold text-[#8c7473]">Acércate con las flechas, WASD o mantén el pad móvil.</p>}
          {!exhausted && game.crewBusy && <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#92683a]"><ShieldAlert size={12}/> La tripulación ya está ocupada este sol.</p>}
        </article>
      })}
    </div>
  </section>
}
