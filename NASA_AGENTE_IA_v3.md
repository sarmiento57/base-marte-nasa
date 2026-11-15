# NASA_AGENTE_IA_v3.md — Contrato de implementación para Base Marte

> **Versión 3.0 · 14 de noviembre de 2026.** Proyecto del NASA Space Apps Challenge 2026, reto **Build a Junior Astronaut Mission Trainer**. Este documento es una instrucción de trabajo para un agente de IA; no es evidencia de que el videojuego ya esté desarrollado.
>
> Esta versión está **sincronizada con `NASA_Documento_Maestro_v3.docx`**. Sustituye a `NASA_AGENTE_IA_v2.md` y al archivo Maestro anterior. Las decisiones de equipo vigentes constan en §16; ante otra divergencia no resuelta, detener solo la parte afectada y pedir una decisión antes de implementarla.

## 0. Prioridad de fuentes y trabajo

1. Leer **NASA_Documento_Maestro_v3.docx** y esta guía completa antes de cambiar archivos.
2. Respetar la propuesta inicial `propuesta-juego-base-marte.md`. El backlog de 68 HU `base_marte_backlog_historias_usuario.md` describe el producto completo, **NO** es el alcance del hackatón.
3. Implementar primero **BM-01 a BM-21 y BM-26 a BM-27 (23 P0)**. `BM-22 a BM-25` y `BM-28` son cinco mejoras **P1**; solo después del flujo completo y del QA. BM-02, BM-15, BM-17 y BM-18 incluyen las cinco mejoras competitivas (guía robótica, misiones/recompensas, NASA, vista previa, informe final).
4. Los parámetros de balance son **reglas del videojuego**, no datos NASA. Identificarlos en interfaz y documentación.
5. No prometer características no implementadas ni afirmar que una API respondió si se usó un archivo local.
6. Las reglas de la sección 6 están **cerradas**. Si una regla necesaria no aparece ahí, el agente se detiene y pide decisión al equipo; no la inventa.
7. El asistente robótico **NOVA** es obligatorio en P0, siempre accesible, determinista y local: **no** usa APIs de IA conversacional ni recopila datos infantiles.

## 1. Meta verificable del MVP

El usuario entra sin cuenta; inicia una misión de 8 soles; recorre a pie un valle marciano 2D amplio con cámara cenital; construye un invernadero (y, si quiere, un segundo panel); asigna al astronauta una tarea por sol; siembra; avanza soles; enfrenta una tormenta de polvo y una alerta de actividad solar; toma decisiones con efectos visibles sobre recursos y crecimiento; cosecha; concluye en victoria o derrota; recibe un **informe final causal** con vínculo al evento histórico DONKI. **NOVA**, un robot visible durante todo el juego, acompaña la introducción, avisa los riesgos, explica el costo de cada elección y celebra los logros. Antes de confirmar decisiones se presenta una vista previa de consecuencias. Los objetivos de la misión están siempre disponibles; las insignias son P1.

El recorrido libre es una capa de juego acordada por el equipo: el jugador mueve al astronauta; para construir, sembrar o cosechar debe acercarse a la parcela o al invernadero. Caminar no consume recursos ni avanza el sol. La referencia de mundo abierto se limita a la vista cenital y la exploración, conservando el contenido educativo infantil de Base Marte.

Deben existir al menos **dos rutas ganadoras distintas y dos rutas perdedoras distintas**, reproducibles con estado determinista (sección 10). La demo debe funcionar **sin consultar NASA durante la partida**.

## 2. Stack obligatorio para el MVP

- React + TypeScript + Vite; estilos con Tailwind CSS.
- **Mapa de exploración 2D en SVG/DOM.** El mundo mide 4,800 × 3,200 unidades, la cámara sigue al astronauta y se puede caminar con WASD/flechas, pad táctil mantenido o clic/tap para caminar al punto. Conserva 6–12 parcelas de construcción, con lista en HTML accesible. Construir exige estar a 180 unidades de la parcela; sembrar y cosechar exigen estar a 180 unidades del invernadero. Caminar no consume recursos ni tiempo de misión. No hace falta Phaser para esta vista cenital.
- Zustand para almacenar/derivar estado; motor puro en TypeScript sin efectos DOM.
- Vitest para tests del motor; Playwright opcional. La prueba E2E manual es imprescindible.
- Datos archivados en `src/data/nasa/`. Guardado local opcional, versionado y validado (BM-22). SIN login, backend, base SQL, SSR, multijugador ni 3D.
- `npm run build` debe producir `dist/` lista para hosting estático. Comprobar `npm run preview`.

## 3. Estructura sugerida (adaptar solo con justificación)

```text
base-marte/
  public/assets/                  # sprites originales, fondos y licencias
  src/
    app/App.tsx
    components/MarsMap.tsx        # mapa SVG/DOM con parcelas seleccionables
    components/Hud.tsx
    components/ActionPanel.tsx
    components/EventDialog.tsx
    components/SciencePanel.tsx
    components/EndMission.tsx
    components/Tutorial.tsx
    components/NovaAssistant.tsx         # robot presente y ayuda contextual
    components/DecisionPreview.tsx       # costo inmediato y futuro calculado
    components/MissionChecklist.tsx      # objetivos verificados por GameState
    components/MissionReport.tsx         # informe causal (usado por EndMission)
    engine/types.ts
    engine/config.ts              # ÚNICO archivo de constantes de balance
    engine/createInitialGame.ts
    engine/advanceSol.ts
    engine/actions.ts
    engine/events.ts
    engine/evaluateMission.ts
    engine/explanations.ts
    engine/previewDecision.ts         # función pura sin mutar estado
    engine/buildMissionReport.ts      # métricas y decisiones del registro
    assistant/novaRules.ts            # mensajes, desencadenantes, prioridades
    store/useGameStore.ts
    data/nasa/donki-event.json
    data/nasa/sources.ts
    styles/index.css
    tests/engine.test.ts
  README.md
  QA.md
  NASA_AGENTE_IA_v3.md
  package.json
```

La ruta `config/simulation.ts` que menciona BM-08 en el Documento Maestro 1.0 es un error: el archivo es `engine/config.ts`.

## 4. Reglas obligatorias de arquitectura

- `GameState` es la única fuente de verdad. No recalcular inventario dentro de componentes React.
- `advanceSol(state): GameState` y todas las acciones son **funciones puras**: mismo input => mismo output; sin `Date.now()`, `Math.random()` o `localStorage` dentro del motor.
- Un botón «Avanzar» despacha como máximo un turno; impedir clic duplicado y no avanzar con eventos sin resolver.
- Los recursos se actualizan atómicamente, con límite inferior de 0 y superior de capacidad.
- Separar: datos NASA verificados / interpretación didáctica / reglas de balance. NO usar valores DONKI como dosis local de radiación en Marte.
- Textos para el niño en español claro. **Máximo 2 frases y unas 25 palabras por mensaje**; cada recurso y cada opción lleva icono además de texto. La atribución científica contiene fuente oficial y fecha.
- **NOVA no puede cambiar el estado ni seleccionar acciones**; deriva sugerencias de `GameState`, acciones y eventos. Su panel puede minimizarse, pero su acceso queda visible en todas las vistas jugables. Los eventos críticos deben anunciarse también mediante el diálogo accesible.
- La **vista previa no descuenta recursos**: calcula usando las mismas reglas puras del motor; distingue efectos inmediatos verificados y estimaciones condicionadas para soles posteriores. Nunca anuncia una cosecha garantizada cuando depende de eventos futuros.

## 5. Modelos mínimos

```ts
type ResourceName = 'energy'|'water'|'food'|'spareParts'|'seeds';
type GreenhouseMode = 'normal'|'saving'|'off';
type LifeSupportStatus = 'stable'|'risk'|'critical';
type BuildingType = 'habitat'|'solar'|'greenhouse';
type EventKind = 'dust'|'solar';
type CrewTask = 'build'|'sow'|'harvest'|'shelter';
interface Resources { energy:number; water:number; food:number; spareParts:number; seeds:number; }
interface Crop { active:boolean; growth:number; health:number; mode:GreenhouseMode; consecutiveOffSols:number; harvested:boolean; }
interface Building { id:string; type:BuildingType; plotId:string; operational:boolean; }
interface GameEvent { id:string; kind:EventKind; sol:number; resolved:boolean; optionId?:string; }
interface DecisionLog { sol:number; action:string; cost:string; consequence:string; resourceDeltas:Partial<Resources>; kind:'action'|'turn'; }
type ScenarioId = 'standard'|'reserve-rich'|'early-events';
interface GameState {
  version:1; scenarioId:ScenarioId; eventSols:{dust:number;solar:number}; sol:number; maxSols:8;
  resources:Resources; buildings:Building[]; crop:Crop;
  crewBusy:boolean; crewTask?:CrewTask;      // una tarea por sol
  lifeSupport:LifeSupportStatus; lifeSupportReason:string;
  educationalRisk:number;                     // índice educativo 0–100
  events:GameEvent[]; log:DecisionLog[];
  gameOver:boolean; won:boolean; endReason?:'win'|'noHarvest'|'crewExposed'|'lifeSupport';
  solsCompleted:number; foodHarvested:number; shelterUsed:boolean;
  mapPosition:{x:number;y:number};
}
```

Añadir campos solo cuando sean necesarios para satisfacer una HU con criterio concreto.

## 5.1 Contrato de interfaz del asistente NOVA (BM-26, P0)

**Identidad:** pequeño robot flotante, expresivo, con nombre NOVA y aspecto amigable. En escritorio permanece anclado en una esquina inferior junto a un globo corto; en móvil queda un icono/botón fijo con «Ayuda» y panel plegable que no tapa el HUD ni las decisiones. Imagen de referencia conceptual en Documento Maestro v3.

**Mensajes mínimos, seleccionados por reglas locales (`assistant/novaRules.ts`):**

| Disparador | Texto de ejemplo (máx. 25 palabras) | Prioridad |
|---|---|---|
| Inicio de la partida | «¡Hola, comandante! Soy NOVA. Tu misión es cultivar, cuidar la energía y proteger a la tripulación». | Normal |
| Antes de construir | «Este edificio usa 2 repuestos. Revisá tu inventario antes de confirmar». | Normal |
| Energía menor a 20 | «¡Atención! Queda poca energía. Revisá cuánto necesita el soporte vital para el próximo sol». | Alta |
| Tormenta, según el escenario | «La tormenta reduce la energía solar. Ahorrar ralentiza el cultivo, pero protege tus reservas». | Alta |
| Alerta solar, según el escenario | «La actividad solar obliga a elegir: refugiar cuesta energía; continuar aumenta el índice educativo de exposición». | Alta |
| Cosecha | «¡Primera cosecha! Ahora la colonia tiene más comida para sostener a su tripulación». | Normal |
| Fin de partida | «Revisá el informe: muestra qué decisiones cambiaron el resultado de tu misión». | Normal |

**Prioridad de mensajes:** (1) evento/soporte vital crítico; (2) acción inválida; (3) tutorial solicitado; (4) crecimiento o logro. No cambiar el mensaje cada render, no repetirlo indefinidamente; permitir «Ocultar explicación» y «¿Por qué?» para reabrir. Si se minimiza, las alertas críticas deben seguir siendo accesibles y visibles en el sistema de eventos. No requiere reconocimiento de voz, chatbot ni conexión a internet.

**Pruebas BM-26:** siempre aparece icono NOVA al jugar; hay ayuda relevante al iniciar, sembrar, tormenta, actividad solar, energía baja y cierre; cerrar globo no impide jugar; botón accesible con teclado; ninguna sugerencia ejecuta acciones automáticamente; los textos son cortos y correctos.

## 5.2 Vista previa de decisiones (BM-27, P0)

Crear `previewDecision(state, command): DecisionPreview`, **pura** e independiente de UI. Devuelve `{ allowed, reason?, immediateDeltas, conditionalEffects, affectedSols, assumptions }`. No cambia el estado ni registra un turno. Conectar los costos al mismo `engine/config.ts` y a las validaciones reales del motor; no escribir cifras duplicadas en el frontend.

Antes de **construir, sembrar, cambiar el modo, elegir una opción de tormenta, refugiarse o continuar trabajando**, mostrar:

1. **Costo ahora**: valores exactos y disponibilidad (p. ej. «−2 repuestos»).
2. **Efecto al avanzar**: variaciones estimadas bajo las condiciones actuales (p. ej. «+10 crecimiento por sol en ahorro»).
3. **Posible consecuencia futura**: texto explícitamente condicionado (p. ej. «La cosecha puede retrasarse si mantenés el modo ahorro»).
4. **Confirmar / Volver**: una confirmación ejecuta una sola vez; cancelar no altera recursos.

**Pruebas BM-27:** para cada acción válida el costo previo coincide con el descuento al ejecutarla; con recursos insuficientes se bloquea y se indica por qué; un evento modifica la previsión; cerrar o cancelar es neutro; ninguna predicción afirma resultado garantizado sin considerar eventos.

Las acciones físicas de construcción, siembra y cosecha también se bloquean fuera del rango de interacción; la vista previa y el mensaje explican que el astronauta debe caminar hasta el sitio.

## 5.3 Misiones, recompensas y reporte educativo

- **P0, BM-02:** tres objetivos visibles: completar 8 soles, recoger cosecha y proteger a la tripulación; no añadir niveles adicionales. Los objetivos se marcan exclusivamente desde el estado.
- **P1, BM-24:** tarjetas de metas educativas («Construir invernadero», «Superar tormenta», «Primera cosecha») con progreso verificado, sin nuevos niveles. **BM-28:** insignias «Primera cosecha» y «Tripulación a salvo» al cumplir condiciones reales; no agregan energía ni alteran el motor. No implementar campaña.
- **P0, BM-18:** `buildMissionReport(GameState)` devuelve número de soles completados, cantidad efectivamente cosechada, recursos finales, índice educativo, condición del soporte vital, dos decisiones reales seleccionadas del `log`, consecuencia sustentada por ese registro y **un consejo accionable**. Debe explicar causa de derrota conforme al `endReason`. NOVA presenta la introducción del informe, sin inventar razones.

## 6. Reglas cerradas de balance (valores inventados por el equipo)

Todo lo de esta sección vive en `engine/config.ts`. Mostrar en la interfaz la leyenda «Valores simplificados del videojuego». NO atribuir estos números a NASA.

### 6.1 Tiempo y turno

- La partida empieza en el **sol 1**. Hay **8 avances**. El avance *n* resuelve el sol *n*. Se evalúa al completar el avance 8, salvo que un cierre crítico termine antes la partida.
- En cada sol el jugador puede: resolver el evento del sol (si hay), asignar **una** tarea al astronauta y pulsar «Avanzar sol».
- El jugador puede caminar en cualquier momento; caminar no consume recursos ni hace avanzar el sol.

### 6.2 Estado inicial

| Recurso | Inicial | Capacidad |
|---|---|---|
| Energía | **48** | 100 |
| Agua | 60 | 100 |
| Comida | 22 | 100 |
| Repuestos | 4 | — |
| Semillas | 1 paquete | — |

Edificios iniciales: hábitat y un panel solar, ya operativos. El invernadero **no** está construido. El mundo contiene 11 parcelas distribuidas por el valle; hay parcelas libres, edificios iniciales y terreno bloqueado. Escenarios deterministas BM-25:

| Escenario | Energía inicial | Tormenta | Alerta solar |
|---|---:|---:|---:|
| Primer vuelo | 48 | sol 3 | sol 6 |
| Reserva reforzada | 56 | sol 4 | sol 7 |
| Señales tempranas | 48 | sol 2 | sol 5 |

### 6.3 Tripulación (BM-12)

- Un astronauta. Estados «Libre» y «Ocupado».
- Construir, sembrar y cosechar ocupan al astronauta **el resto del sol**. Hay que acercarse a la parcela o invernadero (180 unidades) para empezar la tarea. Caminar hacia el lugar no avanza el sol ni consume recursos; el astronauta queda libre al avanzar.
- Consecuencia: como máximo una tarea por sol. Por eso no se puede construir el invernadero y sembrar el mismo sol.

### 6.4 Construcción (BM-08)

| Edificio | Costo | Efecto |
|---|---|---|
| Invernadero | 2 repuestos | Habilita sembrar |
| Segundo panel solar | 2 repuestos | +6 energía/sol (+2 durante la tormenta) |

Máximo uno de cada uno. Los costos se muestran antes de confirmar. Los repuestos alcanzan para ambos.

### 6.5 Energía y soporte vital (BM-05, BM-06)

- Generación del panel inicial: +18 energía/sol; **+5 durante la tormenta**.
- Soporte vital por sol: −10 energía, −2 agua, −3 comida. Se cobra antes que el invernadero.
- Cada demanda se cubre completa o no se cubre: si el recurso no alcanza, queda en 0 y esa demanda cuenta como **no cubierta**.
- Estado del soporte vital, recalculado tras cada avance:
  - **Crítico**: alguna demanda no se cubrió en el último avance.
  - **En riesgo**: todo cubierto, pero energía < 20, agua < 10 o comida < 10.
  - **Estable**: el resto.
- `lifeSupportReason` nombra el recurso causante («Queda poca energía»).
- Un solo cierre en estado **Crítico** termina la misión inmediatamente con causa `lifeSupport`; no hay racha de críticos.

### 6.6 Cultivo (BM-09, BM-10, BM-11)

- **Sembrar** (tarea): −25 energía, −10 agua, −1 semillas. Requiere invernadero, astronauta libre y recursos suficientes. No da comida inmediata.
- Por avance, mientras el crecimiento sea < 100:
  - **Normal**: −8 energía, −3 agua, +20 crecimiento.
  - **Ahorro**: −4 energía, −2 agua, +10 crecimiento.
  - **Apagado**: sin consumo ni crecimiento.
- Si tras el soporte vital no alcanzan la energía o el agua del modo, ese sol no hay consumo ni crecimiento y cuenta como sol apagado.
- Salud inicial 100. A partir del **segundo sol apagado consecutivo**, −25 de salud por sol. Un sol con crecimiento reinicia el contador.
- Con crecimiento 100 el cultivo deja de consumir.
- **Cosechar** (tarea): requiere crecimiento ≥ 100 y salud ≥ 50. Da **35** de comida si la salud es ≥ 75 y **25** si está entre 50 y 74, limitada por la capacidad. Una sola vez. Con salud < 50 el cultivo se pierde y la pantalla lo explica.

### 6.7 Tormenta de polvo (BM-13)

- Aparece en el sol de tormenta del escenario elegido y afecta ese sol y el siguiente. En el escenario estándar llega en el sol 3 y afecta los soles 3 y 4. Es una regla didáctica, no un dato NASA.
- Decisión obligatoria antes de avanzar:
  - **«Modo ahorro»**: el cultivo pasa a ahorro durante los soles 3 y 4.
  - **«Continuar normal»**: el cultivo sigue en normal.
- Al sol siguiente a los dos soles de tormenta el cultivo vuelve a normal automáticamente y se avisa: «La tormenta terminó».

### 6.8 Alerta de actividad solar (BM-14)

- Aparece al inicio del sol de alerta solar del escenario elegido (sol 6 en el escenario estándar). Decisión obligatoria antes de avanzar:
  - **«Refugiar tripulación»**: −6 energía inmediatos y el astronauta queda ocupado todo ese sol (no puede construir, sembrar ni cosechar ese sol).
  - **«Continuar trabajando»**: sin costo de energía; el índice educativo de exposición sube **+60**.
- Si la energía es menor que 6, «Refugiar» aparece desactivada con el motivo: «No guardaste energía para el refugio».
- El índice se etiqueta siempre «Índice educativo»; no es una dosis ni un efecto médico.

### 6.9 Final de misión (BM-18)

Un cierre crítico termina de inmediato en derrota por soporte vital. Si no hubo cierre crítico, al terminar el avance 8 hay victoria solo si se cumplen las tres:

1. Cosecha recogida.
2. Soporte vital no crítico.
3. Tripulación a salvo: índice educativo de exposición **< 50**.

Si falla alguna, la misión termina en derrota con `endReason` y una explicación causal. Prioridad del motivo mostrado: soporte vital, tripulación expuesta, sin cosecha.

### 6.10 Orden exacto de `advanceSol`

1. Rechazar si hay evento sin resolver o `gameOver`.
2. Sumar generación solar del sol (con tormenta y segundo panel si aplican), con tope de capacidad.
3. Cobrar soporte vital demanda por demanda.
4. Cobrar el cultivo según modo y disponibilidad; actualizar crecimiento, contador de soles apagados y salud.
5. Recalcular estado y causa del soporte vital.
6. Registrar en `log` los cambios con su causa.
7. Si el soporte vital quedó Crítico, terminar inmediatamente con causa `lifeSupport`. Si era el avance 8, evaluar el resultado final. En otro caso, pasar al sol siguiente, liberar al astronauta y crear el evento de ese sol.

## 7. Orden de ejecución para un agente autónomo

1. Inicializar Vite React TypeScript y dependencias. Crear README con comandos comprobados. **Desplegar ya una página mínima** en el hosting estático elegido y abrir la URL en incógnito.
2. **En paralelo (una persona del equipo):** descargar y verificar el registro DONKI real, guardarlo en `src/data/nasa/donki-event.json` con URL y fecha de extracción (sección 8.1).
3. Implementar `types`, `config`, `createInitialGame`, `actions`, `advanceSol`, `evaluateMission` y tests. Los tests deben reproducir las cuatro rutas de la sección 10 con sus valores exactos. Verificar BM-04/05/06/09/10/11/12/18.
4. Implementar portada, HUD, tutorial, objetivos y diálogos en React. Conectar Zustand al motor. **Añadir NOVA siempre accesible** con mensajes por reglas locales y botón de ayuda. Verificar BM-01/02/03/17/26.
5. Crear el mapa SVG/DOM con parcelas seleccionables, panel e invernadero; integrar **vista previa real de costos** antes de confirmar cualquier acción. Verificar BM-07/08/27.
6. Incorporar tormenta y alerta solar con sus decisiones. Verificar BM-13/14.
7. Construir la ficha «Ciencia detrás del juego» con el registro DONKI y el modo offline. Verificar BM-15/16.
8. Final de misión con informe de 3+ métricas, dos decisiones comprobables, un consejo, NOVA y reinicio. Reproducir en navegador las dos rutas ganadoras y dos perdedoras de la sección 10.
9. Revisar móvil a 375 px, accesibilidad, build y vista previa. Volver a desplegar. Registro QA. Verificar BM-19/20/21.
10. Solo entonces, si se terminó el P0, elegir **a lo sumo una** mejora P1: preferir tarjetas de metas BM-24 o insignias BM-28 por ser de bajo riesgo y no alterar el motor.

## 8. Protocolo para usar agentes de IA de forma segura

- Antes de modificar: leer archivos existentes, mostrar lista de cambios prevista y la HU que se va a resolver.
- Trabajar en una historia/vertical slice a la vez. No reescribir componentes no relacionados ni sustituir librerías sin aprobación del equipo.
- Al cerrar una HU, ejecutar tests y build, verificar criterios y registrar en `QA.md`: `HU`, archivo(s), prueba, resultado, incidencias, pendiente.
- Si una API no responde, preservar la interfaz con JSON archivado legítimo y notificar que está en modo offline.
- Nunca generar datos históricos falsos. Si no se pudo verificar un registro DONKI real, incluir un ejemplo claramente marcado `DEMO_SIMULADA` y registrar BM-15 como NO TERMINADA, nunca como aprobada.
- Nunca presentar ilustraciones generadas por IA como mapas o fotografías científicos reales de NASA.
- Usar commits pequeños: `feat(engine): ...`, `feat(greenhouse): ...`, `test(engine): ...`, `docs(nasa): ...`.
- Prohibido marcar una HU como terminada solo porque el agente generó código: debe probarse desde el navegador.
- Cambiar una constante de balance exige volver a pasar los tests de las cuatro rutas y anotar el cambio en `QA.md`.

### 8.1 Elección del registro DONKI

- Lo descarga y verifica una persona del equipo, no el agente.
- Preferir una fulguración (FLR) o un evento de partículas (SEP) cuyo efecto también se haya observado en Marte, porque conecta el dato con el escenario del juego. Candidato a comprobar: la fulguración de septiembre de 2017. **Es una sugerencia sin verificar**: confirmar en DONKI que el registro existe y en una fuente oficial de NASA que hubo observación en Marte antes de afirmarlo en la ficha.
- Guardar el JSON tal como lo devuelve la API, sin editar campos.

## 9. Criterios mínimos de calidad (DoD)

- Ejecutan: `npm install`, `npm run dev`, `npm run test`, `npm run build`, `npm run preview`.
- No hay errores críticos de consola ni imports faltantes; imágenes locales o con derechos verificados.
- Se puede jugar un recorrido completo de 8 soles y finalizarlo.
- NOVA permanece disponible en el juego, da ayudas correctas y no bloquea controles ni tapa alertas en móvil.
- Todas las decisiones con coste incluyen vista previa antes de confirmar, y el informe final se basa en el registro real de la partida.
- Los objetivos de misión son comprobables; las insignias son opcionales, no se incluyen como P0.
- Los costos de una acción se aplican exactamente una vez; no aparecen recursos negativos; ningún evento deja el turno bloqueado sin salida.
- Los tests del motor reproducen los valores de la sección 10.
- Hay un evento NASA real con atribución válida, o se declara explícitamente pendiente.
- El juego ofrece la misma información esencial en móvil, sin ocultar la explicación educativa.
- No recopila datos personales de niños.

## 10. Rutas de referencia verificadas

Valores **después de cada avance**, calculados con una simulación de las reglas de la sección 6. Sirven como valores esperados de los tests y como guion de la demo. Formato: energía / agua / comida / crecimiento.

### Ruta A — Victoria ahorrando en la tormenta

Sol 1 construir invernadero · sol 2 sembrar · sol 3 «Modo ahorro» · sol 6 «Refugiar» · sol 8 cosechar.

| Avance | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Energía | 56 | 31 | 22 | 13 | 13 | 7 | 7 | 15 |
| Agua | 58 | 43 | 39 | 35 | 30 | 25 | 20 | 18 |
| Comida | 19 | 16 | 13 | 10 | 7 | 4 | 1 | 33 |
| Crecimiento | 0 | 20 | 30 | 40 | 60 | 80 | 100 | 100 |

Resultado: victoria. La cosecha llega el último sol, con 1 de comida restante.

### Ruta D — Victoria invirtiendo en el segundo panel

Sol 1 construir invernadero · sol 2 sembrar · sol 3 «Continuar normal» y construir panel · sol 6 «Refugiar» · sol 7 cosechar.

| Avance | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Energía | 56 | 31 | 20 | 9 | 15 | 15 | 29 | 43 |
| Agua | 58 | 43 | 38 | 33 | 28 | 23 | 21 | 19 |
| Comida | 19 | 16 | 13 | 10 | 7 | 4 | 36 | 33 |
| Crecimiento | 0 | 20 | 40 | 60 | 80 | 100 | 100 | 100 |

Resultado: victoria, con cosecha un sol antes y más energía al final.

### Ruta B — Derrota por no guardar energía

Sol 1 construir invernadero · sol 2 sembrar · sol 3 «Continuar normal», sin panel · sol 6: energía 5, «Refugiar» desactivada, solo queda «Continuar trabajando» · sol 7 cosechar.

| Avance | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Energía | 56 | 31 | 18 | 5 | 5 | 5 | 13 | 21 |

Resultado: derrota, `crewExposed`. Hubo cosecha, pero la tripulación quedó expuesta. Mensaje: gastar toda la energía en la tormenta dejó a la base sin refugio.

### Ruta C — Derrota por no sembrar

Sin tareas; sol 6 «Refugiar».

| Avance | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Energía | 56 | 64 | 59 | 54 | 62 | 64 | 72 | 80 |
| Comida | 19 | 16 | 13 | 10 | 7 | 4 | 1 | 0 |

Resultado: derrota, `lifeSupport`. En el avance 8 la comida no alcanza y no hay cosecha.

### Alcance de la verificación

- La simulación recorrió las 952 combinaciones válidas de tareas por sol y de las dos decisiones: 21 ganan, 901 terminan sin cosecha y 30 con la tripulación expuesta.
- **No cubrió** los cambios manuales de modo fuera de la tormenta ni el modo apagado. Esos casos (salud del cultivo, cosecha reducida de 25) quedan `Pendiente de QA` hasta tener tests propios.
- El equipo eligió terminar la misión en el primer cierre crítico; `src/tests/engine.test.ts` comprueba esa derrota inmediata.
- La simulación es un script aparte, no el motor en TypeScript. Si el motor da otros números, el error está en uno de los dos: revisar antes de tocar constantes.

## 11. Cronograma de referencia

El cierre de entregas, según el Documento Maestro, es el **15/11 a las 23:59 hora local**; confirmarlo en la página del evento local. Las horas H cuentan desde el inicio real del equipo.

| Tramo | Prioridad | Entregable / puerta de calidad |
|---|---|---|
| H0–H2 | P0 | Repositorio, instalación, **URL pública con página mínima**, **JSON DONKI descargado y verificado**, pantallas definidas |
| H2–H7 | P0 | Motor y tests; las cuatro rutas de la sección 10 pasan |
| H7–H12 | P0 | Inicio, HUD, mapa SVG, NOVA, construcción, vista previa y turno jugable |
| H12–H16 | P0 | Dos eventos, ayudas de NOVA, consecuencias y reporte final causal |
| H16–H19 | P0 | Ficha de ciencia con el registro DONKI, modo offline, QA inicial |
| H19–H21 | P0 | Responsive 375 px, build, redespliegue y prueba en incógnito. **Congelar funciones al terminar este tramo** |
| H21–H24 | P0 | Video o presentación, capturas del juego real, descripción, revisión y envío |

Puertas fijas de reloj, independientes de las horas H: funciones congeladas a más tardar el **15/11 a las 17:00** y formulario enviado antes de las **21:00**, para dejar margen ante fallos de la plataforma. Revisar en la página oficial el formato exigido de la demo y la declaración de uso de IA antes de grabar.

Este cronograma es una distribución sugerida de trabajo, no una garantía de entrega.

## 12. Límites estrictos durante el hackatón

No hacer en MVP: login, base de datos, backend, perfiles, inventario de 20 materiales, camino A*, escaneo orbital complejo, pedidos de naves con logística completa, multijugador, IA de conversación en tiempo real, varios mundos, mapas NASA presentados como aptitud exacta de construcción, 3D, motores físicos complejos, Phaser antes de terminar el P0.

El backlog original de 68 HU sigue existiendo como fase posterior. Las cinco mejoras aprobadas quedan repartidas así: **NOVA BM-26 P0, misiones BM-02 P0, metas BM-24 P1 e insignias BM-28 P1, evento NASA BM-15 P0, vista previa BM-27 P0, informe BM-18 P0**. Los dos documentos v3 deben permanecer sincronizados.

## 13. Comunicación con el equipo

Cada entrega del agente debe informar: **(1) HU resueltas, (2) archivos modificados, (3) pruebas ejecutadas y resultados, (4) cambios de alcance, (5) próximo paso.** Si no se pudo probar una función, marcarla `Pendiente de QA`.

## 14. Fuentes científicas y técnicas

- Reto NASA: https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/
- Cronograma de NASA: https://www.spaceappschallenge.org/2026/
- NASA Open APIs: https://api.nasa.gov/
- DONKI documentación: https://ccmc.gsfc.nasa.gov/tools/DONKI/
- Vite build y publicación: https://vite.dev/guide/static-deploy
- Phaser (solo P1): https://docs.phaser.io/

## 15. Historias añadidas y pruebas de las cinco mejoras — v3

### BM-26 · Asistente robótico NOVA siempre disponible [P0]
**Como** niño comandante, **quiero** un robot que me guíe y avise los riesgos en todas las pantallas jugables, **para** comprender la misión y actuar sin confundirme.
**Criterios:** robot visible/accesible, mensajes contextuales del estado, alertas prioritarias, plegado no intrusivo, español infantil, cero acciones automáticas, funcionamiento offline, accesibilidad móvil/teclado.

### BM-27 · Previsualizar efectos antes de confirmar [P0]
**Como** jugador, **quiero** conocer costo inmediato, efecto al siguiente sol y consecuencias posibles antes de decidir, **para** entender el intercambio entre recursos.
**Criterios:** mismo motor y configuración; no descontar en modo vista previa; confirmar/cancelar; errores de recurso; predicción condicionada, sin resultados garantizados.

### BM-28 · Insignias y metas de aprendizaje [P1]
**Como** jugador, **quiero** recibir insignias cuando cosecho y protejo la base, **para** reconocer qué aprendí.
**Criterios:** mínimo dos insignias verificadas por hechos del estado, sin duplicación, sin cambiar recursos, visibles en pantalla de fin; se pueden omitir sin afectar el P0.

### BM-25 · Variaciones deterministas de partida [P1]
**Como** jugador, **quiero** elegir una variación inicial reproducible, **para** ensayar otra estrategia.
**Criterios:** tres escenarios prefijados: Primer vuelo (48 energía, tormenta 3, alerta 6), Reserva reforzada (56 energía, tormenta 4, alerta 7) y Señales tempranas (48 energía, tormenta 2, alerta 5). No se alteran los datos NASA y no se usa aleatoriedad.

**Mejoras en historias existentes:** BM-02 incluye objetivos cortos visibles; BM-24 añade metas guiadas solo P1; BM-15 mantiene registro NASA histórico y atribución; BM-17 exige relación causal tras decisiones; BM-18 presenta informe completo con dos decisiones reales; BM-19 garantiza robot usable en móvil; BM-20 añade tests de mensajes/previsualizaciones e informe.

**QA adicional:**
- QA-16: NOVA se ve en partida, no tapa modal y ofrece ayuda contextual para energía baja, tormenta y alerta solar.
- QA-17: el usuario minimiza NOVA; el botón «Ayuda» sigue visible y recupera el mensaje. Con Tab/Enter se opera.
- QA-18: vista previa de construir/sembrar/refugiar coincide con costo real; cancelar no modifica `GameState`.
- QA-19: resumen de ruta ganadora y perdedora muestra el motivo y dos decisiones del registro, sin inventar acciones.
- QA-20 [P1]: insignias entregadas una vez, sin modificar el balance.

## 16. Control de versiones y decisiones cerradas v3

- **Documentos alineados**: `NASA_Documento_Maestro_v3.docx` + `NASA_AGENTE_IA_v3.md`; las decisiones de esta rama se incorporan a los dos archivos sin cambiar el identificador V3.
- **Balance conservado para Primer vuelo**: 48 energía inicial; tormenta en soles 3–4; actividad solar en sol 6; refugio cuesta 6 y ocupa astronauta sin detener el cultivo automáticamente; continuar expone +60; victoria exige índice < 50; segundo panel cuesta 2 repuestos y genera +6/+2.
- **Cierre BM-06 acordado por el equipo**: un cierre de soporte vital crítico termina la misión de inmediato. Se elimina la regla anterior de dos cierres críticos consecutivos.
- **BM-25 acordado por el equipo**: usar tres variaciones deterministas de energía inicial y soles de evento, detalladas en §6.2. No alterar registros NASA.
- **Exploración acordada para Base Marte**: mundo 2D cenital de 4,800 × 3,200 unidades con cámara de seguimiento, movimiento por teclado, pad o clic/tap, y proximidad para acciones físicas. El movimiento no cambia recursos ni el turno; la referencia a mundo abierto se limita a exploración educativa.
- **Nuevas mejoras**: NOVA P0, previsualización P0, informe causal ampliado P0, tres objetivos visibles P0 y metas/insignias P1.
- **Fuera de alcance**: IA de chat en tiempo real, diálogos generados por modelo remoto, entrenamiento de modelos, síntesis de voz compleja, múltiples misiones desbloqueables y economía de recompensas.
- **Las imágenes son referencias artísticas**, nunca interfaces implementadas ni registros científicos de NASA.

> **Antes de cerrar una tarea:** comprobar criterios de aceptación + tests + `npm run build` + validación en navegador, registrar avances reales en `QA.md`. No declarar completada una HU no probada.
