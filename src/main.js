(() => {
  'use strict';

  const canvas = document.getElementById('fractalCanvas');
  const ui = {
    panel: document.querySelector('.panel-main'),
    togglePanel: document.getElementById('togglePanel'),
    fractalType: document.getElementById('fractalType'),
    iterations: document.getElementById('iterations'),
    quality: document.getElementById('quality'),
    resetView: document.getElementById('resetView'),
    randomJulia: document.getElementById('randomJulia'),
    saveImage: document.getElementById('saveImage'),
    speedValue: document.getElementById('speedValue'),
    speedBar: document.getElementById('speedBar'),
    zoomValue: document.getElementById('zoomValue'),
    positionValue: document.getElementById('positionValue'),
    renderValue: document.getElementById('renderValue'),
    toast: document.getElementById('toast')
  };

  const PRESETS = {
    mandelbrot: { id: 0, x: -0.55, y: 0.0, scale: 3.35, iter: 260 },
    julia: { id: 1, x: 0.0, y: 0.0, scale: 3.20, iter: 280 },
    burningShip: { id: 2, x: -0.45, y: -0.52, scale: 3.35, iter: 260 },
    tricorn: { id: 3, x: 0.0, y: 0.0, scale: 3.40, iter: 240 },
    multibrot3: { id: 4, x: 0.0, y: 0.0, scale: 3.00, iter: 220 },
    newton: { id: 5, x: 0.0, y: 0.0, scale: 4.00, iter: 90 },
    barnsley: { id: 6, x: 0.0, y: 5.0, scale: 10.8, iter: 420 },
    sierpinski: { id: 7, x: 0.5, y: 0.5, scale: 1.25, iter: 420 },
    carpet: { id: 8, x: 0.5, y: 0.5, scale: 1.18, iter: 420 },
    koch: { id: 9, x: 0.0, y: 0.0, scale: 3.30, iter: 420 },
    dragon: { id: 10, x: 0.5, y: 0.5, scale: 1.55, iter: 420 },
    hilbert: { id: 11, x: 0.5, y: 0.5, scale: 1.25, iter: 420 }
  };

  const state = {
    type: 'mandelbrot',
    centerX: PRESETS.mandelbrot.x,
    centerY: PRESETS.mandelbrot.y,
    scale: PRESETS.mandelbrot.scale,
    baseScale: PRESETS.mandelbrot.scale,
    speed: 1,
    minSpeed: 0.08,
    maxSpeed: 60,
    juliaX: -0.74543,
    juliaY: 0.11301,
    keys: new Set(),
    dragging: false,
    lastX: 0,
    lastY: 0,
    lastFrame: performance.now(),
    frameCounter: 0,
    fpsClock: performance.now(),
    fps: 0,
    width: 1,
    height: 1,
    dpr: 1
  };

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true
  });

  if (!gl) {
    fail('WebGL2 no está disponible. Activa la aceleración por hardware del navegador.');
    return;
  }

  const vertexSource = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

  const fragmentSource = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_scale;
uniform int u_fractal;
uniform int u_iter;
uniform vec2 u_julia;

vec3 palette(float t, float shift) {
  t = clamp(t, 0.0, 1.0);
  vec3 a = vec3(0.08, 0.09, 0.18);
  vec3 b = vec3(0.58, 0.48, 0.72);
  vec3 c = vec3(1.00, 0.86, 0.62);
  vec3 d = vec3(0.00 + shift, 0.18 + shift * 0.27, 0.35 + shift * 0.19);
  vec3 col = a + b * cos(6.2831853 * (c * t + d));
  col += vec3(0.03, 0.15, 0.23) * pow(t, 0.32);
  return clamp(col, 0.0, 1.0);
}

vec2 worldPos(vec2 uv) {
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  return u_center + p * u_scale;
}

vec3 escapeSet(vec2 c, int kind) {
  vec2 z = vec2(0.0);
  vec2 k = c;
  if (kind == 1) {
    z = c;
    k = u_julia;
  }

  float iter = 0.0;
  float escaped = 0.0;
  for (int i = 0; i < 900; i++) {
    if (i >= u_iter) { break; }
    float x = z.x;
    float y = z.y;
    vec2 nz;
    if (kind == 2) {
      x = abs(x);
      y = abs(y);
      nz = vec2(x * x - y * y, 2.0 * x * y) + k;
    } else if (kind == 3) {
      nz = vec2(x * x - y * y, -2.0 * x * y) + k;
    } else if (kind == 4) {
      nz = vec2(x*x*x - 3.0*x*y*y, 3.0*x*x*y - y*y*y) + k;
    } else {
      nz = vec2(x * x - y * y, 2.0 * x * y) + k;
    }
    z = nz;
    if (dot(z, z) > 16.0) {
      iter = float(i);
      escaped = 1.0;
      break;
    }
  }

  if (escaped < 0.5) {
    return vec3(0.004, 0.008, 0.022);
  }

  float radius = max(length(z), 1.000001);
  float smoothIter = iter + 1.0 - log(max(log(radius), 0.000001)) / log(2.0);
  float t = smoothIter / max(float(u_iter), 1.0);
  return palette(t, float(kind) * 0.085);
}

vec3 newton(vec2 z) {
  int root = 0;
  float iter = 0.0;
  for (int i = 0; i < 140; i++) {
    if (i >= u_iter) { break; }
    float x = z.x;
    float y = z.y;
    vec2 f = vec2(x*x*x - 3.0*x*y*y - 1.0, 3.0*x*x*y - y*y*y);
    vec2 df = vec2(3.0*(x*x-y*y), 6.0*x*y);
    float den = dot(df, df);
    if (den < 0.000000000001) { break; }
    z -= vec2(f.x*df.x + f.y*df.y, f.y*df.x - f.x*df.y) / den;
    iter = float(i);
    float d0 = distance(z, vec2(1.0, 0.0));
    float d1 = distance(z, vec2(-0.5, 0.8660254));
    float d2 = distance(z, vec2(-0.5, -0.8660254));
    if (d0 < 0.0001 || d1 < 0.0001 || d2 < 0.0001) {
      if (d1 < d0 && d1 < d2) { root = 1; }
      else if (d2 < d0 && d2 < d1) { root = 2; }
      else { root = 0; }
      break;
    }
  }
  vec3 base = vec3(1.0, 0.78, 0.24);
  if (root == 1) { base = vec3(0.18, 0.78, 1.0); }
  if (root == 2) { base = vec3(1.0, 0.28, 0.74); }
  float shade = 0.18 + 0.82 * pow(clamp(1.0 - iter / max(float(u_iter), 1.0), 0.0, 1.0), 0.55);
  return base * shade;
}

vec3 carpet(vec2 p) {
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) {
    return vec3(0.004, 0.008, 0.022);
  }
  vec2 q = p;
  float show = 1.0;
  float levels = clamp(float(u_iter) / 80.0, 3.0, 8.0);
  for (int i = 0; i < 9; i++) {
    if (float(i) >= levels) { break; }
    q *= 3.0;
    vec2 cell = floor(q);
    if (cell.x == 1.0 && cell.y == 1.0) {
      show = 0.0;
      break;
    }
    q = fract(q);
  }
  return mix(vec3(0.004, 0.008, 0.022), vec3(0.45, 0.9, 1.0), show);
}

vec3 sierpinski(vec2 p) {
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 0.92) {
    return vec3(0.004, 0.008, 0.022);
  }
  vec2 q = p;
  float show = 1.0;
  for (int i = 0; i < 9; i++) {
    q *= 2.0;
    vec2 cell = floor(q);
    if (cell.x == 1.0 && cell.y == 1.0) { show = 0.0; break; }
    q = fract(q);
  }
  float tri = step(abs(p.x - 0.5) * 1.8, 0.92 - p.y);
  return mix(vec3(0.004, 0.008, 0.022), vec3(0.55, 0.92, 1.0), show * tri);
}

vec3 procedural(vec2 p, float variant) {
  float a = 0.0;
  vec2 q = p;
  for (int i = 0; i < 8; i++) {
    q = abs(q) / max(dot(q, q), 0.25) - vec2(0.72 + 0.05 * variant, 0.38);
    a += exp(-18.0 * abs(length(q) - 0.72));
  }
  float t = clamp(a * 0.18, 0.0, 1.0);
  return mix(vec3(0.004, 0.008, 0.022), palette(t, variant * 0.11), t);
}

void main() {
  vec2 c = worldPos(v_uv);
  vec3 color;
  if (u_fractal == 5) {
    color = newton(c);
  } else if (u_fractal == 7) {
    color = sierpinski(c);
  } else if (u_fractal == 8) {
    color = carpet(c);
  } else if (u_fractal > 8 || u_fractal == 6) {
    color = procedural(c, float(u_fractal));
  } else {
    color = escapeSet(c, u_fractal);
  }
  float vignette = smoothstep(0.98, 0.18, distance(v_uv, vec2(0.5)));
  color *= 0.86 + 0.14 * vignette;
  outColor = vec4(color, 1.0);
}`;

  let program;
  let positionBuffer;
  let locations;

  try {
    program = createProgram(vertexSource, fragmentSource);
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    locations = {
      position: gl.getAttribLocation(program, 'a_position'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      center: gl.getUniformLocation(program, 'u_center'),
      scale: gl.getUniformLocation(program, 'u_scale'),
      fractal: gl.getUniformLocation(program, 'u_fractal'),
      iter: gl.getUniformLocation(program, 'u_iter'),
      julia: gl.getUniformLocation(program, 'u_julia')
    };
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return;
  }

  bindEvents();
  resetView('mandelbrot');
  showToast('Motor WebGL2 cargado');
  requestAnimationFrame(frame);

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Error desconocido compilando shader.';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function createProgram(vsSource, fsSource) {
    const vertex = createShader(gl.VERTEX_SHADER, vsSource);
    const fragment = createShader(gl.FRAGMENT_SHADER, fsSource);
    const webglProgram = gl.createProgram();
    gl.attachShader(webglProgram, vertex);
    gl.attachShader(webglProgram, fragment);
    gl.linkProgram(webglProgram);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(webglProgram, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(webglProgram) || 'Error desconocido enlazando programa WebGL.';
      gl.deleteProgram(webglProgram);
      throw new Error(message);
    }
    return webglProgram;
  }

  function resizeCanvas() {
    const quality = Number(ui.quality.value) || 1;
    const dpr = clamp((window.devicePixelRatio || 1) * quality, 1, 3);
    state.dpr = dpr;
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    state.width = w;
    state.height = h;
    gl.viewport(0, 0, w, h);
  }

  function frame(now) {
    const dt = clamp((now - state.lastFrame) / 1000, 0, 0.04);
    state.lastFrame = now;
    updateMovement(dt);
    render();
    requestAnimationFrame(frame);
  }

  function updateMovement(dt) {
    const pan = state.scale * state.speed * dt * 0.68;
    const zoom = Math.exp(state.speed * dt * 0.92);
    if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) state.centerX -= pan;
    if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) state.centerX += pan;
    if (state.keys.has('ArrowUp')) state.centerY -= pan;
    if (state.keys.has('ArrowDown')) state.centerY += pan;
    if (state.keys.has('KeyW')) state.scale /= zoom;
    if (state.keys.has('KeyS')) state.scale *= zoom;
    state.scale = clamp(state.scale, 1e-14, 1e8);
  }

  function render() {
    const start = performance.now();
    resizeCanvas();
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(locations.resolution, state.width, state.height);
    gl.uniform2f(locations.center, state.centerX, state.centerY);
    gl.uniform1f(locations.scale, state.scale);
    gl.uniform1i(locations.fractal, PRESETS[state.type].id);
    gl.uniform1i(locations.iter, Math.floor(Number(ui.iterations.value)));
    gl.uniform2f(locations.julia, state.juliaX, state.juliaY);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    updateReadout(performance.now() - start);
  }

  function resetView(type = state.type) {
    const preset = PRESETS[type];
    state.type = type;
    state.centerX = preset.x;
    state.centerY = preset.y;
    state.scale = preset.scale;
    state.baseScale = preset.scale;
    ui.iterations.value = String(preset.iter);
    updateReadout(0);
  }

  function updateReadout(ms) {
    const zoom = state.baseScale / state.scale;
    const t = Math.log(state.speed / state.minSpeed) / Math.log(state.maxSpeed / state.minSpeed);
    ui.speedValue.textContent = `${state.speed.toFixed(2)}×`;
    ui.speedBar.style.width = `${clamp(t, 0, 1) * 100}%`;
    ui.zoomValue.textContent = `Zoom: ${zoom.toFixed(2)}×`;
    ui.positionValue.textContent = `X: ${state.centerX.toFixed(6)} · Y: ${state.centerY.toFixed(6)}`;
    updateFps();
    ui.renderValue.textContent = `GPU WebGL2 · ${ms.toFixed(1)} ms · ${state.fps.toFixed(0)} FPS`;
  }

  function updateFps() {
    state.frameCounter += 1;
    const now = performance.now();
    const elapsed = now - state.fpsClock;
    if (elapsed > 500) {
      state.fps = state.frameCounter * 1000 / elapsed;
      state.frameCounter = 0;
      state.fpsClock = now;
    }
  }

  function bindEvents() {
    window.addEventListener('resize', resizeCanvas);

    ui.fractalType.addEventListener('change', () => {
      resetView(ui.fractalType.value);
      showToast(`Fractal activo: ${ui.fractalType.options[ui.fractalType.selectedIndex].text}`);
    });

    ui.iterations.addEventListener('input', () => render());
    ui.quality.addEventListener('change', () => {
      resizeCanvas();
      showToast(`Calidad: ${ui.quality.options[ui.quality.selectedIndex].text}`);
    });

    ui.resetView.addEventListener('click', () => {
      resetView();
      showToast('Vista recentrada');
    });

    ui.randomJulia.addEventListener('click', () => {
      state.juliaX = Number((-0.95 + Math.random() * 1.9).toFixed(5));
      state.juliaY = Number((-0.95 + Math.random() * 1.9).toFixed(5));
      ui.fractalType.value = 'julia';
      resetView('julia');
      showToast(`Julia c = ${state.juliaX}, ${state.juliaY}`);
    });

    ui.saveImage.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `fractales-${state.type}-webgl.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });

    ui.togglePanel.addEventListener('click', () => ui.panel.classList.toggle('is-collapsed'));

    canvas.addEventListener('pointerdown', (event) => {
      state.dragging = true;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      canvas.classList.add('dragging');
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!state.dragging) return;
      const dx = event.clientX - state.lastX;
      const dy = event.clientY - state.lastY;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.centerX -= dx / Math.max(canvas.clientWidth, 1) * state.scale * (state.width / state.height);
      state.centerY -= dy / Math.max(canvas.clientHeight, 1) * state.scale;
    });

    canvas.addEventListener('pointerup', (event) => {
      state.dragging = false;
      canvas.classList.remove('dragging');
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointercancel', () => {
      state.dragging = false;
      canvas.classList.remove('dragging');
    });

    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
      state.speed = clamp(state.speed * factor, state.minSpeed, state.maxSpeed);
      showToast(`Velocidad ${state.speed.toFixed(2)}×`);
    }, { passive: false });

    window.addEventListener('keydown', (event) => {
      const valid = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!valid.includes(event.code)) return;
      event.preventDefault();
      state.keys.add(event.code);
    });

    window.addEventListener('keyup', (event) => state.keys.delete(event.code));
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => ui.toast.classList.remove('is-visible'), 2200);
  }

  function fail(message) {
    document.body.classList.add('webgl-error');
    ui.renderValue.textContent = `Error WebGL · ${message}`;
    const box = document.createElement('pre');
    box.textContent = message;
    box.style.position = 'fixed';
    box.style.left = '18px';
    box.style.bottom = '18px';
    box.style.zIndex = '30';
    box.style.maxWidth = 'min(760px, calc(100vw - 36px))';
    box.style.maxHeight = '38vh';
    box.style.overflow = 'auto';
    box.style.padding = '14px';
    box.style.borderRadius = '14px';
    box.style.background = 'rgba(6,10,22,.94)';
    box.style.color = '#fff';
    box.style.border = '1px solid rgba(255,255,255,.22)';
    document.body.appendChild(box);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
