# Base Marte — Instrucciones para agentes de IA

## 1. Contexto del proyecto

Base Marte es un videojuego educativo desarrollado para el
NASA Space Apps Challenge 2026.

Reto: Build a Junior Astronaut Mission Trainer.

Público objetivo: niños de 7 a 12 años.

El videojuego permite administrar una colonia marciana,
construir instalaciones, producir alimentos, controlar
recursos y tomar decisiones ante emergencias.

El objetivo principal es enseñar las consecuencias de
las decisiones mediante una simulación interactiva.

## 2. Documentos obligatorios

Antes de programar cualquier historia de usuario, leer:

1. NASA_AGENTE_IA_v3.md
2. docs/NASA_Documento_Maestro_v3.docx
3. AGENTS.md

Estos archivos contienen las historias, criterios de
aceptación, reglas y alcance del proyecto.

IMPORTANTE:
El archivo NASA_AGENTE_IA_v3.md está en la raíz.
El documento Word está dentro de docs/.

No utilizar rutas anteriores de estos documentos.

Si el agente no puede leer el Word, debe informarlo.
No debe inventar requisitos que no haya podido consultar.

Si los documentos se contradicen, informar al equipo
antes de implementar la regla contradictoria.

## 3. Tecnologías autorizadas

Frontend:

- React
- TypeScript
- Vite

Estilos:

- Tailwind CSS v4

Estado:

- Zustand

Mapa inicial:

- SVG interactivo con React

Pruebas:

- Vitest

Iconos:

- Lucide React

No utilizar sin autorización:

- CSS Modules
- styled-components
- CSS puro para componentes
- Next.js
- Angular
- Phaser
- Three.js
- Backend propio
- Bases de datos
- Autenticación
- Redux
- Librerías adicionales innecesarias

El juego debe funcionar en el navegador.

## 4. Reglas obligatorias de Tailwind CSS

Todos los estilos de interfaz deben realizarse
mediante clases de Tailwind CSS.

Reglas:

1. Utilizar className en archivos TSX.
2. No crear archivos CSS por componente.
3. No crear archivos .module.css.
4. No utilizar styled-components.
5. No usar estilos inline para diseño visual.
6. Utilizar clases responsive.
7. Utilizar hover, focus-visible y disabled.
8. Mantener una identidad visual consistente.
9. Preferir componentes reutilizables.
10. No incorporar Bootstrap ni otras librerías CSS.

El archivo src/index.css contiene únicamente:

@import "tailwindcss";

Excepción:
Los atributos SVG necesarios para geometría,
coordenadas y representación del mapa pueden
utilizarse cuando Tailwind no sea suficiente.

## 5. Arquitectura del proyecto

La arquitectura está dividida por responsabilidades.

### src/app/

Contiene el componente principal y la composición
general de la aplicación.

No colocar aquí reglas de simulación.

### src/components/

Contiene únicamente la interfaz del videojuego.

hud/
Indicadores de energía, agua, comida y soporte vital.

map/
Mapa interactivo, parcelas y representación
visual de edificios.

buildings/
Paneles para seleccionar y construir edificios.

greenhouse/
Interfaz de siembra, crecimiento, modos y cosecha.

events/
Ventanas de tormentas y alertas de actividad solar.

missions/
Objetivos y progreso educativo de las misiones.

nova/
Robot asistente NOVA, diálogos, consejos y alertas.

science/
Fuentes científicas de NASA y explicaciones.

results/
Pantalla de victoria, derrota e informe final.

tutorial/
Introducción y primeras instrucciones.

shared/
Botones, ventanas, tarjetas y otros componentes
reutilizables que no dependan de una funcionalidad.

### src/engine/

Contiene exclusivamente las reglas del videojuego.

types.ts
Define GameState y los tipos del motor.

config.ts
Centraliza costos, producción, capacidades,
duración de misión y demás constantes.

createInitialGame.ts
Construye el estado inicial de una partida.

actions.ts
Valida y ejecuta acciones del jugador.

advanceSol.ts
Calcula el avance de un sol y sus consumos.

events.ts
Contiene las reglas de las emergencias.

evaluateMission.ts
Determina victoria, derrota y motivos.

explanations.ts
Produce explicaciones educativas basadas en
las consecuencias reales de las decisiones.

El motor no debe depender de React ni del DOM.

### src/store/

useGameStore.ts
Conecta las acciones del jugador con el motor
de simulación utilizando Zustand.

GameState es la única fuente de verdad.

### src/data/nasa/

Contiene registros científicos verificados,
archivados y sus referencias.

No inventar registros atribuidos a NASA.

### src/tests/

Contiene pruebas automatizadas con Vitest.

### src/types/

Tipos compartidos que no pertenezcan
específicamente al motor.

### src/utils/

Funciones auxiliares generales sin reglas
de negocio.

### public/assets/

Recursos gráficos originales o autorizados.

robots/
Imágenes y animaciones de NOVA.

buildings/
Elementos visuales de las construcciones.

backgrounds/
Fondos del escenario marciano.

images/
Ilustraciones generales.

icons/
Iconos propios del proyecto.

## 6. Reglas de desarrollo

1. Implementar una historia de usuario a la vez.
2. Revisar sus criterios de aceptación.
3. No inventar funcionalidades.
4. No modificar reglas cerradas del documento.
5. Centralizar parámetros en engine/config.ts.
6. Mantener el motor independiente de la interfaz.
7. No duplicar el estado de recursos.
8. No consumir recursos dos veces por acción.
9. No permitir valores negativos.
10. Mantener resultados deterministas.
11. No agregar dependencias innecesarias.
12. No reestructurar el proyecto sin aprobación.
13. No cambiar tecnologías autorizadas.
14. No afirmar que algo funciona sin probarlo.
15. Mantener el código sencillo y entendible.

## 7. Robot asistente NOVA

NOVA será el acompañante del jugador durante la misión.

Debe:

- Explicar objetivos.
- Guiar durante el tutorial.
- Advertir sobre recursos insuficientes.
- Explicar consecuencias antes de decidir.
- Informar de eventos y emergencias.
- Felicitar cuando se cumplan objetivos.
- Explicar por qué ganó o perdió el jugador.

NOVA debe utilizar el estado real del juego.

No debe inventar valores ni estados.

No requiere integración con un modelo de IA
conversacional en el MVP.

Sus mensajes deben ser breves, educativos
y apropiados para niños de 7 a 12 años.

El jugador podrá minimizar sus mensajes,
pero los avisos críticos seguirán disponibles.

## 8. Diseño visual obligatorio

La interfaz debe parecer un videojuego educativo
de exploración espacial.

Identidad:

- Superficie marciana rojiza.
- Tonos naranjas y terracota.
- Paneles tecnológicos azul oscuro.
- Indicadores claros y llamativos.
- Construcciones espaciales ilustradas.
- Robot NOVA visible.
- Tipografía fácil de leer.
- Botones grandes.
- Diseño responsive.

Evitar:

- Dashboards empresariales genéricos.
- Formularios administrativos.
- Tablas innecesarias.
- Pantallas saturadas de información.
- Animaciones que dificulten jugar.

Priorizar una interfaz atractiva y funcional.

## 9. Datos científicos

Diferenciar siempre:

1. Datos reales de NASA.
2. Interpretaciones educativas.
3. Valores de simulación del videojuego.

No presentar números simulados como
mediciones reales.

No presentar datos históricos como datos en vivo.

Incluir atribución de las fuentes científicas.

## 10. Criterios de calidad

Antes de completar una historia:

1. Verificar criterios de aceptación.
2. Ejecutar las pruebas correspondientes.
3. Ejecutar npm run build.
4. Comprobar la interfaz en navegador.
5. Revisar errores de consola.
6. Comprobar que no se dañaron otras historias.
7. Registrar resultados en QA.md.

Si una prueba no se ejecutó, informar que quedó
pendiente.

## 11. Reglas Git

Ramas:

main
Versión estable del proyecto.

dev
Integración de funcionalidades.

feat/bm-XX-descripcion
Implementación de cada historia.

Ejemplo:
feat/bm-26-nova

Flujo:

1. Actualizar dev.
2. Crear rama feature desde dev.
3. Implementar la historia.
4. Ejecutar pruebas.
5. Crear commit descriptivo.
6. Subir la rama feature.
7. Crear Pull Request hacia dev.
8. Integrar a main únicamente versiones verificadas.

Nunca realizar push directamente a main.

## 12. Comunicación del agente

Al finalizar una tarea, informar:

- Historia implementada.
- Archivos creados.
- Archivos modificados.
- Pruebas ejecutadas.
- Resultados de pruebas.
- Problemas detectados.
- Funcionalidades pendientes.

No afirmar que una historia está terminada
si sus criterios no fueron verificados.

## 13. Prioridad general

Estamos desarrollando un MVP en aproximadamente
24 horas.

Prioridad:

1. Motor funcional.
2. Partida completa.
3. Decisiones y consecuencias.
4. NOVA.
5. Integración científica.
6. Pruebas.
7. Publicación.
8. Mejoras visuales adicionales.

El proyecto debe demostrar una misión completa
antes de ampliar funcionalidades.
