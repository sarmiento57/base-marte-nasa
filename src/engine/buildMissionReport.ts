import type { GameState, MissionReport } from './types'

export function buildMissionReport(state: GameState): MissionReport {
  const decisions = state.log.filter((entry) => entry.kind === 'action').slice(-2)
  const consequence = state.endReason === 'lifeSupport'
    ? state.lifeSupportReason
    : state.endReason === 'crewExposed'
      ? `The exposure level ended at ${state.educationalRisk}; to win it must be below 50.`
      : state.endReason === 'noHarvest'
        ? 'The colony did not finish a harvest before the eight sols ended.'
        : `The colony harvested ${state.foodHarvested} food, kept life support out of critical state and ended with an exposure index of ${state.educationalRisk}.`
  const advice = state.endReason === 'lifeSupport'
    ? 'Save energy, water and food for life support before spending resources on the greenhouse.'
    : state.endReason === 'crewExposed'
      ? 'Keep at least 6 energy to shelter the crew when the solar alert arrives.'
      : state.endReason === 'noHarvest'
        ? 'Build the greenhouse early, plant, and change the mode based on your reserves.'
        : 'Compare what the crop uses with your solar energy before each advance.'
  return {
    result: state.won ? 'win' : 'loss',
    solsCompleted: state.solsCompleted,
    foodHarvested: state.foodHarvested,
    finalResources: { ...state.resources },
    educationalRisk: state.educationalRisk,
    lifeSupport: state.lifeSupport,
    decisions,
    consequence,
    advice,
    endReason: state.endReason,
    scenarioId: state.scenarioId,
  }
}
