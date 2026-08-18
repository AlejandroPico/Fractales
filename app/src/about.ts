import './about.css';

const ICONS = {
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10.7v6M12 7.2h.01"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5c2.7-.9 5.4-.5 8.5 1.2v12c-3.1-1.7-5.8-2.1-8.5-1.2z"/><path d="M20.5 5.5c-2.7-.9-5.4-.5-8.5 1.2v12c3.1-1.7 5.8-2.1 8.5-1.2z"/><path d="M12 6.7v12"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8"/><path d="M17 13v6H5V7h6"/></svg>'
} as const;

const PORTFOLIO_URL = 'https://alejandropico.github.io/Portfolio/';
const REPOSITORY_URL = 'https://github.com/AlejandroPico/Fractales';

export function installProjectAbout(root: HTMLElement): void {
  const toolbar = root.querySelector<HTMLElement>('.icon-toolbar');
  const libraryButton = root.querySelector<HTMLButtonElement>('#info-button');
  if (!toolbar || !libraryButton || root.querySelector('#about-button')) return;

  libraryButton.innerHTML = ICONS.book;
  libraryButton.title = 'Enciclopedia de fractales';
  libraryButton.setAttribute('aria-label', 'Abrir enciclopedia de fractales');

  const aboutButton = document.createElement('button');
  aboutButton.id = 'about-button';
  aboutButton.className = 'icon-button';
  aboutButton.type = 'button';
  aboutButton.title = 'Acerca del proyecto';
  aboutButton.setAttribute('aria-label', 'Acerca del proyecto');
  aboutButton.innerHTML = ICONS.info;
  toolbar.insertBefore(aboutButton, libraryButton);

  root.insertAdjacentHTML('beforeend', `
    <section class="project-about" id="project-about" aria-hidden="true" aria-label="Acerca del proyecto" role="dialog" aria-modal="true">
      <div class="project-about__panel">
        <header class="project-about__head">
          <div>
            <span class="project-about__eyebrow">Acerca del proyecto</span>
            <h2>Fractales</h2>
          </div>
          <button id="project-about-close" class="project-about__close" type="button" aria-label="Cerrar">${ICONS.close}</button>
        </header>

        <div class="project-about__body">
          <p class="project-about__lead">Biblioteca inmersiva para explorar fractales bidimensionales y volumétricos como espacios matemáticos navegables, con renderizado acelerado por GPU, precisión extendida y refinado adaptativo.</p>

          <dl class="project-about__facts">
            <div><dt>Autor</dt><dd>Alejandro Pico</dd></div>
            <div><dt>Versión</dt><dd>2.1.0</dd></div>
            <div><dt>Motor</dt><dd>TypeScript · Three.js · WebGL2 · GLSL</dd></div>
            <div><dt>Propósito</dt><dd>Exploración, divulgación y experimentación visual con geometría fractal 2D y 3D.</dd></div>
          </dl>

          <section class="project-about__section">
            <h3>Sobre el proyecto</h3>
            <p>Fractales nace como un explorador matemático interactivo y evoluciona hacia una biblioteca visual de alta precisión. El objetivo es permitir una navegación continua por estructuras autosimilares, combinando profundidad de cálculo, respuesta en tiempo real y una interfaz mínima que deje el protagonismo al propio entorno fractal.</p>
          </section>

          <section class="project-about__section">
            <h3>Sobre el autor</h3>
            <p>Proyecto personal diseñado y desarrollado por Alejandro Pico. El portfolio reúne otros trabajos, experimentos visuales y proyectos de software del autor.</p>
          </section>

          <nav class="project-about__links" aria-label="Enlaces del proyecto">
            <a href="${PORTFOLIO_URL}" target="_blank" rel="noopener noreferrer"><span>Portfolio</span>${ICONS.external}</a>
            <a href="${REPOSITORY_URL}" target="_blank" rel="noopener noreferrer"><span>Repositorio GitHub</span>${ICONS.external}</a>
          </nav>
        </div>

        <footer class="project-about__signature">Alejandro Pico · Fractales</footer>
      </div>
    </section>`);

  const modal = root.querySelector<HTMLElement>('#project-about');
  const closeButton = root.querySelector<HTMLButtonElement>('#project-about-close');
  if (!modal || !closeButton) return;

  const open = (): void => {
    if (document.pointerLockElement) document.exitPointerLock();
    root.querySelector('#drawer')?.classList.remove('open');
    root.querySelector('#hamburger')?.classList.remove('open');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    closeButton.focus();
  };

  const close = (): void => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    aboutButton.focus();
  };

  aboutButton.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) close();
  });
}
