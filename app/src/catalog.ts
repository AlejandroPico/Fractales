export type FractalDimension = '2D' | '3D';

export interface FractalDefinition {
  id: string;
  name: string;
  dimension: FractalDimension;
  shaderId: number;
  description: string;
  defaultCenter?: [number, number];
  defaultScale?: number;
  defaultPosition?: [number, number, number];
  defaultYaw?: number;
  defaultPitch?: number;
  power?: number;
}

export const FRACTALS: readonly FractalDefinition[] = [
  { id: 'mandelbrot', name: 'Mandelbrot', dimension: '2D', shaderId: 0, description: 'El conjunto cuadrático clásico y su frontera infinitamente compleja.', defaultCenter: [-0.55, 0], defaultScale: 3.35, power: 2 },
  { id: 'julia', name: 'Julia', dimension: '2D', shaderId: 1, description: 'Familia dinámica definida por una constante compleja configurable.', defaultCenter: [0, 0], defaultScale: 3.2, power: 2 },
  { id: 'burning-ship', name: 'Burning Ship', dimension: '2D', shaderId: 2, description: 'Variante absoluta con estructuras de aspecto mecánico y volcánico.', defaultCenter: [-0.47, -0.5], defaultScale: 3.4, power: 2 },
  { id: 'tricorn', name: 'Tricorn', dimension: '2D', shaderId: 3, description: 'Mandelbrot anticonjugado con simetrías de tres brazos.', defaultCenter: [0, 0], defaultScale: 3.5, power: 2 },
  { id: 'multibrot-3', name: 'Multibrot cúbico', dimension: '2D', shaderId: 4, description: 'Generalización de Mandelbrot con potencia tres.', defaultCenter: [0, 0], defaultScale: 3.1, power: 3 },
  { id: 'celtic', name: 'Celtic', dimension: '2D', shaderId: 5, description: 'Variante plegada con filigranas y canales de gran detalle.', defaultCenter: [-0.2, 0], defaultScale: 3.3, power: 2 },
  { id: 'mandelbulb', name: 'Mandelbulb', dimension: '3D', shaderId: 10, description: 'Interpretación tridimensional del conjunto de Mandelbrot mediante ray marching.', defaultPosition: [0, 0.15, 3.8], defaultYaw: Math.PI, defaultPitch: 0, power: 8 },
  { id: 'mandelbox', name: 'Mandelbox', dimension: '3D', shaderId: 11, description: 'Fractal volumétrico de plegado espacial, cavernas y arquitectura infinita.', defaultPosition: [0, 0.1, 4.8], defaultYaw: Math.PI, defaultPitch: 0, power: 2 },
  { id: 'menger', name: 'Esponja de Menger', dimension: '3D', shaderId: 12, description: 'Estructura cúbica autosimilar, navegable como una megaconstrucción.', defaultPosition: [2.8, 2.2, 4.4], defaultYaw: -2.55, defaultPitch: -0.22, power: 3 },
  { id: 'julia-bulb', name: 'Julia 3D', dimension: '3D', shaderId: 13, description: 'Volumen de Julia cuaterniónico estilizado para exploración inmersiva.', defaultPosition: [0, 0.1, 3.6], defaultYaw: Math.PI, defaultPitch: 0, power: 7 }
] as const;

export const FRACTAL_BY_ID = new Map(FRACTALS.map((fractal) => [fractal.id, fractal]));
