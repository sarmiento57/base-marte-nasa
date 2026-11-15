# Base Marte

Proyecto desarrollado para el NASA Space Apps Challenge 2026, en el reto **Build a Junior Astronaut Mission Trainer**.

Base Marte es un videojuego web educativo dirigido a niños de 7 a 12 años. El jugador administra una colonia en Marte y debe tomar decisiones para mantener a salvo a los astronautas, controlar los recursos disponibles y garantizar el funcionamiento de la base.

Durante la partida se podrán construir instalaciones, producir alimentos en un invernadero, administrar energía y agua, y responder a situaciones como tormentas de polvo o eventos solares.

El juego contará con NOVA, un robot asistente que ayudará al jugador a comprender las misiones, advertirá sobre posibles problemas y explicará las consecuencias de sus decisiones.

La primera versión consiste en una misión de 8 soles marcianos, en la que el jugador deberá mantener el soporte vital, conseguir una cosecha y proteger a la tripulación.

## Tecnologías utilizadas

- React
- TypeScript
- Vite
- Tailwind CSS v4
- Zustand
- SVG para el mapa interactivo
- Vitest para pruebas
- Lucide React para iconos

El proyecto funciona desde el navegador. No requiere backend, base de datos ni autenticación.

## Requisitos previos

Antes de ejecutar el proyecto, es necesario tener instalado:

- Node.js compatible con Vite
- npm
- Git
- Visual Studio Code o cualquier editor de código

Para comprobar las instalaciones, ejecutar:

```bash
node -v
npm -v
git --version
```

## Instalación del proyecto

Clonar el repositorio:

```bash
git clone https://github.com/TU_USUARIO/base-marte-nasa.git
```

Ingresar a la carpeta:

```bash
cd base-marte-nasa
```

Cambiar a la rama de desarrollo:

```bash
git switch dev
```

Instalar las dependencias:

```bash
npm install
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Abrir en el navegador la dirección que aparece en la terminal, normalmente:

```text
http://localhost:5173/
```

## Configuración de Tailwind CSS

El proyecto utiliza Tailwind CSS v4 para los estilos.

La configuración se encuentra en `vite.config.ts`, mediante el plugin `@tailwindcss/vite`.

El archivo `src/index.css` contiene:

```css
@import "tailwindcss";
```

Todos los estilos de los componentes deben realizarse con clases de Tailwind en los archivos `.tsx`.

No se deben crear archivos CSS individuales, utilizar CSS Modules ni instalar otras librerías de estilos sin acordarlo con el equipo.

## Estructura del proyecto

```text
base-marte-nasa/
│
├── public/
│   └── assets/
│       ├── images/
│       ├── robots/
│       ├── buildings/
│       ├── backgrounds/
│       └── icons/
│
├── src/
│   ├── app/
│   ├── components/
│   │   ├── hud/
│   │   ├── map/
│   │   ├── buildings/
│   │   ├── greenhouse/
│   │   ├── events/
│   │   ├── missions/
│   │   ├── nova/
│   │   ├── science/
│   │   ├── results/
│   │   ├── tutorial/
│   │   └── shared/
│   │
│   ├── engine/
│   ├── store/
│   ├── data/
│   │   └── nasa/
│   ├── tests/
│   ├── types/
│   ├── utils/
│   ├── index.css
│   └── main.tsx
│
├── docs/
│   └── NASA_Documento_Maestro_v3.docx
│
├── AGENTS.md
├── NASA_AGENTE_IA_v3.md
├── QA.md
├── README.md
├── package.json
└── vite.config.ts
```

## Descripción de las carpetas

### public/assets

Contiene los recursos gráficos utilizados en el videojuego.

- `images`: imágenes generales.
- `robots`: imágenes y animaciones del robot NOVA.
- `buildings`: imágenes de edificios y construcciones.
- `backgrounds`: fondos y escenarios de Marte.
- `icons`: iconos propios del juego.

### src/app

Contiene el componente principal de la aplicación.

### src/components

Contiene los componentes de interfaz organizados según su funcionalidad.

- `hud`: indicadores de energía, agua, comida y soporte vital.
- `map`: mapa de Marte y parcelas interactivas.
- `buildings`: selección y construcción de edificios.
- `greenhouse`: funcionamiento del invernadero, cultivos y cosechas.
- `events`: tormentas, alertas solares y decisiones.
- `missions`: objetivos y progreso de la misión.
- `nova`: robot asistente, mensajes y recomendaciones.
- `science`: información científica y fuentes de NASA.
- `results`: resultados de victoria o derrota.
- `tutorial`: instrucciones iniciales del juego.
- `shared`: componentes reutilizables.

### src/engine

Contiene las reglas principales del videojuego.

Desde esta carpeta se administran los recursos, el avance de los soles, los costos de construcción, el crecimiento de los cultivos y las condiciones para ganar o perder.

Los valores de la simulación se centralizan en `config.ts`.

La lógica de esta carpeta debe mantenerse independiente de los componentes React.

### src/store

Contiene el estado del juego administrado mediante Zustand.

Permite compartir información entre los componentes y ejecutar las acciones definidas en el motor.

### src/data/nasa

Contiene los registros científicos utilizados en el juego y la información de sus fuentes.

Los datos obtenidos de NASA deben diferenciarse de los valores creados para la simulación.

### src/tests

Contiene las pruebas automatizadas realizadas con Vitest.

### src/types

Contiene tipos e interfaces compartidos que no pertenecen directamente al motor.

### src/utils

Contiene funciones auxiliares reutilizables.

### docs

Contiene el documento maestro del proyecto, donde están las historias de usuario, los criterios de aceptación, las reglas y el alcance del desarrollo.

## Documentación del proyecto

Antes de comenzar una funcionalidad, revisar los siguientes archivos:

- `docs/NASA_Documento_Maestro_v3.docx`: documento principal del proyecto.
- `NASA_AGENTE_IA_v3.md`: instrucciones técnicas, reglas y criterios para los agentes de IA.
- `AGENTS.md`: convenciones generales y restricciones de desarrollo.
- `QA.md`: registro de pruebas y funcionalidades verificadas.

Estos documentos deben mantenerse actualizados cuando el equipo apruebe cambios importantes.

## Trabajo con Git

El repositorio utiliza las siguientes ramas:

- `main`: versión estable.
- `dev`: rama de integración.
- `feat/bm-XX-descripcion`: desarrollo de historias de usuario.

Las nuevas funcionalidades deben desarrollarse en ramas creadas desde `dev`.

Ejemplo para comenzar una historia:

```bash
git switch dev
git pull origin dev
git switch -c feat/bm-26-nova
```

Después de desarrollar y probar los cambios:

```bash
git add .
git commit -m "feat(nova): implementar asistente robotico"
git push -u origin feat/bm-26-nova
```

Luego se crea un Pull Request hacia `dev`.

Los cambios se integrarán a `main` cuando las funcionalidades estén verificadas.

No se debe trabajar directamente sobre `main`.

## Uso de agentes de IA

El equipo utilizará agentes de IA como apoyo para desarrollar las historias de usuario.

Antes de solicitar una implementación, el agente debe revisar `AGENTS.md`, `NASA_AGENTE_IA_v3.md` y la documentación correspondiente.

Se debe trabajar una historia de usuario a la vez, respetando los criterios de aceptación y las tecnologías establecidas.

No se deben agregar funcionalidades, dependencias o cambios de arquitectura que no estén contemplados sin consultarlo con el equipo.

Cada integrante es responsable de revisar y probar el código generado antes de integrarlo.

## Pruebas

Para ejecutar las pruebas automatizadas:

```bash
npm run test
```

Para generar la versión de producción:

```bash
npm run build
```

Para comprobar el resultado compilado:

```bash
npm run preview
```

Cada historia debe cumplir sus criterios de aceptación antes de considerarse terminada.

Los resultados de las pruebas se registrarán en `QA.md`.

## Alcance inicial

Durante el hackathon se priorizará una versión funcional que permita:

- Iniciar una misión de 8 soles.
- Consultar y administrar recursos.
- Visualizar la colonia en un mapa interactivo.
- Construir paneles solares y un invernadero.
- Sembrar, mantener cultivos y cosechar alimentos.
- Asignar tareas básicas a la tripulación.
- Responder a tormentas de polvo y alertas solares.
- Recibir ayuda del robot NOVA.
- Consultar información científica de NASA.
- Comprender las consecuencias de las decisiones.
- Completar una misión y consultar el informe final.

Las funcionalidades adicionales se desarrollarán después de comprobar el funcionamiento de la primera versión.

## Publicación

El proyecto está preparado para publicarse como una aplicación web estática.

La compilación se genera mediante:

```bash
npm run build
```

Los archivos resultantes se encuentran en la carpeta `dist/` y podrán publicarse en un servicio de alojamiento compatible con aplicaciones estáticas.
