import type { BuildingType, GreenhouseMode, ResourceName, ScenarioId } from './types'

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

export const BUILDING_COST: Record<'solar' | 'greenhouse', Partial<Record<ResourceName, number>>> = {
  solar: { spareParts: 2 },
  greenhouse: { spareParts: 2 },
}

export const BUILDING_EFFECT: Record<'solar' | 'greenhouse', string> = {
  solar: '+6 energy per sol; +2 during the storm.',
  greenhouse: 'Lets you plant on a later sol.',
}

export const BUILDING_LIMIT: Record<'solar' | 'greenhouse', number> = { solar: 2, greenhouse: 1 }

export const GREENHOUSE_MODE: Record<GreenhouseMode, { energy: number; water: number; growth: number }> = {
  normal: { energy: 8, water: 3, growth: 20 },
  saving: { energy: 4, water: 2, growth: 10 },
  off: { energy: 0, water: 0, growth: 0 },
}

export const GAME_CONFIG = {
  maxSols: 8,
  solDurationSeconds: 360,
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
}

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
