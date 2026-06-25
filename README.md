# Fractales

**Fractales** es un explorador web interactivo de fractales pensado como proyecto científico, educativo y de conocimiento público. La primera versión funciona como una página estática compatible con GitHub Pages: no necesita servidor, compilación ni dependencias externas.

## Estado actual

Versión inicial funcional: `v1.0.0`.

Incluye un lienzo a pantalla completa, controles flotantes y navegación tipo microvideojuego para moverse por el plano fractal.

## Fractales incluidos en la primera versión

La aplicación incorpora representantes de varias familias fractales:

| Fractal | Familia | Descripción breve |
|---|---:|---|
| Mandelbrot | Escape-time | Conjunto clásico definido por la iteración `z = z² + c`. |
| Julia | Escape-time | Familia relacionada con Mandelbrot, con constante compleja configurable. |
| Burning Ship | Escape-time | Variante con valores absolutos que genera estructuras con aspecto de nave o llama. |
| Tricorn / Mandelbar | Escape-time | Variante con conjugación compleja en cada iteración. |
| Multibrot cúbico | Escape-time | Versión de Mandelbrot con potencia 3. |
| Newton `z³ − 1` | Newtoniano | Basado en la convergencia del método de Newton hacia raíces complejas. |
| Helecho de Barnsley | IFS | Fractal generado por sistema de funciones iteradas. |
| Triángulo de Sierpinski | IFS | Estructura autosimilar triangular generada por juego del caos. |
| Alfombra de Sierpinski | Geométrico | Subdivisión recursiva de un cuadrado. |
| Copo de nieve de Koch | Curva fractal | Curva autosimilar generada por sustitución geométrica. |
| Curva del dragón | Curva fractal | Curva de plegado con crecimiento recursivo. |
| Curva de Hilbert | Curva de relleno | Curva recursiva que aproxima el llenado de una superficie. |

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

## Estructura del proyecto

```text
Fractales/
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

- Panel explicativo por fractal con fórmula, historia y ejemplos de uso.
- Parámetros editables para Julia, Multibrot y Newton.
- Paletas de color seleccionables.
- Modo de renderizado progresivo para más resolución sin bloquear la interfaz.
- Marcadores de ubicaciones interesantes dentro de Mandelbrot y Burning Ship.
- Mini-mapa del plano complejo.
- Sistema de rutas o “viajes” por zonas famosas de los fractales.
- Versión educativa con glosario: número complejo, iteración, convergencia, autosimilitud, dimensión fractal.

## Historial de versiones

### v1.0.0

- Primera versión del explorador.
- Lienzo a pantalla completa.
- Selector de tipos de fractal.
- Navegación con ratón, WASD, flechas y velocidad ajustable con rueda.
- Exportación PNG.
- README inicial.
