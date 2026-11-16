# Registro de validación de Base Marte

Actualizado: 15 de noviembre de 2026  
Rama: `feat/base-marte-juego-2d`

## Interfaz integrada

- La misión activa se muestra sin la cabecera, la navegación ni el pie de página del sitio. El mapa ocupa toda la ventana del escritorio y tiene control para activar pantalla completa del navegador.
- Las reservas de energía, agua, comida, repuestos y semillas quedan visibles sobre el mapa. El soporte vital y el sol actual se muestran en la barra superior.
- El dock del juego abre Construcción, Inventario, Misión, Alertas, Invernadero, Ciencia NASA, Bitácora y NOVA como paneles flotantes sobre el mapa.
- El inventario presenta cantidades, estructuras, soporte vital, riesgo educativo, cultivo y posición del astronauta.
- NOVA tiene una apariencia de hada robótica con alas luminosas y animación de vuelo dentro del mundo SVG; se mantiene junto al astronauta cuando camina.
- Cada cierto tiempo NOVA presenta una sugerencia temporal con acciones disponibles (explorar, revisar módulos, parcelas o cultivo). El jugador puede ignorarla o abrir su panel; no cambia el estado de la partida.
- Los avisos de acciones, los errores y las alertas aparecen dentro de la pantalla de juego.
- La alerta solar aparece como aviso urgente encima del mapa y también del panel abierto, con contador de 40 segundos, efectos visuales y acceso al registro NASA histórico.
- El aviso lleva al astronauta caminando hasta el hábitat. Entrar requiere proximidad, 6 de energía y deja a la tripulación dentro hasta cerrar el sol; la nave tiene una vista interior propia.
- Si termina el plazo, el motor cierra la alerta una sola vez, registra el retraso, aumenta 60 el índice educativo y NOVA informa la consecuencia. No se presenta como dosis ni como alerta NASA en vivo.
- El informe final queda dentro del entorno del juego; se puede cambiar a otros módulos o salir al campamento.
- La interfaz de juego está enfocada en escritorio, según lo solicitado. No se preparó una adaptación móvil en este cambio.
- Las acciones y recursos existentes siguen usando el store y las reglas del motor actuales; no se añadió estado duplicado ni nuevas dependencias.

## Comprobaciones del estado actual

| Comprobación | Resultado |
|---|---|
| `npm run test` | Correcto: 42 pruebas aprobadas en 5 archivos. Node mostró una advertencia experimental de `localStorage`. |
| `npm run lint` | Correcto, sin errores. |
| `npm run build` | Correcto: TypeScript y Vite; 2,118 módulos transformados. |
| `npm run dev` | No se inició una instancia nueva; el repositorio ya tenía el servidor de desarrollo activo. |
| Servidor del juego | La página activa en `127.0.0.1:5173` respondió HTTP 200 después de los cambios. |
| Guía Word | El DOCX se exportó a PDF y se revisaron sus tres páginas; título, listas y saltos quedan legibles. |
| Navegador de escritorio | La última revisión visual se hizo antes de integrar el nuevo reloj, las cajas de suministros y la cabina SVG. Falta recorrer esas pantallas en el navegador y observar el avance automático sin esperar seis minutos, usando un reloj de prueba. |
| `npm install` | No se ejecutó; las dependencias ya estaban instaladas y no se añadieron paquetes. |
| `git diff --check` | Correcto; Git puede avisar que normalizará LF a CRLF en Windows. |
| Publicación | Sin push ni merge. No se declara terminada ninguna historia BM por este cambio. |

## Consideraciones

El plazo de 40 segundos y el refugio físico amplían la resolución de alerta por panel descrita en V3. El sol ahora termina cada seis minutos y se puede adelantar por 10 de energía, mientras V3 solo definía el cierre manual. Las cajas de suministros son una mecánica solicitada después de V3 y están identificadas como carga narrativa, no como registro de NASA. La observación DONKI citada corresponde al Sol el 3 de enero de 2025. No se consultan avisos solares en vivo. El botón de pantalla completa solicita la API nativa del navegador; si no está disponible, se muestra un aviso dentro del juego.

## Rama feat/english-translation (15 de noviembre de 2026)

Cambios:

- Todo el texto del juego, los mensajes del motor, NOVA, los diálogos, `index.html` y el `README.md` pasaron a inglés. Los documentos internos del equipo siguen en español.
- Rendimiento: las capas fijas del mapa (terreno, rocas, puntos de referencia, parcelas, cajas, visitantes y edificios) se memorizan con `React.memo`. El astronauta se dibuja desde un estado local en cada fotograma y la posición se publica al store cada 200 ms y al detenerse, en lugar de cada 50 ms. El reloj del sol vive en el componente `SolClock` y la cuenta atrás solar ya no re-renderiza la pantalla cuando el segundo no cambia.
- Nave misteriosa: la animación SVG (`animateTransform`) contaba desde la carga de la página, así que al aparecer a los 8–30 s ya estaba terminada y la nave quedaba congelada fuera de la vista. Ahora el vuelo usa la Web Animations API desde que aparece, cruza la vista pasando cerca del astronauta, dura 7 s, sale siempre en el sol 1 (a los 20 s) y en la mitad de los soles siguientes.
- Las etiquetas de parcelas y cajas ajustan su ancho al texto.

| Comprobación | Resultado |
|---|---|
| `npm run test` | Correcto: 44 pruebas aprobadas en 5 archivos (2 nuevas sobre la nave). |
| `npm run lint` | Correcto, sin errores. |
| `npm run build` | Correcto. |
| Navegador (Chrome sin interfaz, 1440 × 900) | Portada y misión en inglés sin errores de consola; la nave cruza la pantalla en el sol 1. |
| Rendimiento (Chrome con CPU ×4 más lenta, 5 s caminando) | Tiempo de JavaScript de ~1.28 s a ~0.76 s; de 85–88 a 94–102 fotogramas. El resto del costo es el pintado del SVG grande. |
| Pendiente | Revisar en el navegador del equipo; adaptación móvil sin decidir (BM-19 vs. guía de continuidad). |

## Rama feature/keys · teclado, pantalla de carga y mejora de misiones (15 de noviembre de 2026)

Cambios principales (todos después de V3; ver la guía de continuidad):

- Teclado: WASD y flechas funcionan sin enfocar el mapa (las flechas nunca coincidían por pasar la tecla a minúsculas). R maneja el rover.
- Pantalla de carga al abrir el juego y al aterrizar en la misión; se salta con cualquier tecla o clic.
- Misiones en 7 capítulos con rastreador arriba y flecha guía en el mapa (roja en urgencias).
- Tiempo por misión (3 / 3.5 / 2.5 min por sol) y dormir en el hábitat para pasar al siguiente sol sin costo.
- Caminar gasta un poco de energía, agua y comida; el rover solo energía.
- Si energía, agua o comida llega a 0: alerta con cuenta atrás de 60 s en vez de terminar al instante.
- Cultivo: etapas visibles, se puede volver a sembrar después de cosechar.
- Recolección: 10 puntos (cajas, hielo, celdas) que se rellenan; anillo de progreso y números flotantes.
- Edificios nuevos: extractor de agua, garaje del rover, búnker; ícono de construcción con progreso. Ahora se puede caminar mientras se construye.
- Rover de Marte (×2 velocidad), obstáculos (cráteres y rocas bloquean, dunas frenan) y zonas seguras (hábitat 6 ⚡, búnker 3 ⚡, cueva de lava gratis).
- Diálogos de astronautas en globos sobre su cabeza, separados de NOVA.
- Tarjeta grande para la tormenta de polvo, alerta solar con datos NASA, final con certificado imprimible o rescate con consejo.
- Datos NASA: DONKI GST/CME/FLR en vivo (caché 6 h, respaldo archivado) cambian los segundos para refugiarse; InSight (archivado 2020) agrega comida en noches de menos de −97 °C.

Fallos corregidos: el contador del segundo panel mostraba 0/2 aunque solo se podía construir uno; Naomi estaba parada sobre una roca; los botones de acción tapaban el pad de dirección; el astronauta tapaba el clic sobre la parcela; la pantalla de aterrizaje salía al volver de Ciencia; el panel de Ciencia se apretaba en tres columnas dentro de la misión.

| Comprobación | Resultado |
|---|---|
| `npm run test` | Correcto: 61 pruebas en 6 archivos (15 nuevas en `missionUpgrade.test.ts`). |
| `npm run lint` | Correcto, sin errores. |
| `npm run build` | Correcto. |
| Partida completa en Chrome sin interfaz (1440 × 900) | First flight de principio a fin: recolectar, construir, dormir, sembrar, tormenta de polvo, alerta solar, emergencia de comida, cosecha y victoria con certificado. Sin errores de consola. |
| Revisión visual | Flecha guía, rover, globo de Sofía, alerta de emergencia y panel NASA revisados con capturas. |
| API NASA | Endpoints probados desde el navegador el 16 de noviembre de 2026: CME y GST responden; FLR devolvió 404; InSight devuelve la semana archivada de 2020. Sin red, el juego usa el respaldo archivado (probado). |
| Pendiente | Probar en la computadora del equipo con la API en vivo; decidir la versión móvil; con DEMO_KEY el límite es 30 consultas por hora por IP (conviene una clave propia en `.env.local`). |
