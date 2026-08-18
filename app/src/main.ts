import { installProjectAbout } from './about.js';
import { FractalApp } from './app.js';

type StartupController = {
  set: (value: number, label?: string) => void;
  complete: () => void;
  error: (message?: string) => void;
};

const startup = (window as Window & { __fractalesStartup?: StartupController }).__fractalesStartup;
startup?.set(78, 'Cargando módulos de aplicación');

const canvas = document.querySelector<HTMLCanvasElement>('#viewport');
const root = document.querySelector<HTMLElement>('#ui-root');

if (!canvas || !root) {
  startup?.error('No se pudo construir la interfaz');
  throw new Error('No se ha podido construir la interfaz principal de Fractales.');
}

try {
  startup?.set(86, 'Inicializando GPU y shaders');
  new FractalApp(canvas, root);
  startup?.set(94, 'Construyendo interfaz y biblioteca');
  installProjectAbout(root);

  requestAnimationFrame(() => {
    startup?.set(98, 'Preparando primer fotograma');
    requestAnimationFrame(() => startup?.complete());
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  startup?.error('Error durante la inicialización');
  root.innerHTML = `<section class="fatal"><strong>Error de inicialización</strong><p>${message}</p><p>Comprueba que la aceleración por hardware esté activa en el navegador.</p></section>`;
  console.error(error);
}
