import { marsPlots } from '../data/mars/plots'
import { supplySites } from '../data/mars/supplies'
import { MARS_WORLD } from '../data/mars/world'
import { isWithinInteractionRange } from '../data/mars/movement'
import { advanceSol } from './advanceSol'
import { BUILDING_COST, BUILDING_EFFECT, BUILDING_LIMIT, RESOURCE_CAPACITY, GAME_CONFIG } from './config'
import { hasUnresolvedEvent, pendingEvent } from './events'
import type { ActionResult, DecisionLog, GameCommand, GameState, ResourceName } from './types'

function reject(state: GameState, reason: string): ActionResult {
  return { ok: false, state, reason }
}

function accept(state: GameState): ActionResult {
  return { ok: true, state }
}

function record(state: GameState, entry: Omit<DecisionLog, 'sol'>): GameState {
  return { ...state, log: [...state.log, { ...entry, sol: state.sol }] }
}

function requireActiveSol(state: GameState): string | undefined {
  if (state.gameOver) return 'La misión ya terminó.'
  if (hasUnresolvedEvent(state)) return 'Resuelve la alerta antes de continuar.'
  return undefined
}

function resourceCost(state: GameState, cost: Partial<Record<ResourceName, number>>): string | undefined {
  const labels: Record<ResourceName, string> = { energy: 'energía', water: 'agua', food: 'comida', spareParts: 'repuestos', seeds: 'semillas' }
  for (const [resource, value] of Object.entries(cost) as [ResourceName, number][]) {
    if (state.resources[resource] < value) return `No hay suficientes ${labels[resource]}.`
  }
  return undefined
}

function workPosition(state: GameState, plotId: string): GameState['mapPosition'] {
  const plot = marsPlots.find((item) => item.id === plotId)
  return plot ? { x: plot.x, y: Math.min(MARS_WORLD.height, plot.y + 110) } : state.mapPosition
}

function build(state: GameState, command: Extract<GameCommand, { type: 'build' }>): ActionResult {
  const inactive = requireActiveSol(state)
  if (inactive) return reject(state, inactive)
  if (state.crewBusy) return reject(state, 'La tripulación está ocupada este sol.')
  const plot = marsPlots.find((item) => item.id === command.plotId)
  if (!plot || plot.kind !== 'available') return reject(state, 'Elige una parcela disponible para construir.')
  if (state.buildings.some((building) => building.plotId === command.plotId)) return reject(state, 'Esa parcela ya está ocupada.')
  if (!isWithinInteractionRange(state.mapPosition, plot, MARS_WORLD.interactionRange)) return reject(state, 'Camina hasta la parcela seleccionada para construir.')
  const count = state.buildings.filter((building) => building.type === command.building).length
  if (count >= BUILDING_LIMIT[command.building]) return reject(state, command.building === 'solar' ? 'Ya construiste el segundo panel solar.' : 'El invernadero ya está construido.')
  const cost = BUILDING_COST[command.building]
  const shortage = resourceCost(state, cost)
  if (shortage) return reject(state, shortage)
  const resources = { ...state.resources }
  for (const [resource, amount] of Object.entries(cost) as [ResourceName, number][]) resources[resource] -= amount
  const name = command.building === 'solar' ? 'panel solar' : 'invernadero'
  const next = {
    ...state,
    resources,
    crewBusy: true,
    crewTask: 'build' as const,
    buildings: [...state.buildings, { id: `${command.building}-${state.sol}-${command.plotId}`, type: command.building, plotId: command.plotId, operational: true }],
    mapPosition: workPosition(state, command.plotId),
  }
  return accept(record(next, {
    action: `Construir ${name}`,
    cost: '−2 repuestos',
    consequence: BUILDING_EFFECT[command.building],
    resourceDeltas: { spareParts: -2 },
    kind: 'action',
  }))
}

function sow(state: GameState): ActionResult {
  const inactive = requireActiveSol(state)
  if (inactive) return reject(state, inactive)
  if (state.crewBusy) return reject(state, 'La tripulación está ocupada este sol.')
  const greenhouse = state.buildings.find((building) => building.type === 'greenhouse')
  if (!greenhouse) return reject(state, 'Construye el invernadero antes de sembrar.')
  const greenhousePlot = marsPlots.find((plot) => plot.id === greenhouse.plotId)
  if (!greenhousePlot || !isWithinInteractionRange(state.mapPosition, greenhousePlot, MARS_WORLD.interactionRange)) return reject(state, 'Camina hasta el invernadero para sembrar.')
  if (state.crop.active || state.crop.harvested) return reject(state, 'Esta partida permite un solo cultivo.')
  const shortage = resourceCost(state, GAME_CONFIG.sowCost)
  if (shortage) return reject(state, shortage)
  const resources = { ...state.resources, energy: state.resources.energy - 25, water: state.resources.water - 10, seeds: state.resources.seeds - 1 }
  const next = { ...state, resources, crop: { ...state.crop, active: true }, crewBusy: true, crewTask: 'sow' as const }
  return accept(record(next, {
    action: 'Sembrar el primer cultivo',
    cost: '−25 energía, −10 agua y −1 semilla',
    consequence: 'El cultivo comenzó con 0 % de crecimiento y todavía no produce comida.',
    resourceDeltas: { energy: -25, water: -10, seeds: -1 },
    kind: 'action',
  }))
}

function harvest(state: GameState): ActionResult {
  const inactive = requireActiveSol(state)
  if (inactive) return reject(state, inactive)
  if (state.crewBusy) return reject(state, 'La tripulación está ocupada este sol.')
  if (!state.crop.active || state.crop.growth < GAME_CONFIG.cropHarvestGrowth) return reject(state, 'El cultivo todavía no está listo para cosechar.')
  if (state.crop.harvested) return reject(state, 'Este cultivo ya se cosechó.')
  const greenhouse = state.buildings.find((building) => building.type === 'greenhouse')
  const greenhousePlot = greenhouse ? marsPlots.find((plot) => plot.id === greenhouse.plotId) : undefined
  if (!greenhousePlot || !isWithinInteractionRange(state.mapPosition, greenhousePlot, MARS_WORLD.interactionRange)) return reject(state, 'Camina hasta el invernadero para cosechar.')
  if (state.crop.health < GAME_CONFIG.cropHealthFloor) {
    const next = { ...state, crop: { ...state.crop, harvested: true }, crewBusy: true, crewTask: 'harvest' as const }
    return accept(record(next, { action: 'Cosecha perdida', cost: '', consequence: 'La salud del cultivo bajó de 50; no se pudo recoger comida.', resourceDeltas: {}, kind: 'action' }))
  }
  const yieldAmount = state.crop.health >= GAME_CONFIG.cropFullYieldHealth ? GAME_CONFIG.cropFullYield : GAME_CONFIG.cropReducedYield
  const food = Math.min(RESOURCE_CAPACITY.food ?? 100, state.resources.food + yieldAmount)
  const harvested = food - state.resources.food
  const next = {
    ...state,
    resources: { ...state.resources, food },
    crop: { ...state.crop, harvested: true },
    crewBusy: true,
    crewTask: 'harvest' as const,
    foodHarvested: state.foodHarvested + harvested,
  }
  return accept(record(next, {
    action: 'Cosechar alimentos',
    cost: '',
    consequence: `La colonia ganó ${harvested} de comida con ${state.crop.health} de salud en el cultivo.`,
    resourceDeltas: { food: harvested },
    kind: 'action',
  }))
}

function setMode(state: GameState, mode: 'normal' | 'saving' | 'off'): ActionResult {
  const inactive = requireActiveSol(state)
  if (inactive) return reject(state, inactive)
  if (!state.crop.active || state.crop.harvested || state.crop.growth >= GAME_CONFIG.cropHarvestGrowth) return reject(state, 'No hay un cultivo activo que cambiar.')
  if (state.crop.mode === mode) return reject(state, 'El cultivo ya está en ese modo.')
  const next = { ...state, crop: { ...state.crop, mode } }
  return accept(record(next, {
    action: `Cambiar cultivo a ${mode === 'normal' ? 'modo normal' : mode === 'saving' ? 'modo ahorro' : 'modo apagado'}`,
    cost: '',
    consequence: mode === 'normal' ? 'El cultivo usará el ritmo y consumo normales.' : mode === 'saving' ? 'El cultivo crecerá más despacio y usará menos recursos.' : 'El cultivo no crecerá mientras esté apagado.',
    resourceDeltas: {},
    kind: 'action',
  }))
}

function accelerateCrop(state: GameState): ActionResult {
  const inactive = requireActiveSol(state)
  if (inactive) return reject(state, inactive)
  if (!state.crop.active || state.crop.harvested || state.crop.growth >= GAME_CONFIG.cropHarvestGrowth) return reject(state, 'No hay un cultivo activo que acelerar.')
  if (state.cropBoostedSol === state.sol) return reject(state, 'Ya usaste el impulso de cultivo durante este sol.')
  const shortage = resourceCost(state, { energy: GAME_CONFIG.cropBoost.energy })
  if (shortage) return reject(state, 'No hay energía suficiente para el impulso del invernadero.')
  const growth = Math.min(GAME_CONFIG.cropHarvestGrowth, state.crop.growth + GAME_CONFIG.cropBoost.growth)
  const next = {
    ...state,
    resources: { ...state.resources, energy: state.resources.energy - GAME_CONFIG.cropBoost.energy },
    crop: { ...state.crop, growth },
    cropBoostedSol: state.sol,
  }
  return accept(record(next, {
    action: 'Impulsar el crecimiento del cultivo',
    cost: `−${GAME_CONFIG.cropBoost.energy} energía`,
    consequence: `La iluminación del invernadero adelantó ${growth - state.crop.growth} puntos de crecimiento.`,
    resourceDeltas: { energy: -GAME_CONFIG.cropBoost.energy },
    kind: 'action',
  }))
}

function collectSupply(state: GameState, siteId: string): ActionResult {
  const inactive = requireActiveSol(state)
  if (inactive) return reject(state, inactive)
  if (state.crewBusy) return reject(state, 'La tripulación ya realizó una tarea este sol.')
  const site = supplySites.find((item) => item.id === siteId)
  if (!site) return reject(state, 'No encontramos ese suministro en el mapa.')
  const collected = state.collectedSupplyIds ?? []
  if (collected.includes(site.id)) return reject(state, 'La tripulación ya recogió este suministro.')
  if (!isWithinInteractionRange(state.mapPosition, site.position, MARS_WORLD.interactionRange)) return reject(state, 'Camina hasta el suministro para recogerlo.')
  const capacity = RESOURCE_CAPACITY[site.resource]
  const available = state.resources[site.resource]
  const amount = Math.max(0, Math.min(site.amount, capacity === undefined ? site.amount : capacity - available))
  if (amount === 0) return reject(state, 'No hay espacio para guardar más de este suministro.')

  const next: GameState = {
    ...state,
    resources: { ...state.resources, [site.resource]: available + amount },
    collectedSupplyIds: [...collected, site.id],
    crewBusy: true,
    crewTask: 'collect',
  }
  const label = { energy: 'energía', water: 'agua', food: 'comida', spareParts: 'repuestos', seeds: 'semillas' }[site.resource]
  return accept(record(next, {
    action: `Recoger ${site.name.toLowerCase()}`,
    cost: '',
    consequence: `La colonia recibió ${amount} ${label}.`,
    resourceDeltas: { [site.resource]: amount },
    kind: 'action',
  }))
}

function advanceGame(state: GameState, fastForward: boolean): ActionResult {
  if (state.gameOver || state.sol > state.maxSols) return reject(state, 'La misión ya terminó.')
  if (hasUnresolvedEvent(state)) return reject(state, 'Resuelve la alerta antes de avanzar.')
  if (fastForward && state.resources.energy < GAME_CONFIG.fastForwardEnergyCost) return reject(state, `Necesitas ${GAME_CONFIG.fastForwardEnergyCost} de energía para avanzar ahora. Espera a que termine el sol automático.`)

  const prepared = fastForward
    ? record({ ...state, resources: { ...state.resources, energy: state.resources.energy - GAME_CONFIG.fastForwardEnergyCost } }, {
      action: 'Avanzar un sol antes de tiempo',
      cost: `−${GAME_CONFIG.fastForwardEnergyCost} energía`,
      consequence: 'El equipo aceleró el cierre del sol usando energía.',
      resourceDeltas: { energy: -GAME_CONFIG.fastForwardEnergyCost },
      kind: 'action',
    })
    : state
  return accept(advanceSol(prepared))
}

function resolveDust(state: GameState, choice: 'saving' | 'normal'): ActionResult {
  const event = pendingEvent(state)
  if (state.gameOver) return reject(state, 'La misión ya terminó.')
  if (!event || event.kind !== 'dust') return reject(state, 'No hay una tormenta pendiente.')
  const events = state.events.map((item) => item.id === event.id ? { ...item, resolved: true, optionId: choice } : item)
  const next = { ...state, events, crop: { ...state.crop, mode: choice } }
  return accept(record(next, {
    action: choice === 'saving' ? 'Decidir ahorrar durante la tormenta' : 'Decidir continuar en modo normal',
    cost: '',
    consequence: choice === 'saving' ? 'El cultivo consume menos y crece más despacio durante la tormenta.' : 'El cultivo conserva su crecimiento normal y consume más recursos.',
    resourceDeltas: {},
    kind: 'action',
  }))
}

function resolveSolar(state: GameState, choice: 'shelter' | 'continue', missedDeadline = false): ActionResult {
  const event = pendingEvent(state)
  if (state.gameOver) return reject(state, 'La misión ya terminó.')
  if (!event || event.kind !== 'solar') return reject(state, 'No hay una alerta solar pendiente.')
  if (choice === 'shelter' && state.resources.energy < GAME_CONFIG.shelterCost) return reject(state, 'No guardaste energía suficiente para el refugio.')
  if (choice === 'shelter' && state.crewBusy) return reject(state, 'La tripulación ya está ocupada este sol.')
  const habitat = state.buildings.find((building) => building.type === 'habitat')
  const habitatPlot = habitat ? marsPlots.find((plot) => plot.id === habitat.plotId) : undefined
  if (choice === 'shelter' && (!habitatPlot || !isWithinInteractionRange(state.mapPosition, habitatPlot, MARS_WORLD.interactionRange))) return reject(state, 'Camina hasta la entrada de la nave hábitat para refugiarte.')
  const events = state.events.map((item) => item.id === event.id ? { ...item, resolved: true, optionId: choice } : item)
  const sheltered = choice === 'shelter'
  const next = {
    ...state,
    events,
    resources: sheltered ? { ...state.resources, energy: state.resources.energy - GAME_CONFIG.shelterCost } : state.resources,
    educationalRisk: sheltered ? state.educationalRisk : Math.min(100, state.educationalRisk + GAME_CONFIG.exposureOnSolarContinue),
    crewBusy: sheltered || state.crewBusy,
    crewTask: sheltered ? 'shelter' as const : state.crewTask,
    shelterUsed: sheltered || state.shelterUsed,
  }
  return accept(record(next, {
    action: sheltered ? 'Refugiar a la tripulación en la nave' : missedDeadline ? 'No llegar a tiempo al refugio solar' : 'Continuar trabajando durante la alerta solar',
    cost: sheltered ? '−6 energía' : 'Sin costo inmediato de energía; +60 al nivel de exposición',
    consequence: sheltered ? 'La tripulación entró a la nave y queda protegida este sol; el cultivo sigue funcionando si tiene recursos.' : missedDeadline ? 'La ventana del refugio terminó antes de que llegaras. El nivel de exposición subió 60 puntos.' : 'El nivel de exposición aumentó 60 puntos.',
    resourceDeltas: sheltered ? { energy: -6 } : {},
    kind: 'action',
  }))
}

export function dispatchGameCommand(state: GameState, command: GameCommand): ActionResult {
  if (command.type === 'advance') return advanceGame(state, true)
  if (command.type === 'advanceTimed') return advanceGame(state, false)
  if (command.type === 'build') return build(state, command)
  if (command.type === 'sow') return sow(state)
  if (command.type === 'harvest') return harvest(state)
  if (command.type === 'setMode') return setMode(state, command.mode)
  if (command.type === 'accelerateCrop') return accelerateCrop(state)
  if (command.type === 'resolveDust') return resolveDust(state, command.choice)
  if (command.type === 'missSolarDeadline') return resolveSolar(state, 'continue', true)
  if (command.type === 'collectSupply') return collectSupply(state, command.siteId)
  return resolveSolar(state, command.choice)
}
