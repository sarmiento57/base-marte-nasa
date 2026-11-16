import { dispatchGameCommand } from './actions'
import { BUILDING_EFFECT, GAME_CONFIG, GREENHOUSE_MODE, SHELTER_COST } from './config'
import { supplySites } from '../data/mars/supplies'
import type { DecisionPreview, GameCommand, GameState, ResourceName, ResourceDeltas } from './types'

function deltasBetween(before: GameState, after: GameState): ResourceDeltas {
  const changes: ResourceDeltas = {}
  for (const resource of Object.keys(before.resources) as ResourceName[]) {
    const delta = after.resources[resource] - before.resources[resource]
    if (delta !== 0) changes[resource] = delta
  }
  return changes
}

function futureEffects(state: GameState, command: GameCommand): string[] {
  switch (command.type) {
    case 'build':
      return command.building === 'solar'
        ? ['When a sol closes, the second panel adds +6 energy; +2 during the storm.']
        : command.building === 'greenhouse'
          ? ['The greenhouse lets you plant on a later sol; building it does not start a crop.']
          : [BUILDING_EFFECT[command.building], 'The crew builds until the sol ends. Sleep in the habitat to finish sooner.']
    case 'sow':
      return ['The crop will start at 0 % growth and only grows when the sol advances with enough energy and water.', 'The harvest will depend on growth, health and future events.']
    case 'harvest':
      return [`The food added depends on current health and free storage space (${state.resources.food}/100).`]
    case 'setMode': {
      const mode = GREENHOUSE_MODE[command.mode]
      return [`When the sol advances, ${command.mode === 'saving' ? 'saving' : command.mode === 'off' ? 'off' : 'normal'} mode uses ${mode.energy} energy and ${mode.water} water for up to ${mode.growth} growth, if life support leaves enough reserves.`]
    }
    case 'accelerateCrop':
      return [`The boost uses ${GAME_CONFIG.cropBoost.energy} energy and adds up to ${GAME_CONFIG.cropBoost.growth} points now. Normal growth is calculated when the sol closes, if energy and water remain.`]
    case 'resolveDust':
      return command.choice === 'saving'
        ? ['For the rest of the storm, solar power drops; the crop saves resources and grows more slowly.']
        : ['For the rest of the storm, solar power drops while the crop keeps its normal consumption.']
    case 'resolveSolar':
      return command.choice === 'shelter'
        ? [`The crew is protected this sol; the crop can keep growing if it has enough resources. Habitat −${SHELTER_COST.habitat} ⚡, bunker −${SHELTER_COST.bunker} ⚡, cave free.`]
        : ['The exposure level becomes 60; at 50 or more you cannot win.']
    case 'missSolarDeadline':
      return ['The window closed without shelter; the exposure level rises 60 points.']
    case 'advance':
      return [`Advancing early costs ${GAME_CONFIG.fastForwardEnergyCost} energy on top of this sol's life support and crop use.`, 'What happens next depends on your reserves and the alerts.']
    case 'advanceTimed':
      return ['When the sol timer ends, the sol closes with no early fee and applies life support, production and growth.']
    case 'collectSupply': {
      const site = supplySites.find((item) => item.id === command.siteId)
      return [site ? `This spot refills ${site.refillSols} sols after you collect it.` : 'Supplies refill a few sols after you collect them.']
    }
    case 'sleep':
      return ['The night passes quickly: the sol ends and life support, production and growth are applied with no early fee.']
    case 'travel':
      return ['Walking uses a little energy, water and food. The rover uses only energy.']
    case 'toggleRover':
      return ['The rover drives twice as fast and uses only energy.']
    case 'expireEmergency':
      return ['If energy, water or food is still empty, the mission ends.']
  }
}

export function previewDecision(state: GameState, command: GameCommand): DecisionPreview {
  const result = dispatchGameCommand(state, command)
  return {
    allowed: result.ok,
    reason: result.reason,
    immediateDeltas: result.ok ? deltasBetween(state, result.state) : {},
    conditionalEffects: futureEffects(state, command),
    affectedSols: command.type === 'resolveDust' ? [state.eventSols.dust, state.eventSols.dust + 1] : [state.sol],
    assumptions: ['This estimate uses your reserves and the current colony state.', 'Future effects depend on your decisions and the resources left when the sol closes.'],
  }
}
