import { pendingEvent } from '../../engine/events'
import type { GameState } from '../../engine/types'
import type { GameScreen } from '../../store/useGameStore'

export function getNovaMessage(game: GameState | null, screen: GameScreen): { text: string; priority: 'normal' | 'urgent' } {
  if (screen === 'home') return { text: 'Hello, commander! Choose a route and explore the colony on foot. I will explain the alerts, but you always decide.', priority: 'normal' }
  if (screen === 'howto') return { text: 'Read the steps before liftoff. During the mission you can open my help any time.', priority: 'normal' }
  if (screen === 'science') return { text: 'Here we keep NASA observations, science explanations and game numbers apart.', priority: 'normal' }
  if (screen === 'report') return { text: game?.won ? 'The colony made it! The report shows which decisions helped the mission.' : 'Every attempt teaches something. Read the report to see what happened and how to change the plan.', priority: 'normal' }
  if (!game) return { text: 'When the mission starts, I will help you get to know the base and look after the crew.', priority: 'normal' }
  const event = pendingEvent(game)
  if (event?.kind === 'dust') return { text: 'Dust storm! The panels make less energy for two sols. Saving mode uses less, but the crop grows more slowly.', priority: 'urgent' }
  if (event?.kind === 'solar') return { text: 'Solar storm! Follow the arrow to a safe zone: the habitat (6 ⚡), a storm bunker (3 ⚡) or the lava tube cave (free).', priority: 'urgent' }
  if (game.emergency?.length) return { text: `We ran out of ${game.emergency.join(' and ')}! Follow the arrow to a supply and refill it before the timer ends.`, priority: 'urgent' }
  if (game.gameOver) return { text: game.won ? 'We did it! Print your Junior Astronaut certificate.' : 'A rescue ship is coming. Read my tip and try again!', priority: 'normal' }
  if (game.resources.energy < 20 || game.resources.water < 10 || game.resources.food < 10) return { text: `${game.lifeSupportReason} Walking uses a little ⚡ 💧 🍞. Grab a supply or sleep in the habitat when the panels need to recharge.`, priority: 'urgent' }
  if (game.crewBusy) return { text: 'The crew is busy this sol. Sleep in the habitat to make time pass faster.', priority: 'normal' }
  if (!game.buildings.some((building) => building.type === 'greenhouse')) return { text: 'Find a free plot on the map and build a greenhouse. It costs 2 spare parts; it does not plant anything by itself.', priority: 'normal' }
  if (!game.crop.active) return { text: game.resources.seeds > 0 ? 'The greenhouse is ready. Planting costs 25 energy, 10 water and one seed.' : 'We need a seed to plant. Look for a seed case on the map.', priority: 'normal' }
  if (game.crop.active && !game.crop.harvested && game.crop.growth >= 100) return { text: `The crop reached ${game.crop.growth} %! Check its health: a healthy harvest can add 35 food, a weaker one adds 25.`, priority: 'normal' }
  if (game.crop.active && !game.crop.harvested) return { text: `The crop is at ${game.crop.growth} %. In ${game.crop.mode === 'normal' ? 'normal' : game.crop.mode === 'saving' ? 'saving' : 'off'} mode, growth and energy and water use change.`, priority: 'normal' }
  return { text: 'Follow the yellow arrow to your next goal. Press R next to the rover to drive faster!', priority: 'normal' }
}

export function resolveNovaDisplay(game: GameState | null, screen: GameScreen, novaLine: string | null): { text: string; priority: 'normal' | 'urgent' } {
  const contextualMessage = getNovaMessage(game, screen)
  if (contextualMessage.priority === 'urgent') return contextualMessage
  return screen === 'game' && novaLine ? { ...contextualMessage, text: novaLine } : contextualMessage
}
