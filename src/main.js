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

  const FRACTALS = {
    mandelbrot: { id: 0, mode: 'shader', centerX: -0.55, centerY: 0, scale: 3.35, iterations: 260 },
    julia: { id: 1, mode: 'shader', centerX: 0, centerY: 0, scale: 3.2, iterations: 280 },
    burningShip: { id: 2, mode: 'shader', centerX: -0.45, centerY: -0.52, scale: 3.35, iterations: 260 },
    tricorn: { id: 3, mode: 'shader', centerX: 0, centerY: 0, scale: 3.4, iterations: 240 },
    multibrot3: { id: 4, mode: 'shader', centerX: 0, centerY: 0, scale: 3.0, iterations: 220 },
    newton: { id: 5, mode: 'shader', centerX: 0, centerY: 0, scale: 4.0, iterations: 80 },
    barnsley: { id: 6, mode: 'points', centerX: 0, centerY: 4.8, scale: 10.8, iterations: 520 },
    sierpinski: { id: 7, mode: 'points', centerX: 0.5, centerY: 0.47, scale: 1.12, iterations: 520 },
    carpet: { id: 8, mode: 'shader', centerX: 0.5, centerY: 0.5, scale: 1.15, iterations: 420 },
    koch: { id: 9, mode: 'lines', centerX: 0, centerY: 0.05, scale: 3.2, iterations: 520 },
    dragon: { id: 10, mode: 'lines', centerX: 0.5, centerY: 0.45, scale: 1.3, iterations: 560 },
    hilbert: { id: 11, mode: 'lines', centerX: 0.5, centerY: 0.5, scale: 1.15, iterations: 560 }
  };

  const state = {
    type: 'mandelbrot',
    centerX: FRACTALS.mandelbrot.centerX,
    centerY: FRACTALS.mandelbrot.centerY,
    scale: FRACTALS.mandelbrot.scale,
    baseScale: FRACTALS.mandelbrot.scale,
    speed: 1,
    minSpeed: 0.08,
    maxSpeed: 60,
    juliaCx: -0.74543,
    juliaCy: 0.11301,
    keys: new Set(),
    dragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    width: 1,
    height: 1,
    dpr: 1,
    lastFrame: performance.now(),
    frameCount: 0,
    fpsClock: performance.now(),
    fps: 0,
    needsGeometry: true,
    activeBufferKey: '',
    vertexCount: 0,
    drawMode: null,
    statusTimer: 0
  };

  const gl = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true
  });

  if (!gl) {
    document.body.classList.add('webgl-error');
    showToast('WebGL2 no está disponible en este navegador o está desactivado.');
    return;
  }

  const vertexShaderSource = `#version 300 es
    precision highp float;
    in vec2 a_position;
    out vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    out vec4 outColor;

    uniform vec2 u_resolution;
    uniform vec2 u_center;
    uniform float u_scale;
    uniform int u_fractal;
    uniform int u_iterations;
    uniform vec2 u_julia;
    uniform float u_time;

    vec3 palette(float t, float variant) {
      t = clamp(t, 0.0, 1.0);
      vec3 a = vec3(0.08, 0.10, 0.20);
      vec3 b = vec3(0.70, 0.54, 0.92);
      vec3 c = vec3(0.78, 0.94, 0.99);
      vec3 d = vec3(0.06 + variant, 0.22, 0.38 + variant * 0.35);
      vec3 col = a + b * cos(6.28318 * (c * t + d));
      col += vec3(0.13, 0.19, 0.23) * pow(t, 0.35);
      return clamp(col, 0.0, 1.0);
    }

    vec2 pixelToWorld(vec2 uv) {
      vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
      return u_center + p * u_scale;
    }

    vec3 escapeColor(vec2 c, int kind) {
      vec2 z = vec2(0.0);
      vec2 k = c;
      if (kind == 1) {
        z = c;
        k = u_julia;
      }

      float escaped = 0.0;
      float iter = 0.0;
      for (int i = 0; i < 1200; i++) {
        if (i >= u_iterations) break;
        float x = z.x;
        float y = z.y;
        if (kind == 2) {
          x = abs(x);
          y = abs(y);
          z = vec2(x * x - y * y, 2.0 * x * y) + k;
        } else if (kind == 3) {
          z = vec2(x * x - y * y, -2.0 * x * y) + k;
        } else if (kind == 4) {
          z = vec2(x * x * x - 3.0 * x * y * y, 3.0 * x * x * y - y * y * y) + k;
        } else {
          z = vec2(x * x - y * y, 2.0 * x * y) + k;
        }
        if (dot(z, z) > 16.0) {
          escaped = 1.0;
          iter = float(i);
          break;
        }
      }

      if (escaped < 0.5) {
        return vec3(0.006, 0.010, 0.024);
      }

      float logZn = log(max(dot(z, z), 1.000001)) * 0.5;
      float smooth = iter + 1.0 - log(max(logZn, 0.000001)) / log(2.0);
      float t = smooth / float(max(u_iterations, 1));
      return palette(t, float(kind) * 0.08);
    }

    vec3 newtonColor(vec2 z) {
      vec2 roots[3];
      roots[0] = vec2(1.0, 0.0);
      roots[1] = vec2(-0.5, 0.8660254038);
      roots[2] = vec2(-0.5, -0.8660254038);
      vec3 rootColors[3];
      rootColors[0] = vec3(1.0, 0.78, 0.24);
      rootColors[1] = vec3(0.18, 0.78, 1.0);
      rootColors[2] = vec3(1.0, 0.28, 0.74);

      int rootIndex = 0;
      float iter = 0.0;
      for (int i = 0; i < 160; i++) {
        if (i >= u_iterations) break;
        float x = z.x;
        float y = z.y;
        vec2 f = vec2(x*x*x - 3.0*x*y*y - 1.0, 3.0*x*x*y - y*y*y);
        vec2 df = vec2(3.0*(x*x - y*y), 6.0*x*y);
        float denom = dot(df, df);
        if (denom < 0.000000000001) break;
        vec2 q = vec2(f.x*df.x + f.y*df.y, f.y*df.x - f.x*df.y) / denom;
        z -= q;
        iter = float(i);
        for (int r = 0; r < 3; r++) {
          if (distance(z, roots[r]) < 0.0001) {
            rootIndex = r;
            i = 9999;
            break;
          }
        }
      }
      float shade = 1.0 - iter / float(max(u_iterations, 1));
      shade = 0.18 + pow(clamp(shade, 0.0, 1.0), 0.55) * 0.82;
      return rootColors[rootIndex] * shade;
    }

    vec3 carpetColor(vec2 p) {
      vec2 q = p;
      float inside = 1.0;
      float level = clamp(float(u_iterations) / 80.0, 3.0, 8.0);
      if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) {
        inside = 0.0;
      }
      for (int i = 0; i < 9; i++) {
        if (float(i) >= level) break;
        q *= 3.0;
        vec2 cell = floor(q);
        if (cell.x == 1.0 && cell.y == 1.0) inside = 0.0;
        q = fract(q);
      }
      vec3 back = vec3(0.01, 0.015, 0.035);
      vec3 front = vec3(0.58, 0.90, 1.00);
      float grid = smoothstep(0.0, 0.015, min(min(p.x, p.y), min(1.0 - p.x, 1.0 - p.y)));
      return mix(back, front, inside * grid);
    }

    void main() {
      vec2 c = pixelToWorld(v_uv);
      vec3 color;

      if (u_fractal == 5) {
        color = newtonColor(c);
      } else if (u_fractal == 8) {
        color = carpetColor(c);
      } else {
        color = escapeColor(c, u_fractal);
      }

      float vignette = smoothstep(0.95, 0.25, distance(v_uv, vec2(0.5)));
      color *= 0.84 + 0.16 * vignette;
      outColor = vec4(color, 1.0);
    }
  `;

  const primitiveVertexSource = `#version 300 es
    precision highp float;
    in vec2 a_world;
    uniform vec2 u_resolution;
    uniform vec2 u_center;
    uniform float u_scale;
    uniform float u_pointSize;
    void main() {
      vec2 p = (a_world - u_center) / u_scale;
      vec2 clip = vec2(p.x / (u_resolution.x / u_resolution.y), p.y) * 2.0;
      gl_Position = vec4(clip, 0.0, 1.0);
      gl_PointSize = u_pointSize;
    }
  `;

  const primitiveFragmentSource = `#version 300 es
    precision highp float;
    uniform vec4 u_color;
    uniform int u_softPoints;
    out vec4 outColor;
    void main() {
      if (u_softPoints == 1) {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = dot(p, p);
        if (d > 1.0) discard;
        float a = smoothstep(1.0, 0.05, d);
        outColor = vec4(u_color.rgb, u_color.a * a);
      } else {
        outColor = u_color;
      }
    }
  `;

  const programs = {
    shader: createProgram(vertexShaderSource, fragmentShaderSource),
    primitive: createProgram(primitiveVertexSource, primitiveFragmentSource)
  };

  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const geometryBuffer = gl.createBuffer();

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || 'Error compilando shader WebGL.');
    }
    return shader;
  }

  function createProgram(vsSource, fsSource) {
    const vertex = createShader(gl.VERTEX_SHADER, vsSource);
    const fragment = createShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(message || 'Error enlazando programa WebGL.');
    }
    return program;
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => ui.toast.classList.remove('is-visible'), 2200);
  }

  function resizeCanvas() {
    const qualityFactor = Number(ui.quality.value) || 1;
    state.dpr = clamp((window.devicePixelRatio || 1) * qualityFactor, 1, 3);
    state.width = Math.max(1, Math.floor(canvas.clientWidth * state.dpr));
    state.height = Math.max(1, Math.floor(canvas.clientHeight * state.dpr));
    canvas.width = state.width;
    canvas.height = state.height;
    gl.viewport(0, 0, state.width, state.height);
  }

  function resetView(type = state.type) {
    const preset = FRACTALS[type];
    state.type = type;
    state.centerX = preset.centerX;
    state.centerY = preset.centerY;
    state.scale = preset.scale;
    state.baseScale = preset.scale;
    ui.iterations.value = String(clamp(preset.iterations, Number(ui.iterations.min), Number(ui.iterations.max)));
    state.needsGeometry = true;
    updateReadout();
  }

  function detailLevel() {
    const min = Number(ui.iterations.min);
    const max = Number(ui.iterations.max);
    return clamp((Number(ui.iterations.value) - min) / (max - min), 0, 1);
  }

  function buildGeometry() {
    const key = `${state.type}:${ui.iterations.value}`;
    if (state.activeBufferKey === key && !state.needsGeometry) return;
    state.needsGeometry = false;
    state.activeBufferKey = key;

    let vertices = [];
    if (state.type === 'barnsley') {
      vertices = generateBarnsley(Math.floor(90000 + detailLevel() * 360000));
      state.drawMode = gl.POINTS;
    } else if (state.type === 'sierpinski') {
      vertices = generateSierpinski(Math.floor(80000 + detailLevel() * 320000));
      state.drawMode = gl.POINTS;
    } else if (state.type === 'koch') {
      vertices = generateKoch(clamp(Math.floor(Number(ui.iterations.value) / 115), 2, 6));
      state.drawMode = gl.LINE_STRIP;
    } else if (state.type === 'dragon') {
      vertices = generateDragon(clamp(Math.floor(Number(ui.iterations.value) / 42), 9, 17));
      state.drawMode = gl.LINE_STRIP;
    } else if (state.type === 'hilbert') {
      vertices = generateHilbert(clamp(Math.floor(Number(ui.iterations.value) / 105), 3, 7));
      state.drawMode = gl.LINE_STRIP;
    } else {
      state.vertexCount = 0;
      return;
    }

    const array = new Float32Array(vertices);
    state.vertexCount = array.length / 2;
    gl.bindBuffer(gl.ARRAY_BUFFER, geometryBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
  }

  function generateBarnsley(count) {
    const data = new Float32Array(count * 2);
    let x = 0;
    let y = 0;
    for (let i = 0; i < count; i += 1) {
      const r = Math.random();
      let nx;
      let ny;
      if (r < 0.01) {
        nx = 0;
        ny = 0.16 * y;
      } else if (r < 0.86) {
        nx = 0.85 * x + 0.04 * y;
        ny = -0.04 * x + 0.85 * y + 1.6;
      } else if (r < 0.93) {
        nx = 0.2 * x - 0.26 * y;
        ny = 0.23 * x + 0.22 * y + 1.6;
      } else {
        nx = -0.15 * x + 0.28 * y;
        ny = 0.26 * x + 0.24 * y + 0.44;
      }
      x = nx;
      y = ny;
      data[i * 2] = x;
      data[i * 2 + 1] = 10 - y;
    }
    return data;
  }

  function generateSierpinski(count) {
    const data = new Float32Array(count * 2);
    const vertices = [[0.5, 0.02], [0.05, 0.92], [0.95, 0.92]];
    let x = 0.31;
    let y = 0.37;
    for (let i = 0; i < count; i += 1) {
      const v = vertices[Math.floor(Math.random() * 3)];
      x = (x + v[0]) * 0.5;
      y = (y + v[1]) * 0.5;
      data[i * 2] = x;
      data[i * 2 + 1] = y;
    }
    return data;
  }

  function generateKoch(depth) {
    const radius = 1.08;
    const triangle = [];
    for (let i = 0; i < 3; i += 1) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 3;
      triangle.push([Math.cos(a) * radius, Math.sin(a) * radius]);
    }
    let points = [triangle[0], triangle[1], triangle[2], triangle[0]];
    for (let d = 0; d < depth; d += 1) {
      const next = [];
      for (let i = 0; i < points.length - 1; i += 1) {
        const a = points[i];
        const b = points[i + 1];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const p1 = [a[0] + dx / 3, a[1] + dy / 3];
        const p3 = [a[0] + dx * 2 / 3, a[1] + dy * 2 / 3];
        const rx = Math.cos(Math.PI / 3) * (p3[0] - p1[0]) - Math.sin(Math.PI / 3) * (p3[1] - p1[1]);
        const ry = Math.sin(Math.PI / 3) * (p3[0] - p1[0]) + Math.cos(Math.PI / 3) * (p3[1] - p1[1]);
        next.push(a, p1, [p1[0] + rx, p1[1] + ry], p3);
      }
      next.push(points[points.length - 1]);
      points = next;
    }
    return flatten(points);
  }

  function generateDragon(order) {
    let points = [[0, 0], [1, 0]];
    for (let n = 0; n < order; n += 1) {
      const pivot = points[points.length - 1];
      for (let i = points.length - 2; i >= 0; i -= 1) {
        const dx = points[i][0] - pivot[0];
        const dy = points[i][1] - pivot[1];
        points.push([pivot[0] - dy, pivot[1] + dx]);
      }
    }
    return flatten(normalise(points, 0.08, 0.92, 0.08, 0.92));
  }

  function generateHilbert(order) {
    const n = 1 << order;
    const points = [];
    for (let i = 0; i < n * n; i += 1) {
      const xy = hilbertIndexToXY(order, i);
      points.push([xy[0] / (n - 1), xy[1] / (n - 1)]);
    }
    return flatten(points);
  }

  function hilbertIndexToXY(order, index) {
    let x = 0;
    let y = 0;
    for (let s = 1, t = index; s < (1 << order); s <<= 1) {
      const rx = 1 & (t >> 1);
      const ry = 1 & (t ^ rx);
      if (ry === 0) {
        if (rx === 1) {
          x = s - 1 - x;
          y = s - 1 - y;
        }
        const tmp = x;
        x = y;
        y = tmp;
      }
      x += s * rx;
      y += s * ry;
      t >>= 2;
    }
    return [x, y];
  }

  function normalise(points, tx0, tx1, ty0, ty1) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
    const sx = maxX - minX || 1;
    const sy = maxY - minY || 1;
    return points.map((p) => [tx0 + (p[0] - minX) / sx * (tx1 - tx0), ty0 + (p[1] - minY) / sy * (ty1 - ty0)]);
  }

  function flatten(points) {
    const out = new Float32Array(points.length * 2);
    for (let i = 0; i < points.length; i += 1) {
      out[i * 2] = points[i][0];
      out[i * 2 + 1] = points[i][1];
    }
    return out;
  }

  function renderBackground() {
    gl.clearColor(0.004, 0.006, 0.018, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  function renderShaderFractal() {
    const program = programs.shader;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), state.width, state.height);
    gl.uniform2f(gl.getUniformLocation(program, 'u_center'), state.centerX, state.centerY);
    gl.uniform1f(gl.getUniformLocation(program, 'u_scale'), state.scale);
    gl.uniform1i(gl.getUniformLocation(program, 'u_fractal'), FRACTALS[state.type].id);
    gl.uniform1i(gl.getUniformLocation(program, 'u_iterations'), Math.floor(Number(ui.iterations.value)));
    gl.uniform2f(gl.getUniformLocation(program, 'u_julia'), state.juliaCx, state.juliaCy);
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), performance.now() / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function renderPrimitiveFractal() {
    buildGeometry();
    renderBackground();

    const program = programs.primitive;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, geometryBuffer);
    const worldLoc = gl.getAttribLocation(program, 'a_world');
    gl.enableVertexAttribArray(worldLoc);
    gl.vertexAttribPointer(worldLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), state.width, state.height);
    gl.uniform2f(gl.getUniformLocation(program, 'u_center'), state.centerX, state.centerY);
    gl.uniform1f(gl.getUniformLocation(program, 'u_scale'), state.scale);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (state.drawMode === gl.POINTS) {
      gl.uniform1f(gl.getUniformLocation(program, 'u_pointSize'), Math.max(1.1, state.dpr * 1.15));
      gl.uniform4f(gl.getUniformLocation(program, 'u_color'), 0.55, 0.92, 1.0, 0.52);
      gl.uniform1i(gl.getUniformLocation(program, 'u_softPoints'), 1);
    } else {
      gl.uniform1f(gl.getUniformLocation(program, 'u_pointSize'), 1);
      gl.uniform4f(gl.getUniformLocation(program, 'u_color'), 0.72, 0.93, 1.0, 0.96);
      gl.uniform1i(gl.getUniformLocation(program, 'u_softPoints'), 0);
    }

    gl.drawArrays(state.drawMode, 0, state.vertexCount);
    gl.disable(gl.BLEND);
  }

  function render() {
    const start = performance.now();
    resizeCanvas();
    const preset = FRACTALS[state.type];
    if (preset.mode === 'shader') renderShaderFractal();
    else renderPrimitiveFractal();

    const elapsed = performance.now() - start;
    updateFps();
    ui.renderValue.textContent = `GPU WebGL2 · ${elapsed.toFixed(1)} ms · ${state.fps.toFixed(0)} FPS`;
  }

  function updateFps() {
    state.frameCount += 1;
    const now = performance.now();
    const elapsed = now - state.fpsClock;
    if (elapsed >= 500) {
      state.fps = state.frameCount * 1000 / elapsed;
      state.frameCount = 0;
      state.fpsClock = now;
    }
  }

  function updateReadout() {
    const zoom = state.baseScale / state.scale;
    const t = Math.log(state.speed / state.minSpeed) / Math.log(state.maxSpeed / state.minSpeed);
    ui.speedValue.textContent = `${state.speed.toFixed(2)}×`;
    ui.speedBar.style.width = `${clamp(t, 0, 1) * 100}%`;
    ui.zoomValue.textContent = `Zoom: ${zoom.toFixed(2)}×`;
    ui.positionValue.textContent = `X: ${state.centerX.toFixed(6)} · Y: ${state.centerY.toFixed(6)}`;
  }

  function adjustSpeed(direction) {
    const factor = direction > 0 ? 1.15 : 1 / 1.15;
    state.speed = clamp(state.speed * factor, state.minSpeed, state.maxSpeed);
    updateReadout();
    clearTimeout(state.statusTimer);
    state.statusTimer = setTimeout(() => showToast(`Velocidad ${state.speed.toFixed(2)}×`), 10);
  }

  function animationFrame(now) {
    const dt = clamp((now - state.lastFrame) / 1000, 0, 0.04);
    state.lastFrame = now;

    const pan = state.scale * state.speed * dt * 0.68;
    const zoom = Math.exp(state.speed * dt * 0.92);

    if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) state.centerX -= pan;
    if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) state.centerX += pan;
    if (state.keys.has('ArrowUp')) state.centerY -= pan;
    if (state.keys.has('ArrowDown')) state.centerY += pan;
    if (state.keys.has('KeyW')) state.scale /= zoom;
    if (state.keys.has('KeyS')) state.scale *= zoom;

    state.scale = clamp(state.scale, 1e-14, 1e8);
    updateReadout();
    render();
    requestAnimationFrame(animationFrame);
  }

  function bindEvents() {
    window.addEventListener('resize', resizeCanvas);

    ui.fractalType.addEventListener('change', () => {
      resetView(ui.fractalType.value);
      showToast(`Fractal activo: ${ui.fractalType.options[ui.fractalType.selectedIndex].text}`);
    });

    ui.iterations.addEventListener('input', () => {
      state.needsGeometry = true;
    });

    ui.quality.addEventListener('change', () => {
      resizeCanvas();
      showToast(`Calidad: ${ui.quality.options[ui.quality.selectedIndex].text}`);
    });

    ui.resetView.addEventListener('click', () => {
      resetView();
      showToast('Vista recentrada');
    });

    ui.randomJulia.addEventListener('click', () => {
      state.juliaCx = Number((-0.95 + Math.random() * 1.9).toFixed(5));
      state.juliaCy = Number((-0.95 + Math.random() * 1.9).toFixed(5));
      ui.fractalType.value = 'julia';
      resetView('julia');
      showToast(`Julia c = ${state.juliaCx}, ${state.juliaCy}`);
    });

    ui.saveImage.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `fractales-${state.type}-webgl.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Imagen PNG generada');
    });

    ui.togglePanel.addEventListener('click', () => {
      ui.panel.classList.toggle('is-collapsed');
    });

    canvas.addEventListener('pointerdown', (event) => {
      state.dragging = true;
      state.lastMouseX = event.clientX;
      state.lastMouseY = event.clientY;
      canvas.classList.add('dragging');
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!state.dragging) return;
      const dx = event.clientX - state.lastMouseX;
      const dy = event.clientY - state.lastMouseY;
      state.lastMouseX = event.clientX;
      state.lastMouseY = event.clientY;
      state.centerX -= dx / canvas.clientWidth * state.scale * (state.width / state.height);
      state.centerY -= dy / canvas.clientHeight * state.scale;
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
      adjustSpeed(event.deltaY < 0 ? 1 : -1);
    }, { passive: false });

    window.addEventListener('keydown', (event) => {
      const codes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!codes.includes(event.code)) return;
      event.preventDefault();
      state.keys.add(event.code);
    });

    window.addEventListener('keyup', (event) => {
      state.keys.delete(event.code);
    });
  }

  function init() {
    gl.disable(gl.DEPTH_TEST);
    bindEvents();
    resizeCanvas();
    resetView('mandelbrot');
    showToast('Motor WebGL2 activado');
    requestAnimationFrame(animationFrame);
  }

  init();
})();
