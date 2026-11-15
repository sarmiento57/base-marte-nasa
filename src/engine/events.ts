import { EVENT_SOL } from './config'
import type { EventKind, GameEvent, GameState } from './types'

export function eventForSol(sol: number, eventSols: { dust: number; solar: number } = EVENT_SOL): GameEvent | undefined {
  const kind: EventKind | undefined = sol === eventSols.dust ? 'dust' : sol === eventSols.solar ? 'solar' : undefined
  return kind ? { id: `${kind}-sol-${sol}`, kind, sol, resolved: false } : undefined
}

export function pendingEvent(state: GameState): GameEvent | undefined {
  return state.events.find((event) => event.sol === state.sol && !event.resolved)
}

export function hasUnresolvedEvent(state: GameState): boolean {
  return Boolean(pendingEvent(state))
}
