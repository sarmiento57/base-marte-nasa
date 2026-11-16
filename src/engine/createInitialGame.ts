import { INITIAL_BUILDINGS, INITIAL_RESOURCES, GAME_CONFIG, SCENARIO_PRESETS, eventSolsForScenario } from './config'
import type { GameState, MissionConditions, ScenarioId } from './types'

export function createInitialGame(scenarioId: ScenarioId = 'standard', conditions?: MissionConditions): GameState {
  const scenario = SCENARIO_PRESETS[scenarioId]
  return {
    version: 1,
    scenarioId,
    eventSols: eventSolsForScenario(scenarioId),
    sol: 1,
    maxSols: GAME_CONFIG.maxSols,
    resources: { ...INITIAL_RESOURCES, energy: scenario.initialEnergy },
    buildings: INITIAL_BUILDINGS.map((building) => ({ ...building })),
    crop: { active: false, growth: 0, health: GAME_CONFIG.cropInitialHealth, mode: 'normal', consecutiveOffSols: 0, harvested: false },
    crewBusy: false,
    lifeSupport: 'stable',
    lifeSupportReason: 'Basic systems have enough reserves.',
    educationalRisk: 0,
    events: [],
    log: [],
    gameOver: false,
    won: false,
    solsCompleted: 0,
    foodHarvested: 0,
    shelterUsed: false,
    mapPosition: { x: 980, y: 820 },
    cropBoostedSol: 0,
    supplyReadySol: {},
    suppliesCollected: 0,
    harvests: 0,
    travel: { energy: 0, water: 0, food: 0 },
    ...(conditions ? { conditions } : {}),
  }
}
