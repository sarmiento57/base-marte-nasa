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
    ? 'Watch the ⚡ 💧 🍞 bars. When one gets low, follow the arrow to a supply before it reaches zero.'
    : state.endReason === 'crewExposed'
      ? 'When the solar storm comes, run to a safe zone. The lava tube cave is free; the habitat needs 6 energy.'
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
