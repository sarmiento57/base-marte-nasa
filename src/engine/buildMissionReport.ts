import type { GameState, MissionReport } from './types'

export function buildMissionReport(state: GameState): MissionReport {
  const decisions = state.log.filter((entry) => entry.kind === 'action').slice(-2)
  const consequence = state.endReason === 'lifeSupport'
    ? state.lifeSupportReason
    : state.endReason === 'crewExposed'
      ? `El índice educativo de exposición terminó en ${state.educationalRisk}; el límite para ganar es menor que 50.`
      : state.endReason === 'noHarvest'
        ? 'La colonia no completó una cosecha antes de terminar los ocho soles.'
        : `La colonia recogió ${state.foodHarvested} de comida, mantuvo el soporte vital sin estado crítico y terminó con un índice de exposición de ${state.educationalRisk}.`
  const advice = state.endReason === 'lifeSupport'
    ? 'Reserva energía, agua y comida para el soporte vital antes de usar recursos en el invernadero.'
    : state.endReason === 'crewExposed'
      ? 'Guarda al menos 6 de energía para refugiar a la tripulación cuando llegue la alerta solar.'
      : state.endReason === 'noHarvest'
        ? 'Construye el invernadero temprano, siembra y cambia el modo según las reservas.'
        : 'Compara el gasto del cultivo con la energía solar antes de cada avance.'
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
