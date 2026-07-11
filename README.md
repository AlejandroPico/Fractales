# Fractales

**Fractales** es una biblioteca inmersiva de fractales 2D y 3D acelerada por GPU. La versión `v2.1.0` profundiza en tres objetivos: una interfaz científica más sobria, zoom 2D de precisión extendida y navegación 3D adaptada a la proximidad de las superficies.

## Versión actual

`v2.1.0` — precisión profunda, catálogo ampliado y rediseño integral de la interfaz.

## Cambios principales de v2.1

- Interfaz completamente recta, sin tarjetas ni botones redondeados.
- Eliminado el HUD superior con nombre, dimensión y descripción.
- Motor, FPS y estado de refinado trasladados al menú lateral.
- Barra superior del menú formada por iconos cuadrados:
  - biblioteca de información;
  - recentrado;
  - pantalla completa;
  - captura PNG de alta resolución.
- Biblioteca educativa interna desde nivel introductorio hasta conceptos avanzados.
- Catálogo ampliado a **24 entornos**: 16 fractales 2D y 8 fractales 3D.
- Aritmética `double-single` en el shader 2D para superar la precisión de un `float` convencional.
- Escala mínima reducida a `2 × 10⁻¹⁷`, frente al límite práctico visual cercano a `10⁻⁶` de la primera implementación GPU.
- Navegación 3D con velocidad proporcional al estimador de distancia y protección contra atravesar superficies.
- Capturas PNG sin pérdida en resolución de pantalla, 4K u 8K, limitadas automáticamente por la GPU.
- Calidad, detalle, ray marching y precisión de superficie configurados al máximo por defecto.

## Profundidad 2D

Los shaders WebGL suelen trabajar internamente con coma flotante de 32 bits. Esto provoca que, al aumentar el zoom, píxeles vecinos terminen compartiendo la misma coordenada y aparezcan bloques o ruido.

La v2.1 representa las coordenadas mediante dos flotantes —parte alta y parte baja— y ejecuta las operaciones complejas fundamentales con aritmética `double-single`. En condiciones normales permite alcanzar órdenes de zoom aproximados entre `10¹²` y `10¹⁶`, dependiendo de la GPU, la fórmula y la zona explorada.

No se presenta como infinito matemático literal. Para profundidades de cientos o miles de exponentes será necesaria la siguiente fase de la hoja de ruta: órbitas de referencia arbitrariamente precisas y perturbation rendering.

## Navegación 3D

La velocidad ya no es una distancia fija por fotograma. Antes de mover la cámara se evalúa el estimador de distancia del entorno actual:

- en espacios abiertos el desplazamiento es rápido;
- cerca de una superficie disminuye automáticamente;
- si el siguiente paso invadiría la geometría, el movimiento se reduce;
- la rueda permite bajar la velocidad hasta `0.0001×`.

Esta estrategia mejora especialmente Mandelbulb, Mandelbox, Menger y los IFS volumétricos.

## Biblioteca inicial v2.1

### Fractales 2D

1. Mandelbrot.
2. Julia.
3. Burning Ship.
4. Tricorn.
5. Multibrot cúbico.
6. Celtic.
7. Buffalo.
8. Perpendicular Mandelbrot.
9. Perpendicular Burning Ship.
10. Phoenix.
11. Magnet I.
12. Newton `z³ − 1`.
13. Multibrot cuártico.
14. Multibrot quíntico.
15. Burning Ship cúbico.
16. Nova.

### Entornos 3D

1. Mandelbulb.
2. Mandelbox.
3. Esponja de Menger.
4. Julia 3D.
5. Tetraedro de Sierpinski.
6. Apollonian 3D.
7. Amazing Surface.
8. IFS caleidoscópico.

## Controles

### General

- Clic sobre el lienzo: bloquear el puntero e iniciar el modo inmersivo.
- `Esc`: liberar el cursor.
- Rueda: ajustar la velocidad base.
- `Shift`: aceleración temporal.

### Entornos 2D

- `W` / `S`: acercar o alejar.
- `A` / `D`: desplazamiento horizontal.
- Flechas: desplazamiento horizontal y vertical.
- Ratón bloqueado o arrastre: desplazamiento libre.

### Entornos 3D

- `W` / `S`: avanzar o retroceder.
- `A` / `D`: desplazamiento lateral.
- `Q` / `E`: bajar o subir.
- Ratón: orientación de la cámara.

## Render adaptativo

El motor utiliza tres etapas:

1. **Navegación:** resolución y complejidad reducidas para maximizar la respuesta.
2. **Refinando:** resolución, iteraciones y pasos de ray marching intermedios.
3. **Máxima definición:** calidad completa después de permanecer quieto.

Los ajustes máximos no obligan a renderizar toda la calidad durante el movimiento. La aplicación reduce temporalmente el coste y recupera la definición al detenerse.

## Biblioteca interna de información

El icono de información abre un sistema documental integrado con:

- introducción a los fractales;
- números complejos, iteración, escape y convergencia;
- dimensión fractal y autosimilitud;
- ray marching y estimadores de distancia;
- precisión numérica y `double-single`;
- controles y parámetros visuales;
- catálogo detallado de cada entorno;
- glosario avanzado;
- búsqueda interna.

## Capturas

El botón de cámara genera archivos PNG sin pérdida. Puede elegirse:

- resolución de pantalla;
- 4K;
- 8K.

La exportación consulta el límite de textura de la GPU y reduce automáticamente la resolución cuando el dispositivo no puede asumir el tamaño solicitado.

## Arquitectura

```text
Fractales/
├── app/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── app.ts          # interfaz, navegación, captura y render adaptativo
│   │   ├── catalog.ts      # catálogo y metadatos de los fractales
│   │   ├── knowledge.ts    # biblioteca educativa interna
│   │   ├── math.ts         # precisión y estimadores CPU para navegación
│   │   ├── shaders.ts      # motor GLSL 2D/3D
│   │   ├── main.ts
│   │   └── styles.css
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

## Publicación en GitHub Pages

La fuente recomendada es **GitHub Actions**:

1. `Settings > Pages`.
2. En `Build and deployment`, seleccionar `GitHub Actions`.
3. Ejecutar `Deploy Fractales to GitHub Pages` o realizar un push a `main`.

## Validación de v2.1

- TypeScript estricto: correcto.
- Compilación Vite: correcta.
- Análisis sintáctico de los shaders GLSL: correcto.
- Bundle de producción generado correctamente.

La validación visual final requiere un navegador con un contexto WebGL real. El entorno automatizado utilizado para compilar no dispone de EGL funcional.

## Hoja de ruta

- Perturbation rendering con órbitas de referencia multiprecisión.
- Series approximation para saltar iteraciones en zoom extremo.
- Backend WebGPU/WGSL.
- Acumulación temporal y antialiasing progresivo.
- Marcadores, rutas guiadas y coordenadas compartibles.
- Presets cinematográficos y exportación 8K por teselas.
- WebXR para exploración inmersiva.

## Licencia

Apache License 2.0. Three.js se distribuye bajo licencia MIT como dependencia externa.
