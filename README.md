# Fractales

**Fractales** es una biblioteca inmersiva de fractales 2D y 3D. La versión 2 reconstruye el proyecto desde cero con TypeScript, Vite, Three.js, shaders GLSL y render adaptativo acelerado por GPU.

## Versión actual

`v2.0.0` — reconstrucción arquitectónica y gráfica.

La nueva aplicación se compila y publica mediante GitHub Actions. Mientras se cambia la fuente de GitHub Pages a **GitHub Actions**, la raíz del repositorio conserva temporalmente la versión estable anterior para no dejar el sitio fuera de servicio.

## Objetivo

El proyecto busca convertirse en una biblioteca visual y educativa donde se puedan explorar fractales como si fueran entornos de un videojuego:

- navegación continua con teclado y ratón;
- sensación de profundidad y espacio aparentemente infinito;
- render de menor resolución durante el movimiento;
- refinado progresivo al detenerse;
- uso de la GPU del dispositivo;
- biblioteca modular y ampliable;
- soporte conjunto de fractales bidimensionales y volumétricos.

## Biblioteca inicial v2

### 2D

- Mandelbrot.
- Julia.
- Burning Ship.
- Tricorn.
- Multibrot cúbico.
- Celtic.

### 3D

- Mandelbulb.
- Mandelbox.
- Esponja de Menger.
- Julia 3D.

Los fractales 2D se calculan por píxel en un fragment shader. Los fractales 3D utilizan estimadores de distancia y ray marching, sin mallas precalculadas.

## Controles

### Modo inmersivo

Haz clic sobre el lienzo o pulsa **Entrar**. El navegador bloqueará el puntero y el ratón controlará la orientación. Pulsa `Esc` para liberar el cursor.

### Entornos 2D

- `W` / `S`: acercar o alejar.
- `A` / `D`: desplazamiento horizontal.
- Flechas: desplazamiento horizontal y vertical.
- Ratón bloqueado o arrastre: desplazamiento libre.
- Rueda: ajustar velocidad.
- `Shift`: aceleración temporal.

### Entornos 3D

- `W` / `S`: avanzar o retroceder.
- `A` / `D`: desplazamiento lateral.
- `Q` / `E`: bajar o subir.
- Ratón: orientación de cámara.
- Rueda: ajustar velocidad.
- `Shift`: turbo.

## Render adaptativo

El motor utiliza tres etapas:

1. **Navegación:** resolución interna y complejidad reducidas.
2. **Refinando:** resolución e iteraciones intermedias.
3. **Máxima definición:** resolución ajustada al dispositivo y mayor profundidad matemática.

El shader calcula únicamente los píxeles visibles del viewport. No se genera geometría invisible fuera de cámara.

## Arquitectura

```text
Fractales/
├── app/
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── app.ts          # controles, navegación y render adaptativo
│   │   ├── catalog.ts      # catálogo extensible de fractales
│   │   ├── main.ts         # arranque seguro
│   │   ├── shaders.ts      # motor matemático GLSL 2D/3D
│   │   └── styles.css      # interfaz inmersiva
│   └── index.html
├── scripts/postbuild.mjs
├── .github/workflows/deploy-pages.yml
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Desarrollo local

Requiere Node.js 22 o superior.

```bash
npm install
npm run dev
```

Compilación de producción:

```bash
npm run build
```

## Activar la nueva versión en GitHub Pages

1. Abre `Settings > Pages`.
2. En `Build and deployment`, cambia **Source** a `GitHub Actions`.
3. Abre la pestaña `Actions` y ejecuta **Deploy Fractales to GitHub Pages**, o realiza cualquier nuevo push a `main`.

## Decisiones tecnológicas

### Por qué TypeScript y no Python o Java

GitHub Pages sirve archivos estáticos. Python o Java necesitarían un servidor externo y no acelerarían el render del usuario. La mejora gráfica real se obtiene ejecutando shaders en la GPU local.

### Por qué Three.js

Three.js proporciona una capa estable sobre WebGL2 para gestionar el contexto gráfico, buffers, resolución y compilación de shaders. El cálculo fractal sigue siendo personalizado y reside en `shaders.ts`.

### WebGPU

La interfaz detecta si WebGPU está disponible y lo muestra en la telemetría. La v2 utiliza WebGL2 como backend estable y queda preparada para incorporar un backend WebGPU/WGSL.

## Límites actuales

- El zoom 2D extremo todavía está limitado por la precisión de coma flotante del shader.
- Los entornos 3D usan ray marching en tiempo real; el detalle máximo depende de la GPU.
- Esta versión constituye la base profesional del proyecto, no la inclusión de todos los fractales conocidos.

## Hoja de ruta

- Aritmética double-single y perturbation rendering para zoom profundo.
- Backend WebGPU con WGSL.
- Acumulación temporal y antialiasing progresivo.
- Más familias 2D y 3D.
- Marcadores, rutas guiadas y coordenadas compartibles.
- Modo educativo con fórmula, historia, parámetros y glosario.
- Presets cinematográficos y exportación 4K/8K.
- WebXR para exploración inmersiva.

## Licencia

Apache License 2.0. Three.js se distribuye bajo licencia MIT como dependencia externa.
