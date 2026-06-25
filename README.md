# Fractales

**Fractales** es un explorador web interactivo de fractales pensado como proyecto científico, educativo y de conocimiento público. Funciona como una página estática compatible con GitHub Pages, sin servidor, compilación ni dependencias externas.

## Estado actual

Versión actual: `v1.1.0`.

Esta versión cambia el motor de renderizado principal a **WebGL2**, por lo que los fractales de tipo píxel se calculan en la GPU mediante shaders. El objetivo es conseguir navegación más fluida, mayor definición y una base técnica preparada para futuras visualizaciones 3D.

## Motor gráfico

- **WebGL2 nativo** para Mandelbrot, Julia, Burning Ship, Tricorn, Multibrot, Newton y Alfombra de Sierpinski.
- **WebGL2 con buffers de vértices** para fractales por puntos y curvas: Helecho de Barnsley, Triángulo de Sierpinski, Copo de Koch, Curva del dragón y Curva de Hilbert.
- Sin librerías externas. Todo el motor está en `src/main.js`.
- Exportación a PNG desde el propio lienzo WebGL.

## Fractales incluidos

| Fractal | Familia | Renderizado |
|---|---:|---|
| Mandelbrot | Escape-time | Shader GPU |
| Julia | Escape-time | Shader GPU |
| Burning Ship | Escape-time | Shader GPU |
| Tricorn / Mandelbar | Escape-time | Shader GPU |
| Multibrot cúbico | Escape-time | Shader GPU |
| Newton `z³ − 1` | Newtoniano | Shader GPU |
| Helecho de Barnsley | IFS | Puntos WebGL |
| Triángulo de Sierpinski | IFS | Puntos WebGL |
| Alfombra de Sierpinski | Geométrico | Shader GPU |
| Copo de nieve de Koch | Curva fractal | Líneas WebGL |
| Curva del dragón | Curva fractal | Líneas WebGL |
| Curva de Hilbert | Curva de relleno | Líneas WebGL |

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
- Selector de calidad GPU: rendimiento, nativa y suprema.
- Indicador de velocidad, zoom, posición, tiempo de render y FPS.
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

## Requisitos del navegador

La versión `v1.1.0` requiere WebGL2. Los navegadores modernos suelen soportarlo, pero si no aparece la visualización conviene comprobar que la aceleración por hardware esté activada.

## Objetivo del proyecto

El objetivo de **Fractales** es evolucionar hacia una herramienta visual y educativa donde cualquier persona pueda explorar familias fractales, comparar fórmulas, entender su construcción matemática y navegar por ellas con una experiencia cercana a la de un visor científico interactivo.

## Próximas mejoras propuestas

- Panel explicativo por fractal con fórmula, historia y ejemplos de uso.
- Parámetros editables para Julia, Multibrot y Newton.
- Paletas de color seleccionables.
- Marcadores de ubicaciones interesantes dentro de Mandelbrot y Burning Ship.
- Mini-mapa del plano complejo.
- Sistema de rutas o “viajes” por zonas famosas de los fractales.
- Primeros fractales 3D: Mandelbulb, Mandelbox, Julia 3D y ray marching.
- Versión educativa con glosario: número complejo, iteración, convergencia, autosimilitud, dimensión fractal.

## Historial de versiones

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
