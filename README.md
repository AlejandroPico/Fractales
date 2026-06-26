# Fractales

**Fractales** es un explorador web interactivo de fractales pensado como proyecto científico, educativo y de conocimiento público. Funciona como una página estática compatible con GitHub Pages, sin servidor, compilación ni dependencias externas.

## Estado actual

Versión actual: `v1.1.2`.

Esta versión prioriza la **visibilidad estable**. Después de detectar que el motor WebGL dejaba el lienzo negro en algunos entornos, el render principal se ha pasado temporalmente a **Canvas 2D** con render adaptativo. El objetivo inmediato es que la aplicación pinte siempre en pantalla, mantenga la navegación y permita validar la experiencia antes de reintroducir WebGL/WebGPU con pruebas más controladas.

## Motor gráfico

- **Canvas 2D estable** como motor principal de la versión `v1.1.2`.
- Render adaptativo: resolución reducida durante navegación y mayor resolución cuando la vista queda quieta.
- Cache busting en `index.html` mediante `?v=1.1.2` para evitar que GitHub Pages o el navegador mantengan un `main.js` antiguo.
- Exportación a PNG desde el propio lienzo.

## Fractales incluidos

| Fractal | Familia | Renderizado |
|---|---:|---|
| Mandelbrot | Escape-time | Canvas 2D adaptativo |
| Julia | Escape-time | Canvas 2D adaptativo |
| Burning Ship | Escape-time | Canvas 2D adaptativo |
| Tricorn / Mandelbar | Escape-time | Canvas 2D adaptativo |
| Multibrot cúbico | Escape-time | Canvas 2D adaptativo |
| Newton `z³ − 1` | Newtoniano | Canvas 2D adaptativo |
| Helecho de Barnsley | IFS | Puntos Canvas |
| Triángulo de Sierpinski | IFS | Puntos Canvas |
| Alfombra de Sierpinski | Geométrico | Canvas recursivo |
| Copo de nieve de Koch | Curva fractal | Canvas recursivo |
| Curva del dragón | Curva fractal | Canvas recursivo |
| Curva de Hilbert | Curva de relleno | Canvas recursivo |

## Controles

- **Ratón + clic + arrastre**: desplaza el fractal horizontal y verticalmente, como en una superficie táctil.
- **Rueda del ratón**: ajusta la velocidad global de navegación y zoom. La velocidad se muestra en el panel.
- **W**: zoom hacia dentro.
- **S**: zoom hacia fuera.
- **A**: desplazamiento hacia la izquierda.
- **D**: desplazamiento hacia la derecha.
- **Flechas**: desplazamiento adicional horizontal y vertical.
- **Recentrar**: vuelve al encuadre recomendado del fractal actual.
- **Julia aleatoria**: cambia a un conjunto de Julia con una constante compleja aleatoria.
- **PNG**: exporta una captura del lienzo actual.

## Interfaz

- Lienzo a pantalla completa.
- Panel flotante plegable.
- Selector de fractal.
- Selector de calidad visual: rendimiento, nativa y suprema.
- Indicador de velocidad, zoom, posición y tiempo de render.
- Favicon SVG propio basado en una estructura tipo Sierpinski.

## Estructura del proyecto

```text
Fractales/
├── favicon.svg
├── index.html
├── styles.css
├── src/
│   └── main.js
└── README.md
```

## Publicación en GitHub Pages

Al ser una web estática, puede publicarse directamente con GitHub Pages desde la rama `main`.

Ruta recomendada en GitHub:

1. Entra en **Settings** del repositorio.
2. Abre **Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige rama `main` y carpeta `/root`.
5. Guarda los cambios.

## Objetivo del proyecto

El objetivo de **Fractales** es evolucionar hacia una herramienta visual y educativa donde cualquier persona pueda explorar familias fractales, comparar fórmulas, entender su construcción matemática y navegar por ellas con una experiencia cercana a la de un visor científico interactivo.

## Próximas mejoras propuestas

- Reintroducir WebGL2 de forma incremental: primero un shader mínimo visible, después fractales escape-time, después Newton y geometrías.
- Añadir pantalla de diagnóstico técnico: navegador, tamaño del canvas, motor activo y errores de consola capturados.
- Panel explicativo por fractal con fórmula, historia y ejemplos de uso.
- Parámetros editables para Julia, Multibrot y Newton.
- Paletas de color seleccionables.
- Marcadores de ubicaciones interesantes dentro de Mandelbrot y Burning Ship.
- Mini-mapa del plano complejo.
- Primeros fractales 3D: Mandelbulb, Mandelbox, Julia 3D y ray marching.

## Historial de versiones

### v1.1.2

- Corregido el problema persistente de lienzo negro sustituyendo temporalmente WebGL por Canvas 2D estable.
- Añadido cache busting en `index.html` para forzar la descarga del nuevo `main.js`.
- Cambiado el selector de “Calidad GPU” a “Calidad visual”.
- Mantenidos controles de navegación, zoom, arrastre, velocidad y exportación PNG.

### v1.1.1

- Corregida la pantalla negra de la `v1.1.0`.
- Sustituido el motor WebGL experimental por un shader único más compatible.
- Añadidos errores visibles de compilación/enlace WebGL para evitar fallos silenciosos.
- Mantenido el render GPU y los controles existentes.

### v1.1.0

- Añadido favicon SVG propio con identidad fractal.
- Corregida la legibilidad de los desplegables.
- Sustituido el motor CPU/Canvas 2D por un motor WebGL2 acelerado por GPU.
- Añadido indicador de tiempo de render y FPS.
- Añadido selector de calidad GPU.
- Preparada la base técnica para futuras visualizaciones 3D.

### v1.0.0

- Primera versión del explorador.
- Lienzo a pantalla completa.
- Selector de tipos de fractal.
- Navegación con ratón, WASD, flechas y velocidad ajustable con rueda.
- Exportación PNG.
- README inicial.
