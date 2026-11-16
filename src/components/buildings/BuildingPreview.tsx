import { Car, Construction, Droplets, Leaf, Radio, Shield, ShieldAlert, Timer } from 'lucide-react'
import { BUILDING_EFFECT, BUILDING_LIMIT, BUILDING_COST } from '../../engine/config'
import { pendingEvent } from '../../engine/events'
import type { BuildableType, BuildingType, GameState, WorldPosition } from '../../engine/types'
import { isWithinInteractionRange } from '../../data/mars/movement'
import { marsPlots } from '../../data/mars/plots'
import { MARS_WORLD } from '../../data/mars/world'

export function BuildingPreview({ game, selectedPlotId, playerPosition, onBuild }: { game: GameState; selectedPlotId: string | null; playerPosition: WorldPosition; onBuild: (building: BuildableType, plotId: string) => void }) {
  const selectedPlot = selectedPlotId ? selectedPlotId : null
  const selectedLocation = selectedPlotId ? marsPlots.find((plot) => plot.id === selectedPlotId) : undefined
  const plotAvailable = Boolean(selectedLocation?.kind === 'available' && !game.buildings.some((building) => building.plotId === selectedPlotId))
  const nearSelectedPlot = Boolean(selectedLocation && isWithinInteractionRange(playerPosition, selectedLocation, MARS_WORLD.interactionRange))
  const plotReady = plotAvailable && nearSelectedPlot
  const activeEvent = pendingEvent(game)
  const count = (type: BuildingType) => game.buildings.filter((building) => building.type === type).length
  // Counts include the starting solar panel, so the limit shown matches what the engine allows.
  const options: { type: BuildableType; name: string; description: string; icon: typeof Leaf }[] = [
    { type: 'greenhouse', name: '🌱 Greenhouse', description: BUILDING_EFFECT.greenhouse, icon: Leaf },
    { type: 'garage', name: '🚙 Rover garage', description: BUILDING_EFFECT.garage, icon: Car },
    { type: 'water', name: '💧 Water extractor', description: BUILDING_EFFECT.water, icon: Droplets },
    { type: 'bunker', name: '🛡️ Storm bunker', description: BUILDING_EFFECT.bunker, icon: Shield },
    { type: 'solar', name: '☀️ Second solar panel', description: BUILDING_EFFECT.solar, icon: Radio },
  ]
  return <section aria-labelledby="construction-title" className="rounded-[1.5rem] border-2 border-white bg-[#fff5e2] p-4 shadow-[0_8px_20px_#513a5a20] sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#94645d]">Colony workshop</p><h2 id="construction-title" className="mt-1 text-lg font-black text-[#332f52]">Build</h2></div><span className="grid size-10 place-items-center rounded-2xl bg-[#f4dfb8] text-[#78504c]"><Construction size={19}/></span></div>
    <p className="mt-2 rounded-xl bg-[#f2e2cc] px-3 py-2 text-xs font-semibold leading-5 text-[#655560]">{!selectedPlot ? 'Walk to a free plot and tap it to choose where to build.' : !plotAvailable ? `${selectedLocation?.label ?? selectedPlot} is not free to build on.` : !nearSelectedPlot ? `Plot ${selectedPlot} is far away. Walk closer to build.` : `You are next to ${selectedPlot}. Choose what to build.`}</p>
    <p className="mt-2 flex items-start gap-2 rounded-xl border border-[#e5c887] bg-[#fff0c9] px-3 py-2 text-[10px] font-bold leading-4 text-[#72532c]"><Timer size={15} className="mt-0.5 shrink-0"/><span>Building takes the rest of this sol. Sleep in the habitat to finish faster!</span></p>
    {activeEvent && <p className="mt-2 rounded-xl border border-[#e39b83] bg-[#ffe7df] px-3 py-2 text-[11px] font-bold text-[#7c3737]">Resolve the active alert before starting a new build.</p>}
    <div className="mt-3 grid gap-2">
      {options.map(({ type, name, description, icon: Icon }) => {
        const owned = count(type)
        const partsCost = BUILDING_COST[type].spareParts ?? 0
        const exhausted = owned >= BUILDING_LIMIT[type]
        const available = !exhausted && plotReady && !game.crewBusy && !activeEvent && !game.gameOver && game.resources.spareParts >= partsCost
        return <article key={type} className="rounded-2xl border border-[#e8d3bb] bg-white/90 p-3">
          <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e3efdb] text-[#54794d]"><Icon size={18}/></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-black text-[#39324f]">{name}</h3><span className="text-[10px] font-extrabold text-[#86747a]">{owned}/{BUILDING_LIMIT[type]}</span></div><p className="mt-1 text-[11px] leading-4 text-[#685d65]">{description}</p></div></div>
          <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] font-black text-[#80564f]">{`Cost: ${partsCost} 🔩 spare parts`}</span><button type="button" disabled={!available} onClick={() => selectedPlot && onBuild(type, selectedPlot)} className="min-h-10 rounded-xl bg-[#d56d4f] px-3 text-[11px] font-black text-white hover:bg-[#ba553f] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#7c4b51] disabled:cursor-not-allowed disabled:bg-[#bdb1ac]">{exhausted ? 'Limit reached' : 'Preview'}</button></div>
          {!exhausted && !selectedPlot && <p className="mt-1 text-[10px] font-semibold text-[#8c7473]">Choose a free plot first.</p>}
          {!exhausted && selectedPlot && plotAvailable && !nearSelectedPlot && <p className="mt-1 text-[10px] font-semibold text-[#8c7473]">Get closer with the arrow keys, WASD or the direction pad.</p>}
          {!exhausted && game.crewBusy && <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#92683a]"><ShieldAlert size={12}/> The crew is already busy this sol.</p>}
        </article>
      })}
    </div>
  </section>
}
