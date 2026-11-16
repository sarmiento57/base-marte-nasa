export type ResourceName = 'energy' | 'water' | 'food' | 'spareParts' | 'seeds'
export type GreenhouseMode = 'normal' | 'saving' | 'off'
export type LifeSupportStatus = 'stable' | 'risk' | 'critical'
export type BuildingType = 'habitat' | 'solar' | 'greenhouse' | 'water' | 'garage' | 'bunker'
export type BuildableType = Exclude<BuildingType, 'habitat'>
export type LifeResource = 'energy' | 'water' | 'food'
export type TravelMode = 'foot' | 'rover'
export type SafeZoneId = 'habitat' | 'bunker' | 'cave'
export type SpaceWeatherLevel = 'calm' | 'active' | 'storm'
export type EventKind = 'dust' | 'solar'
export type CrewTask = 'build' | 'sow' | 'harvest' | 'shelter' | 'collect'
export type GameEndReason = 'win' | 'noHarvest' | 'crewExposed' | 'lifeSupport'
export type ScenarioId = 'standard' | 'reserve-rich' | 'early-events'

export type Resources = Record<ResourceName, number>
export interface WorldPosition { x: number; y: number }

export interface Crop {
  active: boolean
  growth: number
  health: number
  mode: GreenhouseMode
  consecutiveOffSols: number
  harvested: boolean
}

export interface Building {
  id: string
  type: BuildingType
  plotId: string
  operational: boolean
}

export interface GameEvent {
  id: string
  kind: EventKind
  sol: number
  resolved: boolean
  optionId?: string
}

export type ResourceDeltas = Partial<Resources>

export interface DecisionLog {
  sol: number
  action: string
  cost: string
  consequence: string
  resourceDeltas: ResourceDeltas
  kind: 'action' | 'turn'
}

/** One Mars sol of archived NASA InSight air temperatures used for the cold-night food rule. */
export interface ClimateSol {
  insightSol: number
  date: string
  minC: number
  avgC: number
  maxC: number
}

/** NASA conditions copied into the game when the mission starts, so the engine stays deterministic. */
export interface MissionConditions {
  climate: ClimateSol[]
  spaceWeather: SpaceWeatherLevel
}

export interface RoverState {
  position: WorldPosition
  riding: boolean
}

export interface GameState {
  version: 1
  scenarioId: ScenarioId
  eventSols: { dust: number; solar: number }
  sol: number
  maxSols: number
  resources: Resources
  buildings: Building[]
  crop: Crop
  crewBusy: boolean
  crewTask?: CrewTask
  lifeSupport: LifeSupportStatus
  lifeSupportReason: string
  educationalRisk: number
  events: GameEvent[]
  log: DecisionLog[]
  gameOver: boolean
  won: boolean
  endReason?: GameEndReason
  solsCompleted: number
  foodHarvested: number
  shelterUsed: boolean
  mapPosition: WorldPosition
  cropBoostedSol?: number
  /** Legacy field from saves made before supplies refilled. */
  collectedSupplyIds?: string[]
  /** Sol when each supply site has something to collect again. */
  supplyReadySol?: Record<string, number>
  suppliesCollected?: number
  harvests?: number
  /** Distance walked or driven that has not been charged yet, per resource. */
  travel?: Record<LifeResource, number>
  rover?: RoverState
  /** Life-support resources that ran out; the player must refill them before the alert ends. */
  emergency?: LifeResource[]
  shelterZone?: SafeZoneId
  conditions?: MissionConditions
}

export interface BuildCommand { type: 'build'; building: BuildableType; plotId: string }
export interface SowCommand { type: 'sow' }
export interface HarvestCommand { type: 'harvest' }
export interface SetModeCommand { type: 'setMode'; mode: GreenhouseMode }
export interface ResolveDustCommand { type: 'resolveDust'; choice: 'saving' | 'normal' }
export interface ResolveSolarCommand { type: 'resolveSolar'; choice: 'shelter' | 'continue'; zone?: SafeZoneId }
export interface MissSolarDeadlineCommand { type: 'missSolarDeadline' }
export interface AdvanceCommand { type: 'advance' }
export interface TimedAdvanceCommand { type: 'advanceTimed' }
export interface CollectSupplyCommand { type: 'collectSupply'; siteId: string }
export interface AccelerateCropCommand { type: 'accelerateCrop' }
export interface SleepCommand { type: 'sleep' }
export interface TravelCommand { type: 'travel'; distance: number; mode: TravelMode }
export interface ToggleRoverCommand { type: 'toggleRover' }
export interface ExpireEmergencyCommand { type: 'expireEmergency' }
export type GameCommand = BuildCommand | SowCommand | HarvestCommand | SetModeCommand | ResolveDustCommand | ResolveSolarCommand | MissSolarDeadlineCommand | AdvanceCommand | TimedAdvanceCommand | CollectSupplyCommand | AccelerateCropCommand | SleepCommand | TravelCommand | ToggleRoverCommand | ExpireEmergencyCommand

export interface ActionResult {
  ok: boolean
  state: GameState
  reason?: string
}

export interface DecisionPreview {
  allowed: boolean
  reason?: string
  immediateDeltas: ResourceDeltas
  conditionalEffects: string[]
  affectedSols: number[]
  assumptions: string[]
}

export interface MissionReport {
  result: 'win' | 'loss'
  solsCompleted: number
  foodHarvested: number
  finalResources: Resources
  educationalRisk: number
  lifeSupport: LifeSupportStatus
  decisions: DecisionLog[]
  consequence: string
  advice: string
  endReason?: GameEndReason
  scenarioId: ScenarioId
}
