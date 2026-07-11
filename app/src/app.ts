import * as THREE from 'three';
import { FRACTALS, FRACTAL_BY_ID, type FractalDefinition } from './catalog';
import { KNOWLEDGE_SECTIONS } from './knowledge';
import { estimateSceneDistance, formatScientific, splitFloat64 } from './math';
import { fragmentShader, vertexShader } from './shaders';

interface UniformSet extends Record<string, THREE.IUniform> {
  uResolution: { value: THREE.Vector2 };
  uTime: { value: number };
  uDimension: { value: number };
  uFractal: { value: number };
  uCenterHi: { value: THREE.Vector2 };
  uCenterLo: { value: THREE.Vector2 };
  uScaleDS: { value: THREE.Vector2 };
  uJuliaHi: { value: THREE.Vector2 };
  uJuliaLo: { value: THREE.Vector2 };
  uIterations: { value: number };
  uRaySteps: { value: number };
  uVolumeIterations: { value: number };
  uStage: { value: number };
  uPower: { value: number };
  uAux: { value: number };
  uExposure: { value: number };
  uPalette: { value: number };
  uSurfacePrecision: { value: number };
  uGlow: { value: number };
  uCameraPosition: { value: THREE.Vector3 };
  uCameraMatrix: { value: THREE.Matrix3 };
}

interface UiElements {
  root: HTMLElement;
  drawer: HTMLElement;
  hamburger: HTMLButtonElement;
  info: HTMLButtonElement;
  reset: HTMLButtonElement;
  fullscreen: HTMLButtonElement;
  screenshot: HTMLButtonElement;
  fractal: HTMLSelectElement;
  quality: HTMLSelectElement;
  detail: HTMLInputElement;
  rayDepth: HTMLInputElement;
  surface: HTMLInputElement;
  power: HTMLInputElement;
  palette: HTMLInputElement;
  exposure: HTMLInputElement;
  glow: HTMLInputElement;
  exportResolution: HTMLSelectElement;
  selectedName: HTMLElement;
  selectedMeta: HTMLElement;
  detailValue: HTMLOutputElement;
  rayDepthValue: HTMLOutputElement;
  surfaceValue: HTMLOutputElement;
  powerValue: HTMLOutputElement;
  paletteValue: HTMLOutputElement;
  exposureValue: HTMLOutputElement;
  glowValue: HTMLOutputElement;
  fps: HTMLElement;
  engine: HTMLElement;
  refinement: HTMLElement;
  precision: HTMLElement;
  proximity: HTMLElement;
  coordinates: HTMLElement;
  speed: HTMLElement;
  toast: HTMLElement;
  crosshair: HTMLElement;
  knowledge: HTMLElement;
  knowledgeNav: HTMLElement;
  knowledgeContent: HTMLElement;
  knowledgeClose: HTMLButtonElement;
  knowledgeSearch: HTMLInputElement;
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const TEMP_FORWARD = new THREE.Vector3();
const TEMP_RIGHT = new THREE.Vector3();
const TEMP_UP = new THREE.Vector3();
const TEMP_MOVE = new THREE.Vector3();
const TEMP_NEXT = new THREE.Vector3();

const ICONS = {
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10.7v6M12 7.2h.01"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6v5h-5"/><path d="M19 11a8 8 0 1 0 1 5"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.4-2h7.2L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>'
} as const;

export class FractalApp {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly uniforms: UniformSet;
  private readonly ui: UiElements;

  private current: FractalDefinition = FRACTALS[0]!;
  private readonly center = new THREE.Vector2(-0.55, 0);
  private scale = 3.35;
  private baseScale = 3.35;
  private readonly julia = new THREE.Vector2(-0.74543, 0.11301);
  private readonly cameraPosition = new THREE.Vector3(0, 0.15, 3.8);
  private yaw = Math.PI;
  private pitch = 0;
  private readonly cameraMatrix = new THREE.Matrix3();
  private speed = 1;
  private readonly keys = new Set<string>();
  private pointerLocked = false;
  private dragging = false;
  private dragMoved = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private qualityMultiplier = 1.45;
  private detail = 100;
  private rayDepth = 100;
  private surfacePrecision = 1;
  private refinementStage = -1;
  private lastInteraction = performance.now();
  private lastFrame = performance.now();
  private dirty = true;
  private lastPixelRatio = 0;
  private fps = 0;
  private fpsFrames = 0;
  private fpsClock = performance.now();
  private lastHudUpdate = 0;
  private proximity = 1;
  private readonly resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, root: HTMLElement) {
    this.canvas = canvas;
    this.ui = this.buildUi(root);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x02040b, 1);

    this.uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uDimension: { value: 0 },
      uFractal: { value: 0 },
      uCenterHi: { value: new THREE.Vector2() },
      uCenterLo: { value: new THREE.Vector2() },
      uScaleDS: { value: new THREE.Vector2() },
      uJuliaHi: { value: new THREE.Vector2() },
      uJuliaLo: { value: new THREE.Vector2() },
      uIterations: { value: 720 },
      uRaySteps: { value: 220 },
      uVolumeIterations: { value: 24 },
      uStage: { value: 0 },
      uPower: { value: 8 },
      uAux: { value: -0.5 },
      uExposure: { value: 1.22 },
      uPalette: { value: 0 },
      uSurfacePrecision: { value: 1 },
      uGlow: { value: 1 },
      uCameraPosition: { value: this.cameraPosition },
      uCameraMatrix: { value: this.cameraMatrix }
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);

    this.resizeObserver = new ResizeObserver(() => {
      this.markInteraction();
      this.resize(true);
    });
    this.resizeObserver.observe(this.canvas);

    this.bindEvents();
    this.setFractal('mandelbrot');
    this.resize(true);
    this.renderer.compile(this.scene, this.camera);
    this.setToast('Motor GPU de precisión extendida inicializado');
    requestAnimationFrame(this.animate);
  }

  private buildUi(root: HTMLElement): UiElements {
    const options2D = FRACTALS.filter((fractal) => fractal.dimension === '2D')
      .map((fractal) => `<option value="${fractal.id}">${fractal.name}</option>`).join('');
    const options3D = FRACTALS.filter((fractal) => fractal.dimension === '3D')
      .map((fractal) => `<option value="${fractal.id}">${fractal.name}</option>`).join('');
    const knowledgeNav = KNOWLEDGE_SECTIONS.map((section, index) =>
      `<button type="button" data-knowledge="${section.id}" class="${index === 0 ? 'active' : ''}">${section.title}</button>`
    ).join('');

    root.innerHTML = `
      <button class="hamburger" id="hamburger" aria-label="Abrir biblioteca"><span></span><span></span><span></span></button>

      <aside class="drawer" id="drawer" aria-label="Biblioteca de fractales">
        <nav class="icon-toolbar" aria-label="Herramientas principales">
          <button id="info-button" class="icon-button" type="button" title="Biblioteca de información" aria-label="Abrir biblioteca de información">${ICONS.info}</button>
          <button id="reset-button" class="icon-button" type="button" title="Recentrar" aria-label="Recentrar entorno">${ICONS.reset}</button>
          <button id="fullscreen-button" class="icon-button" type="button" title="Pantalla completa" aria-label="Alternar pantalla completa">${ICONS.fullscreen}</button>
          <button id="screenshot-button" class="icon-button" type="button" title="Captura PNG de alta resolución" aria-label="Generar captura PNG">${ICONS.camera}</button>
        </nav>

        <section class="drawer-section environment-section">
          <label class="control control-wide"><span>Entorno</span><select id="fractal-select"><optgroup label="Fractales 2D">${options2D}</optgroup><optgroup label="Fractales 3D">${options3D}</optgroup></select></label>
          <div class="selected-summary"><strong id="selected-name"></strong><span id="selected-meta"></span></div>
        </section>

        <section class="drawer-section">
          <div class="section-label">Render</div>
          <label class="control control-wide"><span>Calidad</span><select id="quality-select"><option value="0.78">Rendimiento</option><option value="1">Alta</option><option value="1.22">Ultra</option><option value="1.45" selected>Cinematográfica</option></select></label>
          <div class="control-grid">
            ${this.rangeControl('detail-range', 'Detalle', 10, 100, 100, 1)}
            ${this.rangeControl('ray-depth-range', 'Profundidad de rayos', 10, 100, 100, 1)}
            ${this.rangeControl('surface-range', 'Precisión de superficie', 10, 100, 100, 1)}
            ${this.rangeControl('power-range', 'Potencia', 2, 16, 8, 0.1)}
          </div>
        </section>

        <section class="drawer-section">
          <div class="section-label">Apariencia</div>
          <div class="control-grid">
            ${this.rangeControl('palette-range', 'Paleta', 0, 16, 0, 0.1)}
            ${this.rangeControl('exposure-range', 'Exposición', 0.55, 2.4, 1.22, 0.01)}
            ${this.rangeControl('glow-range', 'Relieve cromático', 0, 2, 1, 0.01)}
            <label class="control"><span>Captura</span><select id="export-resolution"><option value="screen">Pantalla</option><option value="4k" selected>4K</option><option value="8k">8K</option></select></label>
          </div>
        </section>

        <details class="diagnostics drawer-section">
          <summary>Diagnóstico técnico</summary>
          <dl>
            <div><dt>Motor</dt><dd id="engine-stat">GPU</dd></div>
            <div><dt>Rendimiento</dt><dd id="fps-stat">0 FPS</dd></div>
            <div><dt>Refinado</dt><dd id="refinement-stat">Navegación</dd></div>
            <div><dt>Precisión 2D</dt><dd id="precision-stat">Double-single</dd></div>
            <div><dt>Proximidad 3D</dt><dd id="proximity-stat">—</dd></div>
          </dl>
        </details>

        <section class="compact-help drawer-section">
          <p><b>W/S</b> zoom o avance · <b>A/D</b> lateral · <b>Q/E</b> vertical 3D</p>
          <p><b>Clic</b> modo inmersivo · <b>Rueda</b> velocidad · <b>Esc</b> liberar cursor</p>
        </section>
      </aside>

      <footer class="telemetry" aria-live="polite">
        <span id="coordinates-stat">X 0 · Y 0</span>
        <span id="speed-stat">Velocidad 1.00×</span>
      </footer>

      <div class="crosshair" id="crosshair" aria-hidden="true"></div>
      <div class="toast" id="toast" role="status"></div>

      <section class="knowledge" id="knowledge" aria-hidden="true" aria-label="Biblioteca interna sobre fractales">
        <header class="knowledge-head">
          <input id="knowledge-search" type="search" placeholder="Buscar en la biblioteca" aria-label="Buscar en la biblioteca" />
          <button id="knowledge-close" class="icon-button" type="button" aria-label="Cerrar biblioteca">${ICONS.close}</button>
        </header>
        <div class="knowledge-layout">
          <nav id="knowledge-nav" class="knowledge-nav">${knowledgeNav}</nav>
          <article id="knowledge-content" class="knowledge-content">${KNOWLEDGE_SECTIONS[0]!.html}</article>
        </div>
      </section>`;

    const get = <T extends HTMLElement>(id: string): T => {
      const element = root.querySelector<T>(`#${id}`);
      if (!element) throw new Error(`No se encontró el elemento #${id}`);
      return element;
    };

    return {
      root,
      drawer: get('drawer'),
      hamburger: get('hamburger'),
      info: get('info-button'),
      reset: get('reset-button'),
      fullscreen: get('fullscreen-button'),
      screenshot: get('screenshot-button'),
      fractal: get('fractal-select'),
      quality: get('quality-select'),
      detail: get('detail-range'),
      rayDepth: get('ray-depth-range'),
      surface: get('surface-range'),
      power: get('power-range'),
      palette: get('palette-range'),
      exposure: get('exposure-range'),
      glow: get('glow-range'),
      exportResolution: get('export-resolution'),
      selectedName: get('selected-name'),
      selectedMeta: get('selected-meta'),
      detailValue: get('detail-range-value'),
      rayDepthValue: get('ray-depth-range-value'),
      surfaceValue: get('surface-range-value'),
      powerValue: get('power-range-value'),
      paletteValue: get('palette-range-value'),
      exposureValue: get('exposure-range-value'),
      glowValue: get('glow-range-value'),
      fps: get('fps-stat'),
      engine: get('engine-stat'),
      refinement: get('refinement-stat'),
      precision: get('precision-stat'),
      proximity: get('proximity-stat'),
      coordinates: get('coordinates-stat'),
      speed: get('speed-stat'),
      toast: get('toast'),
      crosshair: get('crosshair'),
      knowledge: get('knowledge'),
      knowledgeNav: get('knowledge-nav'),
      knowledgeContent: get('knowledge-content'),
      knowledgeClose: get('knowledge-close'),
      knowledgeSearch: get('knowledge-search')
    };
  }

  private rangeControl(id: string, label: string, min: number, max: number, value: number, step: number): string {
    return `<label class="control range-control"><span>${label}<output id="${id}-value">${value}</output></span><input id="${id}" type="range" min="${min}" max="${max}" value="${value}" step="${step}" /></label>`;
  }

  private bindEvents(): void {
    this.ui.hamburger.addEventListener('click', () => {
      this.ui.drawer.classList.toggle('open');
      this.ui.hamburger.classList.toggle('open');
    });
    this.ui.info.addEventListener('click', () => this.openKnowledge());
    this.ui.knowledgeClose.addEventListener('click', () => this.closeKnowledge());
    this.ui.knowledge.addEventListener('click', (event) => {
      if (event.target === this.ui.knowledge) this.closeKnowledge();
    });
    this.ui.knowledgeNav.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-knowledge]');
      if (!button) return;
      this.selectKnowledgeSection(button.dataset.knowledge ?? 'inicio');
    });
    this.ui.knowledgeSearch.addEventListener('input', () => this.searchKnowledge(this.ui.knowledgeSearch.value));

    this.ui.fractal.addEventListener('change', () => this.setFractal(this.ui.fractal.value));
    this.ui.quality.addEventListener('change', () => {
      this.qualityMultiplier = Number(this.ui.quality.value);
      this.markInteraction();
      this.resize(true);
    });
    this.ui.detail.addEventListener('input', () => {
      this.detail = Number(this.ui.detail.value);
      this.ui.detailValue.value = this.ui.detail.value;
      this.markInteraction();
    });
    this.ui.rayDepth.addEventListener('input', () => {
      this.rayDepth = Number(this.ui.rayDepth.value);
      this.ui.rayDepthValue.value = this.ui.rayDepth.value;
      this.markInteraction();
    });
    this.ui.surface.addEventListener('input', () => {
      this.surfacePrecision = Number(this.ui.surface.value) / 100;
      this.uniforms.uSurfacePrecision.value = this.surfacePrecision;
      this.ui.surfaceValue.value = this.ui.surface.value;
      this.markInteraction();
    });
    this.ui.power.addEventListener('input', () => {
      this.uniforms.uPower.value = Number(this.ui.power.value);
      this.ui.powerValue.value = Number(this.ui.power.value).toFixed(1);
      this.markInteraction();
    });
    this.ui.palette.addEventListener('input', () => {
      this.uniforms.uPalette.value = Number(this.ui.palette.value);
      this.ui.paletteValue.value = Number(this.ui.palette.value).toFixed(1);
      this.markInteraction();
    });
    this.ui.exposure.addEventListener('input', () => {
      this.uniforms.uExposure.value = Number(this.ui.exposure.value);
      this.ui.exposureValue.value = Number(this.ui.exposure.value).toFixed(2);
      this.markInteraction();
    });
    this.ui.glow.addEventListener('input', () => {
      this.uniforms.uGlow.value = Number(this.ui.glow.value);
      this.ui.glowValue.value = Number(this.ui.glow.value).toFixed(2);
      this.markInteraction();
    });

    this.ui.reset.addEventListener('click', () => this.resetCurrent());
    this.ui.fullscreen.addEventListener('click', () => void this.toggleFullscreen());
    this.ui.screenshot.addEventListener('click', () => void this.captureUltra());

    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.ui.knowledge.classList.contains('open')) {
        this.closeKnowledge();
        return;
      }
      if (['INPUT', 'SELECT', 'BUTTON'].includes((event.target as HTMLElement).tagName)) return;
      const valid = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
      if (!valid.includes(event.code)) return;
      event.preventDefault();
      this.keys.add(event.code);
      this.markInteraction();
    });
    document.addEventListener('keyup', (event) => this.keys.delete(event.code));

    this.canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || this.ui.drawer.classList.contains('open') || this.ui.knowledge.classList.contains('open')) return;
      this.dragging = true;
      this.dragMoved = false;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', (event) => {
      if (this.pointerLocked || !this.dragging) return;
      const dx = event.clientX - this.lastPointerX;
      const dy = event.clientY - this.lastPointerY;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 2) this.dragMoved = true;
      this.applyMouseMovement(dx, dy);
    });
    this.canvas.addEventListener('pointerup', (event) => {
      if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
      this.dragging = false;
      if (!this.dragMoved && !this.ui.drawer.classList.contains('open')) this.requestImmersive();
    });
    this.canvas.addEventListener('pointercancel', () => { this.dragging = false; });
    this.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.16 : 1 / 1.16;
      this.speed = THREE.MathUtils.clamp(this.speed * factor, 0.0001, 80);
      this.markInteraction();
      this.setToast(`Velocidad ${this.speed < 0.01 ? this.speed.toExponential(2) : this.speed.toFixed(2)}×`);
    }, { passive: false });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      this.ui.crosshair.classList.toggle('visible', this.pointerLocked);
      this.setToast(this.pointerLocked ? 'Modo inmersivo activo · Esc para salir' : 'Cursor liberado');
    });
    document.addEventListener('mousemove', (event) => {
      if (this.pointerLocked) this.applyMouseMovement(event.movementX, event.movementY);
    });
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.showFatal('El navegador ha perdido el contexto gráfico. Recarga la página para reiniciar la GPU.');
    });
    window.addEventListener('resize', () => this.resize(true));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.markInteraction(); });
  }

  private setFractal(id: string): void {
    const definition = FRACTAL_BY_ID.get(id);
    if (!definition) return;
    this.current = definition;
    this.ui.fractal.value = id;
    this.ui.selectedName.textContent = definition.name;
    this.ui.selectedMeta.textContent = `${definition.dimension} · ${definition.family} · ${definition.description}`;
    this.ui.power.value = String(definition.power ?? 8);
    this.ui.powerValue.value = Number(this.ui.power.value).toFixed(1);
    this.uniforms.uPower.value = definition.power ?? 8;
    this.uniforms.uAux.value = definition.aux ?? -0.5;
    this.uniforms.uDimension.value = definition.dimension === '2D' ? 0 : 1;
    this.uniforms.uFractal.value = definition.shaderId;
    this.resetCurrent();
    this.setToast(`${definition.name} · entorno ${definition.dimension}`);
  }

  private resetCurrent(): void {
    if (this.current.dimension === '2D') {
      const [x, y] = this.current.defaultCenter ?? [0, 0];
      this.center.set(x, y);
      this.scale = this.current.defaultScale ?? 3.2;
      this.baseScale = this.scale;
    } else {
      const [x, y, z] = this.current.defaultPosition ?? [0, 0, 4];
      this.cameraPosition.set(x, y, z);
      this.yaw = this.current.defaultYaw ?? Math.PI;
      this.pitch = this.current.defaultPitch ?? 0;
      this.proximity = estimateSceneDistance(this.current.shaderId, this.cameraPosition, this.uniforms.uPower.value);
    }
    this.markInteraction();
  }

  private requestImmersive(): void {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
      return;
    }
    void this.canvas.requestPointerLock();
  }

  private async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    this.markInteraction();
  }

  private async captureUltra(): Promise<void> {
    const rect = this.canvas.getBoundingClientRect();
    const aspect = rect.width / Math.max(rect.height, 1);
    const requestedWidth = this.ui.exportResolution.value === '8k' ? 7680 : this.ui.exportResolution.value === '4k' ? 3840 : Math.round(rect.width * window.devicePixelRatio);
    const maxSize = Math.min(this.renderer.capabilities.maxTextureSize, 8192);
    const maxPixels = 33_000_000;
    let width = Math.min(requestedWidth, maxSize);
    let height = Math.round(width / aspect);
    if (height > maxSize) {
      height = maxSize;
      width = Math.round(height * aspect);
    }
    if (width * height > maxPixels) {
      const factor = Math.sqrt(maxPixels / (width * height));
      width = Math.floor(width * factor);
      height = Math.floor(height * factor);
    }

    const previousPixelRatio = this.lastPixelRatio;
    this.setToast(`Generando PNG ${width} × ${height}…`);
    this.renderer.setPixelRatio(width / Math.max(rect.width, 1));
    this.renderer.setSize(rect.width, rect.height, false);
    this.lastPixelRatio = width / Math.max(rect.width, 1);
    this.render(true, true);

    const blob = await new Promise<Blob | null>((resolve) => this.canvas.toBlob(resolve, 'image/png'));
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `fractales-${this.current.id}-${width}x${height}-${Date.now()}.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.setToast('Captura PNG sin pérdida generada');
    } else {
      this.setToast('No se pudo generar la captura');
    }

    this.lastPixelRatio = previousPixelRatio;
    this.resize(true);
    this.markInteraction();
  }

  private applyMouseMovement(dx: number, dy: number): void {
    if (this.current.dimension === '3D') {
      this.yaw -= dx * 0.0019;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0019, -1.48, 1.48);
    } else {
      const rect = this.canvas.getBoundingClientRect();
      const factor = this.scale / Math.max(rect.height, 1);
      this.center.x += dx * factor;
      this.center.y -= dy * factor;
    }
    this.markInteraction();
  }

  private updateMovement(dt: number): boolean {
    let moved = false;
    const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 4 : 1;

    if (this.current.dimension === '2D') {
      const pan = this.scale * this.speed * boost * dt * 0.58;
      const zoom = Math.exp(this.speed * boost * dt * 0.88);
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) { this.center.x -= pan; moved = true; }
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) { this.center.x += pan; moved = true; }
      if (this.keys.has('ArrowUp')) { this.center.y -= pan; moved = true; }
      if (this.keys.has('ArrowDown')) { this.center.y += pan; moved = true; }
      if (this.keys.has('KeyW')) { this.scale /= zoom; moved = true; }
      if (this.keys.has('KeyS')) { this.scale *= zoom; moved = true; }
      const previousScale = this.scale;
      this.scale = THREE.MathUtils.clamp(this.scale, 2e-17, 1e8);
      if (previousScale < 2e-17) this.setToast('Límite de precisión double-single alcanzado');
    } else {
      this.updateCameraMatrix();
      this.proximity = estimateSceneDistance(this.current.shaderId, this.cameraPosition, this.uniforms.uPower.value);
      const proximityFactor = THREE.MathUtils.clamp(this.proximity * 0.42, 0.000035, 1.65);
      const distance = this.speed * boost * dt * proximityFactor;
      TEMP_MOVE.set(0, 0, 0);
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) TEMP_MOVE.add(TEMP_FORWARD);
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) TEMP_MOVE.sub(TEMP_FORWARD);
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) TEMP_MOVE.add(TEMP_RIGHT);
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) TEMP_MOVE.sub(TEMP_RIGHT);
      if (this.keys.has('KeyE')) TEMP_MOVE.add(WORLD_UP);
      if (this.keys.has('KeyQ')) TEMP_MOVE.sub(WORLD_UP);

      if (TEMP_MOVE.lengthSq() > 0) {
        TEMP_NEXT.copy(this.cameraPosition).addScaledVector(TEMP_MOVE.normalize(), distance);
        const nextDistance = estimateSceneDistance(this.current.shaderId, TEMP_NEXT, this.uniforms.uPower.value);
        const clearance = Math.max(0.00003, this.proximity * 0.10);
        if (nextDistance > clearance || nextDistance >= this.proximity) {
          this.cameraPosition.copy(TEMP_NEXT);
        } else {
          this.cameraPosition.addScaledVector(TEMP_MOVE, distance * 0.12);
        }
        moved = true;
      }
    }

    if (moved) this.markInteraction();
    return moved;
  }

  private updateCameraMatrix(): void {
    const cosPitch = Math.cos(this.pitch);
    TEMP_FORWARD.set(Math.sin(this.yaw) * cosPitch, Math.sin(this.pitch), Math.cos(this.yaw) * cosPitch).normalize();
    TEMP_RIGHT.copy(TEMP_FORWARD).cross(WORLD_UP).normalize();
    TEMP_UP.copy(TEMP_RIGHT).cross(TEMP_FORWARD).normalize();
    this.cameraMatrix.set(
      TEMP_RIGHT.x, TEMP_UP.x, TEMP_FORWARD.x,
      TEMP_RIGHT.y, TEMP_UP.y, TEMP_FORWARD.y,
      TEMP_RIGHT.z, TEMP_UP.z, TEMP_FORWARD.z
    );
  }

  private readonly animate = (now: number): void => {
    const dt = THREE.MathUtils.clamp((now - this.lastFrame) / 1000, 0, 0.05);
    this.lastFrame = now;
    const moved = this.updateMovement(dt);
    const stage = this.calculateRefinementStage(now);
    if (moved || stage !== this.refinementStage || this.dirty) {
      this.refinementStage = stage;
      this.render(false);
    }
    this.updateFps(now);
    if (now - this.lastHudUpdate > 150) {
      this.updateHud();
      this.lastHudUpdate = now;
    }
    requestAnimationFrame(this.animate);
  };

  private calculateRefinementStage(now: number): number {
    const idle = now - this.lastInteraction;
    if (idle < 150) return 0;
    if (idle < 850) return 1;
    return 2;
  }

  private render(forceMaximum: boolean, preserveResolution = false): void {
    const stage = forceMaximum ? 2 : Math.max(this.refinementStage, 0);
    if (!preserveResolution) this.applyAdaptiveQuality(stage);
    this.updateCameraMatrix();
    this.updatePrecisionUniforms();
    const size = this.renderer.getDrawingBufferSize(this.uniforms.uResolution.value);
    this.uniforms.uResolution.value.set(size.x, size.y);
    this.uniforms.uTime.value = performance.now() / 1000;
    this.uniforms.uIterations.value = this.iterationsForStage(stage);
    this.uniforms.uRaySteps.value = this.rayStepsForStage(stage);
    this.uniforms.uVolumeIterations.value = this.volumeIterationsForStage(stage);
    this.uniforms.uStage.value = stage;
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
  }

  private updatePrecisionUniforms(): void {
    const [centerXHi, centerXLo] = splitFloat64(this.center.x);
    const [centerYHi, centerYLo] = splitFloat64(this.center.y);
    const [scaleHi, scaleLo] = splitFloat64(this.scale);
    const [juliaXHi, juliaXLo] = splitFloat64(this.julia.x);
    const [juliaYHi, juliaYLo] = splitFloat64(this.julia.y);
    this.uniforms.uCenterHi.value.set(centerXHi, centerYHi);
    this.uniforms.uCenterLo.value.set(centerXLo, centerYLo);
    this.uniforms.uScaleDS.value.set(scaleHi, scaleLo);
    this.uniforms.uJuliaHi.value.set(juliaXHi, juliaYHi);
    this.uniforms.uJuliaLo.value.set(juliaXLo, juliaYLo);
  }

  private applyAdaptiveQuality(stage: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const stageScale = [0.48, 0.78, 1][stage] ?? 1;
    let target = window.devicePixelRatio * this.qualityMultiplier * stageScale;
    const maxPixels = [720_000, 2_100_000, 5_500_000][stage] ?? 5_500_000;
    const pixelCount = rect.width * rect.height * target * target;
    if (pixelCount > maxPixels) target *= Math.sqrt(maxPixels / pixelCount);
    target = THREE.MathUtils.clamp(target, 0.5, 3.0);
    if (Math.abs(target - this.lastPixelRatio) > 0.025) {
      this.renderer.setPixelRatio(target);
      this.renderer.setSize(rect.width, rect.height, false);
      this.lastPixelRatio = target;
    }
  }

  private iterationsForStage(stage: number): number {
    const values = [100 + this.detail * 1.2, 300 + this.detail * 4.2, 650 + this.detail * 11.5];
    return Math.min(2400, Math.round(values[stage] ?? values[2]!));
  }

  private rayStepsForStage(stage: number): number {
    const values = [58 + this.rayDepth * 0.55, 130 + this.rayDepth * 1.25, 220 + this.rayDepth * 2.0];
    return Math.min(420, Math.round(values[stage] ?? values[2]!));
  }

  private volumeIterationsForStage(stage: number): number {
    const values = [7 + this.detail * 0.05, 11 + this.detail * 0.10, 16 + this.detail * 0.16];
    return Math.min(32, Math.round(values[stage] ?? values[2]!));
  }

  private resize(force: boolean): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (force) this.lastPixelRatio = 0;
    this.applyAdaptiveQuality(Math.max(this.refinementStage, 0));
    this.dirty = true;
  }

  private markInteraction(): void {
    this.lastInteraction = performance.now();
    this.refinementStage = -1;
    this.dirty = true;
  }

  private updateFps(now: number): void {
    this.fpsFrames += 1;
    const elapsed = now - this.fpsClock;
    if (elapsed >= 500) {
      this.fps = this.fpsFrames * 1000 / elapsed;
      this.fpsFrames = 0;
      this.fpsClock = now;
    }
  }

  private updateHud(): void {
    const rendererName = this.renderer.capabilities.isWebGL2 ? 'WebGL2 GPU' : 'WebGL GPU';
    const webGpuAvailable = 'gpu' in navigator ? ' · WebGPU disponible' : '';
    this.ui.engine.textContent = `${rendererName}${webGpuAvailable}`;
    this.ui.fps.textContent = `${this.fps.toFixed(0)} FPS`;
    this.ui.refinement.textContent = ['Navegación', 'Refinando', 'Máxima definición'][Math.max(this.refinementStage, 0)] ?? 'Máxima definición';
    this.ui.precision.textContent = this.current.dimension === '2D' ? 'Double-single · ≈ 14 cifras' : 'Estimador de distancia';
    this.ui.speed.textContent = `Velocidad ${this.speed < 0.01 ? this.speed.toExponential(2) : this.speed.toFixed(2)}×`;

    if (this.current.dimension === '2D') {
      const zoom = this.baseScale / this.scale;
      this.ui.coordinates.textContent = `X ${formatScientific(this.center.x, 6)} · Y ${formatScientific(this.center.y, 6)} · Zoom ${zoom.toExponential(3)}×`;
      this.ui.proximity.textContent = '—';
    } else {
      this.ui.coordinates.textContent = `X ${this.cameraPosition.x.toFixed(5)} · Y ${this.cameraPosition.y.toFixed(5)} · Z ${this.cameraPosition.z.toFixed(5)}`;
      this.ui.proximity.textContent = formatScientific(this.proximity, 4);
    }
  }

  private openKnowledge(): void {
    if (this.pointerLocked) document.exitPointerLock();
    this.ui.knowledge.classList.add('open');
    this.ui.knowledge.setAttribute('aria-hidden', 'false');
    this.ui.knowledgeSearch.focus();
  }

  private closeKnowledge(): void {
    this.ui.knowledge.classList.remove('open');
    this.ui.knowledge.setAttribute('aria-hidden', 'true');
    this.ui.knowledgeSearch.value = '';
  }

  private selectKnowledgeSection(id: string): void {
    const section = KNOWLEDGE_SECTIONS.find((item) => item.id === id) ?? KNOWLEDGE_SECTIONS[0]!;
    this.ui.knowledgeContent.innerHTML = section.html;
    this.ui.knowledgeNav.querySelectorAll('button').forEach((button) => {
      button.classList.toggle('active', (button as HTMLButtonElement).dataset.knowledge === section.id);
    });
    this.ui.knowledgeContent.scrollTop = 0;
  }

  private searchKnowledge(query: string): void {
    const normalized = query.trim().toLocaleLowerCase('es');
    if (!normalized) {
      const active = this.ui.knowledgeNav.querySelector<HTMLButtonElement>('button.active');
      this.selectKnowledgeSection(active?.dataset.knowledge ?? 'inicio');
      return;
    }

    const matches = FRACTALS.filter((fractal) =>
      `${fractal.name} ${fractal.family} ${fractal.description} ${fractal.formula} ${fractal.notes}`.toLocaleLowerCase('es').includes(normalized)
    );
    this.ui.knowledgeContent.innerHTML = `<h2>Resultados</h2><p>${matches.length} coincidencias para <strong>${this.escapeHtml(query)}</strong>.</p><div class="knowledge-catalog">${matches.map((fractal) => `
      <article class="knowledge-fractal" data-dimension="${fractal.dimension}"><header><span>${fractal.dimension}</span><div><h3>${fractal.name}</h3><small>${fractal.family}</small></div></header><p>${fractal.description}</p><dl><div><dt>Definición</dt><dd>${fractal.formula}</dd></div><div><dt>Observación</dt><dd>${fractal.notes}</dd></div></dl></article>`).join('')}</div>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
  }

  private setToast(message: string): void {
    this.ui.toast.textContent = message;
    this.ui.toast.classList.add('visible');
    window.clearTimeout(Number(this.ui.toast.dataset.timer ?? 0));
    const timer = window.setTimeout(() => this.ui.toast.classList.remove('visible'), 2200);
    this.ui.toast.dataset.timer = String(timer);
  }

  private showFatal(message: string): void {
    this.ui.root.innerHTML = `<section class="fatal"><strong>No se ha podido iniciar el motor gráfico</strong><p>${message}</p></section>`;
  }
}
