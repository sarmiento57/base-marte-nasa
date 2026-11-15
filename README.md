# Mars Base

Explore a Martian valley, look after a crew and help NOVA keep the colony alive. Mars Base is an educational browser game for kids ages 7–12, built for the 2026 NASA Space Apps Challenge (*Build a Junior Astronaut Mission Trainer*). This README is a guide for players and has what you need to run the project.

## Your mission

Keep the colony running for eight sols (a **sol** is one Martian day). To complete the mission, the crew must reach the end with life support working, harvest at least one crop and keep the exposure level below 50. If energy, water or food runs out for life support when a sol closes, the mission ends.

## First steps

1. **Explore the valley.** Use WASD or the arrow keys. You can also click the ground and the astronaut will walk there. The radar shows where you are on the map.
2. **Check your reserves.** On the standard route you start with 48 energy, 60 water, 22 food, 4 spare parts and 1 seed. Every sol, life support uses 10 energy, 2 water and 3 food.
3. **Build a greenhouse.** Walk to a free plot, such as B1, open Construction and confirm the building. It costs 2 spare parts. While the crew is building you cannot move; the build finishes when the sol closes.
4. **Plant.** When the greenhouse is ready, walk to it and use the Greenhouse module. Planting costs 25 energy, 10 water and one seed.
5. **Care for the crop.** In Normal mode it grows up to 20 points per sol and uses 8 energy and 3 water. In Saving mode it grows up to 10 points and uses 4 energy and 2 water. Without resources it does not grow. You can spend 12 energy to boost it by up to 20 points once per sol.
6. **Harvest.** Walk to the greenhouse when the crop is ready. The mission needs at least one harvest to be completed.

## Time and resources

Each sol lasts six real minutes and closes automatically. The top bar shows how much time is left. To finish early, use the “Advance to sol” button: skipping ahead costs 10 energy, on top of the life support and crop use of that close. Waiting has no extra cost.

Solar panels recharge energy when the sol ends: the starting panel makes 18 in normal conditions and 5 during a dust storm. A second panel adds 6, or 2 during a storm. Check the Inventory and the preview before you spend your last reserves.

The map has five supply boxes. Walk to one and press **E** to collect it. Each box can be collected once, and the crew can collect one supply per sol:

- Backup battery: +20 energy.
- Water container: +20 water.
- Ration box: +18 food.
- Spare parts kit: +3 spare parts.
- Seed case: +2 seeds.

These boxes are story items placed by the expedition, not NASA data.

## Buildings and crops

- **Solar panel:** costs 2 spare parts and adds energy at the end of every sol, on top of the starting panel.
- **Greenhouse:** costs 2 spare parts and lets you plant. Building it does not plant anything by itself.
- **Normal mode:** faster growth, more water and energy.
- **Saving mode:** uses less, and the crop grows more slowly.
- **Off mode:** pauses growth. Several pauses in a row lower crop health.

Building, planting, harvesting, collecting a box or entering the shelter uses the crew's task for that sol. The astronaut is only locked in place while building and while inside the shelter.

## Alerts and shelter

When the solar alert appears, follow NOVA's warning and run to the habitat ship. Walk to the door and press **E** to get in before the 40-second countdown ends. The shelter costs 6 energy and keeps the crew inside until the sol closes. If time runs out before you arrive, the exposure level rises 60 points.

A dust storm lowers the energy the panels make for two sols. Open Alerts and choose whether to keep the crop at its normal pace or save energy.

## NOVA, visitors and screens

NOVA follows the astronaut and shares tips during the mission. Tap NOVA to hear the last message again. Walk up to the visiting astronauts and press **E** to talk. Keep your eyes on the sky: a mysterious ship sometimes flies across the valley.

The bottom dock opens Construction, Inventory, Mission, Alerts, Greenhouse, NASA Science, Logbook and NOVA without leaving the map. Use the full-screen button to play in the whole window.

## NASA data used

| Source | What we use | Where |
| --- | --- | --- |
| [DONKI – Space Weather Database (NASA CCMC)](https://ccmc.gsfc.nasa.gov/tools/DONKI/) via [NASA Open APIs](https://api.nasa.gov/) | An archived record of an X1.2 solar flare observed by GOES-P EXIS, peaking at 11:39 UTC on January 3, 2025, with its linked coronal mass ejection. | `src/data/nasa/donki-event.json`, shown in the NASA Science screen and linked from the solar alert. |

The DONKI record is historical, not live, and the game says so. It describes activity on the Sun, not a storm on Mars. The flare inspired the solar-alert mechanic; the energy, water, food, exposure level and all other gameplay numbers are game values chosen by the team, and the game labels them that way.

## Mission routes

You can choose a route from camp:

- **First flight:** 48 energy; dust storm on sol 3 and solar alert on sol 6.
- **Extra reserves:** 56 energy; dust storm on sol 4 and solar alert on sol 7.
- **Early signals:** 48 energy; dust storm on sol 2 and solar alert on sol 5.

## Running the project

Dependencies are pinned in `package-lock.json`.

```bash
npm install
npm run dev
```

Vite prints the local address. To check the project:

```bash
npm run test
npm run lint
npm run build
npm run preview
```

## Technology and structure

React, TypeScript, Vite, Tailwind CSS v4, Zustand, Lucide React and Vitest. The 2D map uses SVG and the DOM; there is no 3D engine and no backend.

- `src/app/`: home, mission, guide, science, report and navigation.
- `src/components/`: map, astronaut, HUD, construction, crops, events, objectives, NOVA and sources.
- `src/engine/`: state, rules, actions, events, previews and mission report.
- `src/store/useGameStore.ts`: the single game store and UI preferences.
- `src/data/mars/`: world, plots, visitors, story supplies, sightings and movement.
- `src/data/nasa/`: historical DONKI record and source attribution.
- `src/tests/`: rules, routes, store, movement, saving and local world.

## Project documents (team, in Spanish)

- `AGENTS.md`: repository conventions.
- `NASA_AGENTE_IA_v3.md`: original V3 architecture and user stories.
- `docs/NASA_Documento_Maestro_v3.docx`: main specification and original acceptance criteria.
- `QA.md`: checks run and pending work.
- `docs/GUIA_CONTINUIDAD_BASE_MARTE.md`: changes after V3 and how to continue the project.
