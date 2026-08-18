import { installProjectAbout } from './about.js';
import { FractalApp } from './app.js';

const canvas = document.querySelector<HTMLCanvasElement>('#viewport');
const root = document.querySelector<HTMLElement>('#ui-root');

if (!canvas || !root) {
  throw new Error('No se ha podido construir la interfaz principal de Fractales.');
}

try {
  new FractalApp(canvas, root);
  installProjectAbout(root);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  root.innerHTML = `<section class="fatal"><strong>Error de inicialización</strong><p>${message}</p><p>Comprueba que la aceleración por hardware esté activa en el navegador.</p></section>`;
  console.error(error);
}
