# Base Marte

Explora un valle marciano, acompaña a una tripulación y ayuda a NOVA a mantener viva la colonia. Este README reúne una guía para jugadores y la información necesaria para ejecutar el proyecto.

## Tu misión

Mantén la colonia durante ocho soles. Para completar la misión, la tripulación debe llegar al final con soporte vital, haber recogido al menos una cosecha y mantener el nivel de exposición por debajo de 50. Si en el cierre de un sol falta energía, agua o comida para cubrir el soporte vital, la misión termina.

## Primeros pasos

1. **Recorre el valle.** Usa WASD o las flechas del teclado. También puedes hacer clic en el terreno y el astronauta caminará hasta allí. El radar ayuda a ubicarte en el mapa.
2. **Mira tus reservas.** En la ruta estándar comienzas con 48 de energía, 60 de agua, 22 de comida, 4 repuestos y 1 semilla. Cada sol el soporte vital consume 10 de energía, 2 de agua y 3 de comida.
3. **Prepara un invernadero.** Acércate a una parcela libre, como B1, abre Construcción y confirma el edificio. Cuesta 2 repuestos. Mientras la tripulación construye, no podrás moverte; la obra termina al cerrar el sol.
4. **Siembra.** Cuando el invernadero esté listo, camina hasta él y usa el módulo Invernadero. Sembrar cuesta 25 de energía, 10 de agua y una semilla.
5. **Cuida el cultivo.** En modo Normal crece hasta 20 puntos por sol y consume 8 de energía y 3 de agua. En Ahorro crece hasta 10 puntos y consume 4 de energía y 2 de agua. Si faltan recursos, no crecerá. Puedes gastar 12 de energía para impulsarlo hasta 20 puntos una vez por sol.
6. **Recoge la cosecha.** Acércate al invernadero cuando el cultivo esté listo. La misión necesita al menos una cosecha para completarse.

## El tiempo y los recursos

Cada sol dura seis minutos reales y se cierra automáticamente. La barra superior muestra cuánto falta. Si quieres terminar antes, usa el botón «Avanzar al sol»: adelantar cuesta 10 de energía, además del soporte vital y del cultivo de ese cierre. Esperar no cuesta energía de adelanto.

Los paneles solares recargan energía al terminar el sol: el panel inicial produce 18 en condiciones normales y 5 durante una tormenta de polvo. Un segundo panel añade 6, o 2 durante la tormenta. Revisa el Inventario y la vista previa antes de gastar tus últimas reservas.

El mapa tiene cinco cajas de suministros. Camina hasta una y pulsa **E** para recogerla. Cada caja se recupera una sola vez y la tripulación puede recoger un suministro por sol:

- Batería de respaldo: +20 energía.
- Contenedor de agua: +20 agua.
- Caja de raciones: +18 comida.
- Kit de repuestos: +3 repuestos.
- Estuche de semillas: +2 semillas.

## Construcciones y cultivo

- **Panel solar:** cuesta 2 repuestos y, además del panel inicial, añade energía al cierre de cada sol.
- **Invernadero:** cuesta 2 repuestos y permite sembrar. Construirlo no planta automáticamente.
- **Modo Normal:** acelera más el crecimiento y consume más agua y energía.
- **Modo Ahorro:** consume menos y el cultivo crece más despacio.
- **Modo Apagado:** pausa el crecimiento. Varias pausas seguidas reducen la salud del cultivo.

Construir, sembrar, cosechar, recoger una caja o entrar al refugio ocupa la tarea de la tripulación durante ese sol. El astronauta solo queda inmóvil durante la construcción y mientras permanece en el refugio.

## Alertas y refugio

Si aparece la alerta solar, sigue el aviso de NOVA y corre a la nave hábitat. Camina hasta la entrada y pulsa **E** para entrar antes de que termine la cuenta atrás de 40 segundos. El refugio cuesta 6 de energía y mantiene a la tripulación dentro hasta cerrar el sol. Si el tiempo termina antes de que llegues, el nivel de exposición aumenta 60 puntos.

La tormenta de polvo reduce la energía que producen los paneles durante dos soles. Abre Alertas y elige si quieres mantener el ritmo del cultivo o ahorrar energía.

## NOVA, visitantes y pantallas

NOVA acompaña al astronauta y comparte consejos durante la misión. Tócala para que repita su último mensaje. Acércate a los astronautas visitantes y pulsa **E** para conversar; de vez en cuando verás una nave misteriosa cruzar el cielo y alejarse.

El dock inferior abre Construcción, Inventario, Misión, Alertas, Invernadero, Ciencia NASA, Bitácora y NOVA sin salir del mapa. Usa el botón de pantalla completa para jugar en toda la ventana.

En Ciencia NASA puedes consultar la ficha DONKI de una llamarada solar X1.2 observada el 3 de enero de 2025 y abrir su fuente. La ficha explica qué muestra ese registro y cómo inspira los preparativos de la expedición.

## Rutas de misión

Puedes elegir una ruta desde el campamento:

- **Primer vuelo:** 48 de energía; tormenta en el sol 3 y alerta solar en el sol 6.
- **Reserva reforzada:** 56 de energía; tormenta en el sol 4 y alerta solar en el sol 7.
- **Señales tempranas:** 48 de energía; tormenta en el sol 2 y alerta solar en el sol 5.

## Ejecutar el proyecto

Se usan las dependencias ya fijadas en `package-lock.json`.

```bash
npm install
npm run dev
```

Vite muestra la dirección local. Para revisar el proyecto:

```bash
npm run test
npm run lint
npm run build
npm run preview
```

## Tecnologías y estructura

React, TypeScript, Vite, Tailwind CSS v4, Zustand, Lucide React y Vitest. No se agregaron dependencias. El mapa 2D usa SVG y DOM; el proyecto no usa un motor 3D ni backend.

- `src/app/`: portada, misión, guía, ciencia, informe y navegación.
- `src/components/`: mapa, astronauta, HUD, construcción, cultivo, eventos, objetivos, NOVA y fuentes.
- `src/engine/`: estado, reglas, acciones, eventos, vistas previas e informe de misión.
- `src/store/useGameStore.ts`: store única del juego y sus preferencias de interfaz.
- `src/data/mars/`: mundo, parcelas, visitas, suministros narrativos, avistamientos y movimiento.
- `src/data/nasa/`: registro histórico DONKI y atribución de fuentes.
- `src/tests/`: reglas, rutas, store, movimiento, persistencia y mundo local.

## Documentos del proyecto

- `AGENTS.md`: convenciones del repositorio.
- `NASA_AGENTE_IA_v3.md`: arquitectura e historias originales de V3. Consulta también la guía de continuidad para cambios posteriores.
- `docs/NASA_Documento_Maestro_v3.docx`: especificación principal y criterios de aceptación originales.
- `QA.md`: verificaciones ejecutadas y trabajo pendiente.
- `docs/GUIA_CONTINUIDAD_BASE_MARTE.md` y `docs/GUIA_CONTINUIDAD_BASE_MARTE.docx`: cambios posteriores a V3 y pasos para que otro desarrollador o una IA continúe el proyecto.

## Estado del proyecto

Los cambios locales están en la rama `feat/base-marte-juego-2d`. No se ha hecho push ni merge. Las historias BM no se marcan como terminadas hasta revisarlas y aceptarlas.
