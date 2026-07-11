export type FractalDimension = '2D' | '3D';

export interface FractalDefinition {
  id: string;
  name: string;
  dimension: FractalDimension;
  shaderId: number;
  family: string;
  description: string;
  formula: string;
  notes: string;
  defaultCenter?: [number, number];
  defaultScale?: number;
  defaultPosition?: [number, number, number];
  defaultYaw?: number;
  defaultPitch?: number;
  power?: number;
  aux?: number;
}

export const FRACTALS: readonly FractalDefinition[] = [
  {
    id: 'mandelbrot', name: 'Mandelbrot', dimension: '2D', shaderId: 0, family: 'Escape-time',
    description: 'El conjunto cuadrático clásico y su frontera inagotable.', formula: 'zₙ₊₁ = zₙ² + c',
    notes: 'Incluye aritmética double-single para zoom profundo.', defaultCenter: [-0.55, 0], defaultScale: 3.35, power: 2
  },
  {
    id: 'julia', name: 'Julia', dimension: '2D', shaderId: 1, family: 'Escape-time',
    description: 'Familia dinámica generada fijando una constante compleja.', formula: 'zₙ₊₁ = zₙ² + k',
    notes: 'La constante puede variarse desde el panel avanzado.', defaultCenter: [0, 0], defaultScale: 3.2, power: 2
  },
  {
    id: 'burning-ship', name: 'Burning Ship', dimension: '2D', shaderId: 2, family: 'Escape-time',
    description: 'Variante absoluta con costas mecánicas y estructuras volcánicas.', formula: 'zₙ₊₁ = (|Re zₙ| + i|Im zₙ|)² + c',
    notes: 'Presenta filamentos extremadamente ricos en el hemisferio inferior.', defaultCenter: [-0.47, -0.5], defaultScale: 3.4, power: 2
  },
  {
    id: 'tricorn', name: 'Tricorn', dimension: '2D', shaderId: 3, family: 'Antiholomorfo',
    description: 'Mandelbrot anticonjugado con simetría de tres brazos.', formula: 'zₙ₊₁ = conjugado(zₙ)² + c',
    notes: 'También se conoce como Mandelbar.', defaultCenter: [0, 0], defaultScale: 3.5, power: 2
  },
  {
    id: 'multibrot-3', name: 'Multibrot cúbico', dimension: '2D', shaderId: 4, family: 'Multibrot',
    description: 'Generalización de Mandelbrot con potencia tres.', formula: 'zₙ₊₁ = zₙ³ + c',
    notes: 'Tres lóbulos principales y simetría rotacional.', defaultCenter: [0, 0], defaultScale: 3.1, power: 3
  },
  {
    id: 'celtic', name: 'Celtic', dimension: '2D', shaderId: 5, family: 'Plegado',
    description: 'Variante plegada con canales, filigranas y nudos visuales.', formula: 'zₙ₊₁ = |Re(zₙ²)| + i Im(zₙ²) + c',
    notes: 'Especialmente adecuada para coloración por trampas orbitales.', defaultCenter: [-0.2, 0], defaultScale: 3.3, power: 2
  },
  {
    id: 'buffalo', name: 'Buffalo', dimension: '2D', shaderId: 6, family: 'Plegado',
    description: 'Combinación de valores absolutos con perfiles ramificados.', formula: 'zₙ₊₁ = |Re(zₙ²)| - i|Im(zₙ²)| + c',
    notes: 'Produce crestas y cavidades de aspecto orgánico.', defaultCenter: [-0.2, 0], defaultScale: 3.3, power: 2
  },
  {
    id: 'perpendicular-mandelbrot', name: 'Perpendicular Mandelbrot', dimension: '2D', shaderId: 7, family: 'Perpendicular',
    description: 'Variante con plegado cruzado de los componentes complejos.', formula: 'zₙ₊₁ = (Re zₙ + i|Im zₙ|)² + c',
    notes: 'Genera corredores y ejes pronunciados.', defaultCenter: [-0.3, 0], defaultScale: 3.4, power: 2
  },
  {
    id: 'perpendicular-burning-ship', name: 'Perpendicular Burning Ship', dimension: '2D', shaderId: 8, family: 'Perpendicular',
    description: 'Fusión entre Burning Ship y plegados perpendiculares.', formula: 'zₙ₊₁ = (|Re zₙ| - i Im zₙ)² + c',
    notes: 'Produce espinas y estructuras navales muy densas.', defaultCenter: [-0.45, -0.45], defaultScale: 3.5, power: 2
  },
  {
    id: 'phoenix', name: 'Phoenix', dimension: '2D', shaderId: 9, family: 'Recurrencia de segundo orden',
    description: 'Fractal con memoria: cada paso depende también de la órbita anterior.', formula: 'zₙ₊₁ = zₙ² + c + p·zₙ₋₁',
    notes: 'El parámetro auxiliar controla el carácter de las alas.', defaultCenter: [0, 0], defaultScale: 3.2, power: 2, aux: -0.5
  },
  {
    id: 'magnet-1', name: 'Magnet I', dimension: '2D', shaderId: 10, family: 'Racional',
    description: 'Fractal racional con regiones de atracción y filamentos magnéticos.', formula: 'zₙ₊₁ = ((zₙ² + c − 1) / (2zₙ + c − 2))²',
    notes: 'Su dinámica difiere del escape-time polinómico clásico.', defaultCenter: [1.1, 0], defaultScale: 4.2, power: 2
  },
  {
    id: 'newton-3', name: 'Newton z³ − 1', dimension: '2D', shaderId: 11, family: 'Newtoniano',
    description: 'Cuencas de convergencia del método de Newton para tres raíces.', formula: 'zₙ₊₁ = zₙ − (zₙ³ − 1)/(3zₙ²)',
    notes: 'Cada color representa una raíz atractora distinta.', defaultCenter: [0, 0], defaultScale: 4.0, power: 3
  },
  {
    id: 'multibrot-4', name: 'Multibrot cuártico', dimension: '2D', shaderId: 12, family: 'Multibrot',
    description: 'Mandelbrot elevado a cuarta potencia.', formula: 'zₙ₊₁ = zₙ⁴ + c',
    notes: 'Cuatro direcciones dominantes y miniaturas autosimilares.', defaultCenter: [0, 0], defaultScale: 3.0, power: 4
  },
  {
    id: 'multibrot-5', name: 'Multibrot quíntico', dimension: '2D', shaderId: 13, family: 'Multibrot',
    description: 'Mandelbrot de potencia cinco con simetría pentarradial.', formula: 'zₙ₊₁ = zₙ⁵ + c',
    notes: 'Mayor coste por iteración, pero riqueza geométrica elevada.', defaultCenter: [0, 0], defaultScale: 2.9, power: 5
  },
  {
    id: 'burning-ship-3', name: 'Burning Ship cúbico', dimension: '2D', shaderId: 14, family: 'Escape-time',
    description: 'Versión cúbica del Burning Ship.', formula: 'zₙ₊₁ = (|Re zₙ| + i|Im zₙ|)³ + c',
    notes: 'Estructuras tripolares de apariencia industrial.', defaultCenter: [-0.2, -0.35], defaultScale: 3.1, power: 3
  },
  {
    id: 'nova', name: 'Nova', dimension: '2D', shaderId: 15, family: 'Newtoniano',
    description: 'Newton relajado con constante compleja añadida.', formula: 'zₙ₊₁ = zₙ − a·f(zₙ)/f′(zₙ) + c',
    notes: 'Combina cuencas de Newton con estructuras tipo Julia.', defaultCenter: [0, 0], defaultScale: 4.0, power: 3, aux: 1
  },
  {
    id: 'mandelbulb', name: 'Mandelbulb', dimension: '3D', shaderId: 100, family: 'Potencia esférica',
    description: 'Interpretación tridimensional del conjunto de Mandelbrot.', formula: 'Transformación esférica de potencia n y suma del punto inicial.',
    notes: 'Ray marching con estimador de distancia y velocidad de proximidad.', defaultPosition: [0, 0.15, 3.8], defaultYaw: Math.PI, defaultPitch: 0, power: 8
  },
  {
    id: 'mandelbox', name: 'Mandelbox', dimension: '3D', shaderId: 101, family: 'Plegado espacial',
    description: 'Fractal volumétrico de pliegues, cavernas y arquitectura infinita.', formula: 'Box fold + sphere fold + escala.',
    notes: 'Excelente para navegación interior y corredores autosimilares.', defaultPosition: [0, 0.1, 4.8], defaultYaw: Math.PI, defaultPitch: 0, power: 2
  },
  {
    id: 'menger', name: 'Esponja de Menger', dimension: '3D', shaderId: 102, family: 'Autosimilitud cúbica',
    description: 'Megaconstrucción cúbica perforada a todas las escalas.', formula: 'Subdivisión 3×3×3 eliminando cruces centrales.',
    notes: 'La navegación adaptativa evita atravesar paredes al aproximarse.', defaultPosition: [2.8, 2.2, 4.4], defaultYaw: -2.55, defaultPitch: -0.22, power: 3
  },
  {
    id: 'julia-bulb', name: 'Julia 3D', dimension: '3D', shaderId: 103, family: 'Julia volumétrico',
    description: 'Volumen tipo Julia construido con una constante tridimensional.', formula: 'Iteración de potencia con desplazamiento fijo.',
    notes: 'Aspecto biológico y cavidades internas complejas.', defaultPosition: [0, 0.1, 3.6], defaultYaw: Math.PI, defaultPitch: 0, power: 7
  },
  {
    id: 'sierpinski-tetrahedron', name: 'Tetraedro de Sierpinski', dimension: '3D', shaderId: 104, family: 'IFS poliédrico',
    description: 'Versión tridimensional del triángulo de Sierpinski.', formula: 'Plegado iterativo hacia cuatro vértices tetraédricos.',
    notes: 'Huecos jerárquicos y silueta tetraédrica.', defaultPosition: [2.8, 2.1, 4.5], defaultYaw: -2.55, defaultPitch: -0.2, power: 2
  },
  {
    id: 'apollonian', name: 'Apollonian 3D', dimension: '3D', shaderId: 105, family: 'Inversión esférica',
    description: 'Red tridimensional de cavidades y esferas encajadas.', formula: 'Inversiones repetidas y plegado modular.',
    notes: 'Produce cámaras y túneles de gran densidad.', defaultPosition: [0, 0, 4.2], defaultYaw: Math.PI, defaultPitch: 0, power: 2
  },
  {
    id: 'amazing-surface', name: 'Amazing Surface', dimension: '3D', shaderId: 106, family: 'Plegado espacial',
    description: 'Superficie fractal de pliegues suaves y arcos monumentales.', formula: 'Box fold modificado con inversión radial.',
    notes: 'Muy adecuada para vuelo interior continuo.', defaultPosition: [0, 0.4, 5.0], defaultYaw: Math.PI, defaultPitch: -0.04, power: 2
  },
  {
    id: 'kaleidoscopic-ifs', name: 'IFS caleidoscópico', dimension: '3D', shaderId: 107, family: 'IFS reflectivo',
    description: 'Cristal fractal generado mediante simetrías, reflexiones y escala.', formula: 'Reflexiones planarias + rotación + contracción.',
    notes: 'Estructuras cristalinas con simetría radial.', defaultPosition: [0, 0, 4.6], defaultYaw: Math.PI, defaultPitch: 0, power: 2
  }
] as const;

export const FRACTAL_BY_ID = new Map(FRACTALS.map((fractal) => [fractal.id, fractal]));
