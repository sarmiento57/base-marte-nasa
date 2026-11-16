import { GAME_CONFIG } from './config'
import type { GameState } from './types'

/**
 * Decides the end of the mission after the last sol. Running out of energy, water or food no longer
 * ends the game at once: the player gets an alert with a countdown (see `expireEmergency`).
 */
export function evaluateMission(state: GameState): GameState {
  if (state.gameOver) return state
  if (state.solsCompleted < state.maxSols) return state

  const lifeSupportFailed = state.lifeSupport === 'critical' || (['energy', 'water', 'food'] as const).some((resource) => state.resources[resource] <= 0)
  const endReason = lifeSupportFailed
    ? 'lifeSupport'
    : state.educationalRisk >= GAME_CONFIG.educationalRiskLimit
      ? 'crewExposed'
      : state.foodHarvested <= 0
        ? 'noHarvest'
        : 'win'

  return { ...state, gameOver: true, won: endReason === 'win', endReason }
}
