# Mars Base

Explore a Martian valley, look after a crew and help NOVA keep the colony alive. Mars Base is an educational browser game for kids ages 7–12, built for the 2026 NASA Space Apps Challenge (*Build a Junior Astronaut Mission Trainer*). This README is a guide for players and has what you need to run the project.

## Your mission

Keep the colony running for eight sols (a **sol** is one Martian day). To win, the crew must reach the end with energy, water and food above zero, harvest at least one crop and keep the exposure level below 50.

The mission is split into 7 chapters shown at the top of the screen, one goal at a time. A **yellow arrow** on the map points to where you need to go (it turns red for urgent goals):

1. Collect a supply · 2. Build a greenhouse · 3. Plant seeds · 4. Build the rover garage · 5. Grow the crop to 100 % · 6. Harvest the food · 7. Keep the colony safe until sol 8

## Time

Each mission has its own sol length, so a whole game takes about 20–28 minutes:

| Mission | Sol length | Events |
| --- | --- | --- |
| First flight | 3 min | Dust storm on sol 3, solar storm on sol 6 |
| Extra reserves | 3.5 min | Dust storm on sol 4, solar storm on sol 7 (starts with more energy) |
| Early signals | 2.5 min | Dust storm on sol 2, solar storm on sol 5 |

To skip ahead, go into the habitat (press **E** at the door) and choose **Sleep until morning**. The night passes and the next sol starts with no extra cost. The “Advance to sol” button also works, but it costs 10 energy.

## Resources

- Every sol, life support uses 10 ⚡ energy, 2 💧 water and 3 🍞 food.
- **Walking costs a little too:** about 1 energy every 2,000 steps, 1 water every 5,000 and 1 food every 6,000. The rover uses only energy.
- **Cold nights:** on Mars nights colder than −97 °C (real archived NASA InSight temperatures), the crew eats 1 extra food to keep warm.
- **If energy, water or food reaches 0**, a red alert starts a 60-second countdown. Follow the arrow to a supply and refill it, or the mission ends.

The valley has crates, ice deposits and battery cells. Walk to one and press **E**: a ring fills up while you collect it. Each spot refills a few sols later. They are story items placed by the expedition, not NASA data.

## Buildings

Walk to a free plot, tap it and open **Build**. The crew builds until the sol ends; you can keep exploring meanwhile, and a ⚙️ shows the progress.

| Building | Cost | What it does |
| --- | --- | --- |
| 🌱 Greenhouse | 2 spare parts | Lets you plant seeds. After a harvest you can plant again if you have a seed. |
| 🚙 Rover garage | 2 spare parts | Unlocks the Mars rover: press **R** next to it to drive twice as fast. |
| 💧 Water extractor | 2 spare parts | +5 water every sol from underground ice. |
| 🛡️ Storm bunker | 1 spare part | An extra safe zone for solar storms (entering costs 3 energy). |
| ☀️ Second solar panel | 2 spare parts | +6 energy every sol (+2 during a dust storm). |

## Crops

Plant in the greenhouse (25 energy, 10 water, 1 seed). The plant grows each time a sol ends: 🌱 → 🌿 → 🪴 → 🥬. Normal mode grows 20 points per sol, saving mode 10 and uses less energy and water. A healthy harvest gives 35 food.

## Storms and safe zones

- **Dust storm:** a big card asks you to choose: 🐢 save energy (slower plants) or 🚀 keep growing fast (uses more energy).
- **Solar storm:** run to a safe zone before the timer ends: 🏠 the habitat (6 energy), 🛡️ a storm bunker (3 energy) or 🕳️ the lava tube cave (free, but far). Lava tubes are real places scientists study as possible shelters. If you don't make it, the exposure level goes up by 60.
- **Obstacles:** crater rims and rocks block the way, and soft dunes slow you down. Go around them.

## NOVA, visitors and the ending

NOVA gives tips in her own window. The astronauts in the valley talk in speech bubbles over their heads: walk up and press **E**. Keep an eye on the sky on sol 1…

When the mission ends you get a rocket launch and a printable **Junior Astronaut Certificate**, or a rescue ship with a tip from NOVA for the next try.

## NASA data used

| Source | What the game reads | What it changes |
| --- | --- | --- |
| [DONKI GST](https://api.nasa.gov/) via api.nasa.gov (live, last 30 days) | Strongest geomagnetic storm (Kp index) | Seconds to reach a safe zone in the solar storm: calm 50 s, active 45 s, stormy 35 s |
| [DONKI CME](https://api.nasa.gov/) (live, last 30 days) | Number and speed of coronal mass ejections | Shown in the solar alert and the NASA Science panel |
| [DONKI FLR](https://api.nasa.gov/) (live when available) | Solar flares | Shown in NASA Science; the endpoint sometimes answers 404, so the game keeps its archived X1.2 flare (January 3, 2025) |
| [InSight Mars Weather Service](https://api.nasa.gov/) (archived) | Night temperatures at Elysium Planitia, sols 675–681 (October 2020) | Cold nights (below −97 °C) make the crew eat 1 extra food |

The game reads these when it opens and caches them for 6 hours. If the API cannot be reached (offline, or the DEMO_KEY limit of 30 requests per hour is used up), it uses an archived snapshot from November 16, 2026 and says so. Space weather is measured near Earth, and InSight stopped sending weather in 2020; the game labels both. Energy, water, food, exposure and other numbers are game values chosen by the team.

To use your own free key, copy `.env.example` to `.env.local` and set `VITE_NASA_API_KEY`.

## Running the project

Dependencies are pinned in `package-lock.json`.

```bash
npm ci
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
- `src/components/`: map (and `MapExtras` for the rover, new buildings and guide arrow), HUD, construction, crops, events, objectives, NOVA, results and sources.
- `src/engine/`: state, rules, actions, events, objectives, safe zones, previews and mission report.
- `src/store/useGameStore.ts`: the single game store, NASA data and UI preferences.
- `src/data/mars/`: world, terrain (obstacles, dunes, safe zones), plots, visitors, supplies and movement.
- `src/data/nasa/`: NASA API client, archived snapshots and source attribution.
- `src/tests/`: rules, routes, store, movement, terrain, NASA parsing and the launch screen.

## Project documents (team, in Spanish)

- `AGENTS.md`: repository conventions.
- `NASA_AGENTE_IA_v3.md`: original V3 architecture and user stories.
- `docs/NASA_Documento_Maestro_v3.docx`: main specification and original acceptance criteria.
- `QA.md`: checks run and pending work.
- `docs/GUIA_CONTINUIDAD_BASE_MARTE.md`: changes after V3 and how to continue the project.
