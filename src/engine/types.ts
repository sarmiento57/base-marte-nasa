export type ResourceName = 'energy' | 'water' | 'food' | 'spareParts' | 'seeds'
export type GreenhouseMode = 'normal' | 'saving' | 'off'
export type LifeSupportStatus = 'stable' | 'risk' | 'critical'
export type BuildingType = 'habitat' | 'solar' | 'greenhouse'
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
  collectedSupplyIds?: string[]
}

export interface BuildCommand { type: 'build'; building: 'solar' | 'greenhouse'; plotId: string }
export interface SowCommand { type: 'sow' }
export interface HarvestCommand { type: 'harvest' }
export interface SetModeCommand { type: 'setMode'; mode: GreenhouseMode }
export interface ResolveDustCommand { type: 'resolveDust'; choice: 'saving' | 'normal' }
export interface ResolveSolarCommand { type: 'resolveSolar'; choice: 'shelter' | 'continue' }
export interface MissSolarDeadlineCommand { type: 'missSolarDeadline' }
export interface AdvanceCommand { type: 'advance' }
export interface TimedAdvanceCommand { type: 'advanceTimed' }
export interface CollectSupplyCommand { type: 'collectSupply'; siteId: string }
export interface AccelerateCropCommand { type: 'accelerateCrop' }
export type GameCommand = BuildCommand | SowCommand | HarvestCommand | SetModeCommand | ResolveDustCommand | ResolveSolarCommand | MissSolarDeadlineCommand | AdvanceCommand | TimedAdvanceCommand | CollectSupplyCommand | AccelerateCropCommand

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
