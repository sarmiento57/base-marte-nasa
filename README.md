# Base Marte

Juego educativo 2D para NASA Space Apps Challenge 2026. La tripulación explora a pie un valle marciano amplio, prepara su colonia y aprende cómo las decisiones afectan la energía, el agua, la comida y el cultivo. La exploración usa una vista cenital de mundo abierto; las reglas educativas y el público infantil definidos por el proyecto siguen siendo la base del juego.

## Ejecutar el proyecto

Se usan las dependencias ya fijadas en `package-lock.json`.

```bash
npm install
npm run dev
```

Vite indica la dirección local. Los comandos de revisión disponibles son:

```bash
npm run test
npm run lint
npm run build
npm run preview
```

## Cómo se juega

- Camina por el terreno con WASD o las flechas. En celular usa el pad direccional; mantenerlo presionado hace caminar continuamente.
- Toca o haz clic en el terreno para que el astronauta camine hasta allí. La cámara sigue al personaje y el radar indica su posición dentro del mapa de 4,800 × 3,200 unidades.
- Acércate a una parcela libre antes de construir. También debes estar junto al invernadero para sembrar o cosechar.
- Moverse no avanza el sol ni cambia recursos. Las acciones de colonia se confirman por separado con una vista previa de su costo.
- NOVA da ayuda contextual y se puede minimizar. Las fuentes NASA se consultan en la ficha científica; la misión funciona sin conexión.

La misión mantiene el ciclo de ocho soles de V3. Un solo cierre de soporte vital crítico termina la misión inmediatamente. Hay tres partidas deterministas: estándar (48 de energía, tormenta en el sol 3 y alerta solar en el 6), reservas extra (56, evento en los soles 4 y 7) y eventos tempranos (48, evento en los soles 2 y 5). Son parámetros del juego, no mediciones NASA.

## Tecnologías y estructura

React, TypeScript, Vite, Tailwind CSS v4, Zustand, Lucide React y Vitest. No se agregaron dependencias. El mapa 2D está hecho en SVG/DOM; no se usa motor 3D ni backend.

- `src/app/`: portada, misión, guía, ciencia, informe y navegación.
- `src/components/`: mapa, astronauta, HUD, construcción, cultivo, eventos, objetivos, NOVA y fuentes.
- `src/engine/`: estado, reglas puras, acciones, eventos, vista previa e informe causal.
- `src/store/useGameStore.ts`: única store del juego y sus preferencias de interfaz; recursos y progreso no se duplican.
- `src/data/mars/`: mundo, parcelas y funciones puras de movimiento.
- `src/data/nasa/`: registro histórico DONKI archivado y atribución de fuentes; no se presentan como datos en vivo.
- `src/tests/`: reglas, rutas de misión, movimiento, selección de parcelas, persistencia y pantallas.

## Documentos

- `AGENTS.md`: convenciones generales del repositorio.
- `NASA_AGENTE_IA_v3.md`: reglas, arquitectura e historias del proyecto, sincronizadas con las decisiones aprobadas para el juego.
- `docs/NASA_Documento_Maestro_v3.docx`: especificación principal y criterios de aceptación.
- `QA.md`: pruebas ejecutadas, revisión visual y trabajo pendiente.

## Estado de entrega

La partida, la exploración 2D, los escenarios, la ayuda de NOVA y la consulta local de ciencia están implementados en esta rama. La publicación pública y el video de entrega siguen pendientes; no se ha hecho push ni despliegue.
