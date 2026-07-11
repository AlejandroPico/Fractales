import * as THREE from 'three';
import { FRACTALS, FRACTAL_BY_ID, type FractalDefinition } from './catalog';
import { fragmentShader, vertexShader } from './shaders';

interface UniformSet extends Record<string, THREE.IUniform> {
  uResolution: { value: THREE.Vector2 };
  uTime: { value: number };
  uDimension: { value: number };
  uFractal: { value: number };
  uCenter: { value: THREE.Vector2 };
  uScale: { value: number };
  uJulia: { value: THREE.Vector2 };
  uIterations: { value: number };
  uRaySteps: { value: number };
  uPower: { value: number };
  uExposure: { value: number };
  uPalette: { value: number };
  uCameraPosition: { value: THREE.Vector3 };
  uCameraMatrix: { value: THREE.Matrix3 };
}

interface UiElements {
  root: HTMLElement;
  drawer: HTMLElement;
  hamburger: HTMLButtonElement;
  fractal: HTMLSelectElement;
  quality: HTMLSelectElement;
  detail: HTMLInputElement;
  power: HTMLInputElement;
  palette: HTMLInputElement;
  exposure: HTMLInputElement;
  reset: HTMLButtonElement;
  immersive: HTMLButtonElement;
  fullscreen: HTMLButtonElement;
  screenshot: HTMLButtonElement;
  title: HTMLElement;
  description: HTMLElement;
  dimension: HTMLElement;
  fps: HTMLElement;
  engine: HTMLElement;
  coordinates: HTMLElement;
  speed: HTMLElement;
  refinement: HTMLElement;
  toast: HTMLElement;
  crosshair: HTMLElement;
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const TEMP_FORWARD = new THREE.Vector3();
const TEMP_RIGHT = new THREE.Vector3();
const TEMP_UP = new THREE.Vector3();
const TEMP_MOVE = new THREE.Vector3();

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
  private qualityMultiplier = 1;
  private detail = 62;
  private refinementStage = -1;
  private lastInteraction = performance.now();
  private lastFrame = performance.now();
  private dirty = true;
  private lastPixelRatio = 0;
  private fps = 0;
  private fpsFrames = 0;
  private fpsClock = performance.now();
  private lastHudUpdate = 0;
  private resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, root: HTMLElement) {
    this.canvas = canvas;
    this.ui = this.buildUi(root);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x02040b, 1);
    this.uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uDimension: { value: 0 }, uFractal: { value: 0 },
      uCenter: { value: this.center }, uScale: { value: this.scale }, uJulia: { value: this.julia }, uIterations: { value: 300 },
      uRaySteps: { value: 120 }, uPower: { value: 8 }, uExposure: { value: 1.22 }, uPalette: { value: 0 },
      uCameraPosition: { value: this.cameraPosition }, uCameraMatrix: { value: this.cameraMatrix }
    };
    this.material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
    this.resizeObserver = new ResizeObserver(() => { this.markInteraction(); this.resize(true); });
    this.resizeObserver.observe(this.canvas);
    this.bindEvents();
    this.setFractal('mandelbrot');
    this.resize(true);
    this.renderer.compile(this.scene, this.camera);
    this.setToast('Motor GPU inicializado');
    requestAnimationFrame(this.animate);
  }

  private buildUi(root: HTMLElement): UiElements {
    const options2D = FRACTALS.filter((f) => f.dimension === '2D').map((f) => `<option value="${f.id}">${f.name}</option>`).join('');
    const options3D = FRACTALS.filter((f) => f.dimension === '3D').map((f) => `<option value="${f.id}">${f.name}</option>`).join('');
    root.innerHTML = `
      <button class="hamburger" id="hamburger" aria-label="Abrir biblioteca"><span></span><span></span><span></span></button>
      <aside class="drawer" id="drawer" aria-label="Biblioteca de fractales">
        <header class="drawer-head"><span class="brand-mark" aria-hidden="true"></span><strong>Fractales</strong><small>Biblioteca inmersiva</small></header>
        <label class="control control-wide"><span>Entorno</span><select id="fractal-select"><optgroup label="Fractales 2D">${options2D}</optgroup><optgroup label="Fractales 3D">${options3D}</optgroup></select></label>
        <div class="control-grid">
          <label class="control"><span>Calidad</span><select id="quality-select"><option value="0.72">Rendimiento</option><option value="1" selected>Alta</option><option value="1.28">Suprema</option></select></label>
          <label class="control"><span>Detalle</span><input id="detail-range" type="range" min="10" max="100" value="62" /></label>
          <label class="control"><span>Potencia</span><input id="power-range" type="range" min="2" max="12" value="8" step="0.1" /></label>
          <label class="control"><span>Paleta</span><input id="palette-range" type="range" min="0" max="12" value="0" step="0.1" /></label>
          <label class="control"><span>Exposición</span><input id="exposure-range" type="range" min="0.55" max="2.2" value="1.22" step="0.01" /></label>
        </div>
        <nav class="actions" aria-label="Acciones"><button id="reset-button">Recentrar</button><button id="immersive-button">Entrar</button><button id="fullscreen-button">Pantalla completa</button><button id="screenshot-button">Captura PNG</button></nav>
        <section class="compact-help"><p><b>W/S</b> avance o zoom · <b>A/D</b> lateral · <b>Q/E</b> vertical 3D</p><p><b>Ratón</b> orientación · <b>Rueda</b> velocidad · <b>Esc</b> liberar cursor</p></section>
      </aside>
      <header class="hud"><div class="hud-title"><span id="dimension-badge">2D</span><div><strong id="fractal-title">Mandelbrot</strong><small id="fractal-description"></small></div></div><div class="hud-stats"><span id="engine-stat">GPU</span><span id="fps-stat">0 FPS</span><span id="refinement-stat">Vista previa</span></div></header>
      <footer class="telemetry"><span id="coordinates-stat">X 0 · Y 0</span><span id="speed-stat">Velocidad 1.00×</span></footer><div class="crosshair" id="crosshair" aria-hidden="true"></div><div class="toast" id="toast" role="status"></div>`;
    const get = <T extends HTMLElement>(id: string): T => { const element = root.querySelector<T>(`#${id}`); if (!element) throw new Error(`No se encontró el elemento #${id}`); return element; };
    return { root, drawer: get('drawer'), hamburger: get('hamburger'), fractal: get('fractal-select'), quality: get('quality-select'), detail: get('detail-range'), power: get('power-range'), palette: get('palette-range'), exposure: get('exposure-range'), reset: get('reset-button'), immersive: get('immersive-button'), fullscreen: get('fullscreen-button'), screenshot: get('screenshot-button'), title: get('fractal-title'), description: get('fractal-description'), dimension: get('dimension-badge'), fps: get('fps-stat'), engine: get('engine-stat'), coordinates: get('coordinates-stat'), speed: get('speed-stat'), refinement: get('refinement-stat'), toast: get('toast'), crosshair: get('crosshair') };
  }

  private bindEvents(): void {
    this.ui.hamburger.addEventListener('click', () => { this.ui.drawer.classList.toggle('open'); this.ui.hamburger.classList.toggle('open'); });
    this.ui.fractal.addEventListener('change', () => this.setFractal(this.ui.fractal.value));
    this.ui.quality.addEventListener('change', () => { this.qualityMultiplier = Number(this.ui.quality.value); this.markInteraction(); this.resize(true); });
    this.ui.detail.addEventListener('input', () => { this.detail = Number(this.ui.detail.value); this.markInteraction(); });
    this.ui.power.addEventListener('input', () => { this.uniforms.uPower.value = Number(this.ui.power.value); this.markInteraction(); });
    this.ui.palette.addEventListener('input', () => { this.uniforms.uPalette.value = Number(this.ui.palette.value); this.markInteraction(); });
    this.ui.exposure.addEventListener('input', () => { this.uniforms.uExposure.value = Number(this.ui.exposure.value); this.markInteraction(); });
    this.ui.reset.addEventListener('click', () => this.resetCurrent());
    this.ui.immersive.addEventListener('click', () => this.requestImmersive());
    this.ui.fullscreen.addEventListener('click', () => void this.toggleFullscreen());
    this.ui.screenshot.addEventListener('click', () => this.capture());
    document.addEventListener('keydown', (event) => {
      if (['INPUT', 'SELECT', 'BUTTON'].includes((event.target as HTMLElement).tagName)) return;
      const valid = ['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'];
      if (!valid.includes(event.code)) return; event.preventDefault(); this.keys.add(event.code); this.markInteraction();
    });
    document.addEventListener('keyup', (event) => this.keys.delete(event.code));
    this.canvas.addEventListener('pointerdown', (event) => { if (event.button !== 0) return; this.dragging = true; this.dragMoved = false; this.lastPointerX = event.clientX; this.lastPointerY = event.clientY; this.canvas.setPointerCapture(event.pointerId); });
    this.canvas.addEventListener('pointermove', (event) => { if (this.pointerLocked || !this.dragging) return; const dx = event.clientX - this.lastPointerX; const dy = event.clientY - this.lastPointerY; this.lastPointerX = event.clientX; this.lastPointerY = event.clientY; if (Math.abs(dx)+Math.abs(dy)>2) this.dragMoved=true; this.applyMouseMovement(dx,dy); });
    this.canvas.addEventListener('pointerup', (event) => { if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId); this.dragging=false; if (!this.dragMoved) this.requestImmersive(); });
    this.canvas.addEventListener('pointercancel', () => { this.dragging=false; });
    this.canvas.addEventListener('wheel', (event) => { event.preventDefault(); const factor=event.deltaY<0?1.13:1/1.13; this.speed=THREE.MathUtils.clamp(this.speed*factor,.04,80); this.markInteraction(); this.setToast(`Velocidad ${this.speed.toFixed(2)}×`); }, { passive:false });
    document.addEventListener('pointerlockchange', () => { this.pointerLocked=document.pointerLockElement===this.canvas; this.ui.crosshair.classList.toggle('visible',this.pointerLocked); this.ui.immersive.textContent=this.pointerLocked?'Salir':'Entrar'; this.setToast(this.pointerLocked?'Modo inmersivo activo · Esc para salir':'Cursor liberado'); });
    document.addEventListener('mousemove', (event) => { if (this.pointerLocked) this.applyMouseMovement(event.movementX,event.movementY); });
    this.canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); this.showFatal('El navegador ha perdido el contexto gráfico. Recarga la página para reiniciar la GPU.'); });
    window.addEventListener('resize', () => this.resize(true));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.markInteraction(); });
  }

  private setFractal(id: string): void {
    const definition=FRACTAL_BY_ID.get(id); if (!definition) return; this.current=definition; this.ui.fractal.value=id; this.resetCurrent(); this.ui.title.textContent=definition.name; this.ui.description.textContent=definition.description; this.ui.dimension.textContent=definition.dimension; this.ui.dimension.dataset.dimension=definition.dimension; this.ui.power.value=String(definition.power??8); this.uniforms.uPower.value=definition.power??8; this.uniforms.uDimension.value=definition.dimension==='2D'?0:1; this.uniforms.uFractal.value=definition.shaderId; this.setToast(`${definition.name} · entorno ${definition.dimension}`);
  }

  private resetCurrent(): void {
    if (this.current.dimension==='2D') { const [x,y]=this.current.defaultCenter??[0,0]; this.center.set(x,y); this.scale=this.current.defaultScale??3.2; this.baseScale=this.scale; }
    else { const [x,y,z]=this.current.defaultPosition??[0,0,4]; this.cameraPosition.set(x,y,z); this.yaw=this.current.defaultYaw??Math.PI; this.pitch=this.current.defaultPitch??0; }
    this.markInteraction();
  }

  private requestImmersive(): void { if (document.pointerLockElement===this.canvas) { document.exitPointerLock(); return; } void this.canvas.requestPointerLock(); }
  private async toggleFullscreen(): Promise<void> { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); this.markInteraction(); }
  private capture(): void { this.render(true); const link=document.createElement('a'); link.download=`fractales-${this.current.id}-${Date.now()}.png`; link.href=this.canvas.toDataURL('image/png'); link.click(); this.setToast('Captura PNG generada'); }
  private applyMouseMovement(dx:number,dy:number):void { if (this.current.dimension==='3D') { this.yaw-=dx*.0022; this.pitch=THREE.MathUtils.clamp(this.pitch-dy*.0022,-1.48,1.48); } else { const rect=this.canvas.getBoundingClientRect(); const factor=this.scale/Math.max(rect.height,1); this.center.x+=dx*factor; this.center.y-=dy*factor; } this.markInteraction(); }

  private updateMovement(dt:number):boolean {
    let moved=false; const boost=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?4:1;
    if (this.current.dimension==='2D') { const pan=this.scale*this.speed*boost*dt*.58; const zoom=Math.exp(this.speed*boost*dt*.88); if(this.keys.has('KeyA')||this.keys.has('ArrowLeft')){this.center.x-=pan;moved=true} if(this.keys.has('KeyD')||this.keys.has('ArrowRight')){this.center.x+=pan;moved=true} if(this.keys.has('ArrowUp')){this.center.y-=pan;moved=true} if(this.keys.has('ArrowDown')){this.center.y+=pan;moved=true} if(this.keys.has('KeyW')){this.scale/=zoom;moved=true} if(this.keys.has('KeyS')){this.scale*=zoom;moved=true} this.scale=THREE.MathUtils.clamp(this.scale,1e-13,1e8); }
    else { this.updateCameraMatrix(); const distance=this.speed*boost*dt*.72; TEMP_MOVE.set(0,0,0); if(this.keys.has('KeyW')||this.keys.has('ArrowUp'))TEMP_MOVE.add(TEMP_FORWARD); if(this.keys.has('KeyS')||this.keys.has('ArrowDown'))TEMP_MOVE.sub(TEMP_FORWARD); if(this.keys.has('KeyD')||this.keys.has('ArrowRight'))TEMP_MOVE.add(TEMP_RIGHT); if(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))TEMP_MOVE.sub(TEMP_RIGHT); if(this.keys.has('KeyE'))TEMP_MOVE.add(WORLD_UP); if(this.keys.has('KeyQ'))TEMP_MOVE.sub(WORLD_UP); if(TEMP_MOVE.lengthSq()>0){this.cameraPosition.addScaledVector(TEMP_MOVE.normalize(),distance);moved=true} }
    if(moved)this.markInteraction(); return moved;
  }

  private updateCameraMatrix():void { const cosPitch=Math.cos(this.pitch); TEMP_FORWARD.set(Math.sin(this.yaw)*cosPitch,Math.sin(this.pitch),Math.cos(this.yaw)*cosPitch).normalize(); TEMP_RIGHT.copy(TEMP_FORWARD).cross(WORLD_UP).normalize(); TEMP_UP.copy(TEMP_RIGHT).cross(TEMP_FORWARD).normalize(); this.cameraMatrix.set(TEMP_RIGHT.x,TEMP_UP.x,TEMP_FORWARD.x,TEMP_RIGHT.y,TEMP_UP.y,TEMP_FORWARD.y,TEMP_RIGHT.z,TEMP_UP.z,TEMP_FORWARD.z); }

  private readonly animate=(now:number):void=>{ const dt=THREE.MathUtils.clamp((now-this.lastFrame)/1000,0,.05); this.lastFrame=now; const moved=this.updateMovement(dt); const stage=this.calculateRefinementStage(now); if(moved||stage!==this.refinementStage||this.dirty){this.refinementStage=stage;this.render(false)} this.updateFps(now); if(now-this.lastHudUpdate>150){this.updateHud();this.lastHudUpdate=now} requestAnimationFrame(this.animate); };
  private calculateRefinementStage(now:number):number { const idle=now-this.lastInteraction; if(idle<140)return 0; if(idle<620)return 1; return 2; }
  private render(forceMaximum:boolean):void { const stage=forceMaximum?2:Math.max(this.refinementStage,0); this.applyAdaptiveQuality(stage); this.updateCameraMatrix(); const size=this.renderer.getDrawingBufferSize(this.uniforms.uResolution.value); this.uniforms.uResolution.value.set(size.x,size.y); this.uniforms.uTime.value=performance.now()/1000; this.uniforms.uScale.value=this.scale; this.uniforms.uIterations.value=this.iterationsForStage(stage); this.uniforms.uRaySteps.value=this.rayStepsForStage(stage); this.renderer.render(this.scene,this.camera); this.dirty=false; }
  private applyAdaptiveQuality(stage:number):void { const rect=this.canvas.getBoundingClientRect(); const stageScale=[.50,.76,1][stage]??1; let target=window.devicePixelRatio*this.qualityMultiplier*stageScale; const maxPixels=[650000,1450000,3200000][stage]??3200000; const pixelCount=rect.width*rect.height*target*target; if(pixelCount>maxPixels)target*=Math.sqrt(maxPixels/pixelCount); target=THREE.MathUtils.clamp(target,.5,2.5); if(Math.abs(target-this.lastPixelRatio)>.025){this.renderer.setPixelRatio(target);this.renderer.setSize(rect.width,rect.height,false);this.lastPixelRatio=target} }
  private iterationsForStage(stage:number):number { const values=[90+this.detail*.9,190+this.detail*2.6,360+this.detail*7.6]; return Math.min(1200,Math.round(values[stage]??values[2]!)); }
  private rayStepsForStage(stage:number):number { const values=[56+this.detail*.22,92+this.detail*.48,150+this.detail*1.05]; return Math.min(255,Math.round(values[stage]??values[2]!)); }
  private resize(force:boolean):void { const rect=this.canvas.getBoundingClientRect(); if(rect.width<=0||rect.height<=0)return; if(force)this.lastPixelRatio=0; this.applyAdaptiveQuality(Math.max(this.refinementStage,0)); this.dirty=true; }
  private markInteraction():void { this.lastInteraction=performance.now(); this.refinementStage=-1; this.dirty=true; }
  private updateFps(now:number):void { this.fpsFrames+=1; const elapsed=now-this.fpsClock; if(elapsed>=500){this.fps=this.fpsFrames*1000/elapsed;this.fpsFrames=0;this.fpsClock=now} }
  private updateHud():void { const rendererName=this.renderer.capabilities.isWebGL2?'WebGL2 GPU':'WebGL GPU'; const webGpuAvailable='gpu' in navigator?' · WebGPU disponible':''; this.ui.engine.textContent=`${rendererName}${webGpuAvailable}`; this.ui.fps.textContent=`${this.fps.toFixed(0)} FPS`; this.ui.refinement.textContent=['Navegación','Refinando','Máxima definición'][Math.max(this.refinementStage,0)]??'Máxima definición'; this.ui.speed.textContent=`Velocidad ${this.speed.toFixed(2)}×`; if(this.current.dimension==='2D'){const zoom=this.baseScale/this.scale;this.ui.coordinates.textContent=`X ${this.center.x.toPrecision(8)} · Y ${this.center.y.toPrecision(8)} · Zoom ${zoom.toExponential(2)}×`}else{this.ui.coordinates.textContent=`X ${this.cameraPosition.x.toFixed(3)} · Y ${this.cameraPosition.y.toFixed(3)} · Z ${this.cameraPosition.z.toFixed(3)}`} }
  private setToast(message:string):void { this.ui.toast.textContent=message; this.ui.toast.classList.add('visible'); window.clearTimeout(Number(this.ui.toast.dataset.timer??0)); const timer=window.setTimeout(()=>this.ui.toast.classList.remove('visible'),2200); this.ui.toast.dataset.timer=String(timer); }
  private showFatal(message:string):void { this.ui.root.innerHTML=`<section class="fatal"><strong>No se ha podido iniciar el motor gráfico</strong><p>${message}</p></section>`; }
}
