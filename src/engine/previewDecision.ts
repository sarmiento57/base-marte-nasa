import { dispatchGameCommand } from './actions'
import { GAME_CONFIG, GREENHOUSE_MODE } from './config'
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
        ? ['Al cerrar un sol, el segundo panel aporta +6 energía; +2 durante la tormenta.']
        : ['El invernadero permite sembrar en un próximo sol; construirlo no inicia el cultivo.']
    case 'sow':
      return ['El cultivo empezará con 0 % de crecimiento y solo crecerá al avanzar si hay energía y agua.', 'La cosecha dependerá del crecimiento, la salud y los eventos futuros.']
    case 'harvest':
      return [`La comida añadida depende de la salud actual y del espacio disponible en el almacén (${state.resources.food}/100).`]
    case 'setMode': {
      const mode = GREENHOUSE_MODE[command.mode]
      return [`Al avanzar, el modo ${command.mode === 'saving' ? 'ahorro' : command.mode === 'off' ? 'apagado' : 'normal'} usa ${mode.energy} energía y ${mode.water} agua para hasta ${mode.growth} de crecimiento, si el soporte vital deja reservas suficientes.`]
    }
    case 'accelerateCrop':
      return [`El impulso consume ${GAME_CONFIG.cropBoost.energy} energía y adelanta hasta ${GAME_CONFIG.cropBoost.growth} puntos ahora. El crecimiento normal del sol se calcula al cerrarlo si quedan energía y agua.`]
    case 'resolveDust':
      return command.choice === 'saving'
        ? ['En los soles restantes de la tormenta, la energía solar baja; el cultivo ahorra recursos y crece más despacio.']
        : ['En los soles restantes de la tormenta, la energía solar baja mientras el cultivo sigue con su consumo normal.']
    case 'resolveSolar':
      return command.choice === 'shelter'
        ? ['La tripulación queda protegida este sol; el cultivo puede continuar si conserva recursos suficientes.']
        : ['El nivel de exposición queda en 60; si llega a 50 o más, no se puede ganar.']
    case 'missSolarDeadline':
      return ['La ventana terminó sin refugio; el nivel de exposición sube 60 puntos.']
    case 'advance':
      return [`Avanzar antes de tiempo gasta ${GAME_CONFIG.fastForwardEnergyCost} de energía además del soporte vital y el cultivo de este sol.`, 'El siguiente estado depende de las reservas y de las alertas.']
    case 'advanceTimed':
      return ['Al terminar los seis minutos, el sol se cierra sin costo de adelanto y aplica soporte vital, producción y crecimiento.']
    case 'collectSupply':
      return ['La tripulación recogerá el contenido disponible y ocupará su tarea de este sol.']
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
    assumptions: ['El cálculo toma en cuenta tus reservas y el estado actual de la colonia.', 'Los efectos futuros dependen de tus decisiones y de los recursos que queden al cerrar el sol.'],
  }
}
