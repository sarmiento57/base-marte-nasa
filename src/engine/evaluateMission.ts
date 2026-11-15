import { GAME_CONFIG } from './config'
import type { GameState } from './types'

export function evaluateMission(state: GameState): GameState {
  if (state.gameOver) return state
  if (state.lifeSupport === 'critical') {
    return { ...state, gameOver: true, won: false, endReason: 'lifeSupport' }
  }
  if (state.solsCompleted < state.maxSols) return state

  const endReason = state.educationalRisk >= GAME_CONFIG.educationalRiskLimit
    ? 'crewExposed'
    : state.foodHarvested <= 0
      ? 'noHarvest'
      : 'win'

  return { ...state, gameOver: true, won: endReason === 'win', endReason }
}
