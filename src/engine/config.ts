import type { BuildableType, BuildingType, GreenhouseMode, LifeResource, ResourceName, SafeZoneId, ScenarioId, SpaceWeatherLevel } from './types'

export const BALANCE_NOTE = 'Colony reserve and progression parameters.'

export const RESOURCE_CAPACITY: Partial<Record<ResourceName, number>> = {
  energy: 100,
  water: 100,
  food: 100,
}

export const INITIAL_RESOURCES = {
  energy: 48,
  water: 60,
  food: 22,
  spareParts: 4,
  seeds: 1,
} as const

export const INITIAL_BUILDINGS = [
  { id: 'habitat-1', type: 'habitat', plotId: 'A1', operational: true },
  { id: 'solar-1', type: 'solar', plotId: 'A2', operational: true },
] as const

export const BUILDING_COST: Record<BuildableType, Partial<Record<ResourceName, number>>> = {
  solar: { spareParts: 2 },
  greenhouse: { spareParts: 2 },
  water: { spareParts: 2 },
  garage: { spareParts: 2 },
  bunker: { spareParts: 1 },
}

export const BUILDING_EFFECT: Record<BuildableType, string> = {
  solar: '+6 energy per sol; +2 during the storm.',
  greenhouse: 'Lets you plant on a later sol.',
  water: '+5 water every sol from underground ice.',
  garage: 'Unlocks the Mars rover: drive twice as fast.',
  bunker: 'A safe zone for solar storms. Entering costs only 3 energy.',
}

/** How many of each building the colony can have, counting the ones it starts with. */
export const BUILDING_LIMIT: Record<BuildableType, number> = { solar: 2, greenhouse: 1, water: 1, garage: 1, bunker: 1 }

/** Output of the water extractor when a sol closes. */
export const WATER_EXTRACTOR_OUTPUT = 5

export const GREENHOUSE_MODE: Record<GreenhouseMode, { energy: number; water: number; growth: number }> = {
  normal: { energy: 8, water: 3, growth: 20 },
  saving: { energy: 4, water: 2, growth: 10 },
  off: { energy: 0, water: 0, growth: 0 },
}

export const GAME_CONFIG = {
  maxSols: 8,
  solDurationSeconds: 180,
  fastForwardEnergyCost: 10,
  solarGeneration: 18,
  dustGeneration: 5,
  secondSolarBonus: 6,
  secondSolarDustBonus: 2,
  lifeSupport: { energy: 10, water: 2, food: 3 },
  sowCost: { energy: 25, water: 10, seeds: 1 },
  cropBoost: { energy: 12, growth: 20 },
  cropInitialHealth: 100,
  cropOffHealthLoss: 25,
  cropHarvestGrowth: 100,
  cropHealthFloor: 50,
  cropFullYieldHealth: 75,
  cropFullYield: 35,
  cropReducedYield: 25,
  shelterCost: 6,
  solarShelterWindowSeconds: 40,
  exposureOnSolarContinue: 60,
  energyRiskBelow: 20,
  waterRiskBelow: 10,
  foodRiskBelow: 10,
  stormStarts: 3,
  stormEnds: 4,
  solarAlertSol: 6,
  educationalRiskLimit: 50,
} as const

export const BUILDING_LABEL: Record<BuildingType, string> = {
  habitat: 'Habitat',
  solar: 'Solar panel',
  greenhouse: 'Greenhouse',
  water: 'Water extractor',
  garage: 'Rover garage',
  bunker: 'Storm bunker',
}

export const BUILDING_ICON: Record<BuildingType, string> = {
  habitat: '🏠',
  solar: '☀️',
  greenhouse: '🌱',
  water: '💧',
  garage: '🚙',
  bunker: '🛡️',
}

/** Real seconds per sol for each mission: shorter sols keep a full mission around 20–28 minutes. */
export const SOL_SECONDS: Record<ScenarioId, number> = {
  standard: 180,
  'reserve-rich': 210,
  'early-events': 150,
}

export function solSecondsFor(scenarioId: ScenarioId): number {
  return SOL_SECONDS[scenarioId] ?? GAME_CONFIG.solDurationSeconds
}

/** World units travelled before 1 point of each resource is used. The rover uses only energy. */
export const TRAVEL_COST: Record<'foot' | 'rover', Partial<Record<LifeResource, number>>> = {
  foot: { energy: 2000, water: 5000, food: 6000 },
  rover: { energy: 2500 },
}

export const ROVER_SPEED_MULTIPLIER = 2

/** Seconds the player has to refill an empty life-support resource before the mission ends. */
export const EMERGENCY_SECONDS = 60

/** Energy needed to shelter in each safe zone during a solar alert. */
export const SHELTER_COST: Record<SafeZoneId, number> = { habitat: 6, bunker: 3, cave: 0 }

/**
 * Seconds to reach a safe zone, based on real recent space weather from NASA DONKI
 * (strongest geomagnetic storm Kp in the last 30 days). More solar activity, less time.
 */
export const SHELTER_WINDOW_SECONDS: Record<SpaceWeatherLevel, number> = { calm: 50, active: 45, storm: 35 }

/** A night colder than this (InSight minimum air temperature) makes the crew eat 1 extra food. */
export const COLD_NIGHT_C = -97
export const COLD_NIGHT_EXTRA_FOOD = 1

export const RESOURCE_LABEL: Record<ResourceName, string> = {
  energy: 'Energy',
  water: 'Water',
  food: 'Food',
  spareParts: 'Spare parts',
  seeds: 'Seeds',
}

export const EVENT_SOL = { dust: 3, solar: 6 } as const

export const SCENARIO_PRESETS: Record<ScenarioId, { name: string; initialEnergy: number; dustSol: number; solarSol: number; description: string }> = {
  standard: { name: 'First flight', initialEnergy: 48, dustSol: 3, solarSol: 6, description: 'The balanced mission: dust storm on sol 3 and solar alert on sol 6.' },
  'reserve-rich': { name: 'Extra reserves', initialEnergy: 56, dustSol: 4, solarSol: 7, description: 'You start with more energy and the events come later.' },
  'early-events': { name: 'Early signals', initialEnergy: 48, dustSol: 2, solarSol: 5, description: 'The same reserves, but events arrive sooner.' },
}

export function eventSolsForScenario(scenarioId: ScenarioId): { dust: number; solar: number } {
  const scenario = SCENARIO_PRESETS[scenarioId]
  return { dust: scenario.dustSol, solar: scenario.solarSol }
}
