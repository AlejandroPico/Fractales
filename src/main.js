(() => {
  'use strict';

  const canvas = document.getElementById('fractalCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

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
    mandelbrot: { centerX: -0.55, centerY: 0, scale: 3.35, iter: 240, family: 'escape' },
    julia: { centerX: 0, centerY: 0, scale: 3.2, iter: 260, family: 'escape' },
    burningShip: { centerX: -0.45, centerY: -0.52, scale: 3.35, iter: 240, family: 'escape' },
    tricorn: { centerX: 0, centerY: 0, scale: 3.4, iter: 220, family: 'escape' },
    multibrot3: { centerX: 0, centerY: 0, scale: 3.0, iter: 210, family: 'escape' },
    newton: { centerX: 0, centerY: 0, scale: 4.0, iter: 80, family: 'newton' },
    barnsley: { centerX: 0, centerY: 5.1, scale: 11.0, iter: 600, family: 'points' },
    sierpinski: { centerX: 0.5, centerY: 0.48, scale: 1.2, iter: 600, family: 'points' },
    carpet: { centerX: 0.5, centerY: 0.5, scale: 1.18, iter: 560, family: 'geometry' },
    koch: { centerX: 0, centerY: 0.05, scale: 3.4, iter: 560, family: 'geometry' },
    dragon: { centerX: 0.5, centerY: 0.45, scale: 1.55, iter: 560, family: 'geometry' },
    hilbert: { centerX: 0.5, centerY: 0.5, scale: 1.18, iter: 560, family: 'geometry' }
  };

  const state = {
    type: 'mandelbrot',
    centerX: PRESETS.mandelbrot.centerX,
    centerY: PRESETS.mandelbrot.centerY,
    scale: PRESETS.mandelbrot.scale,
    baseScale: PRESETS.mandelbrot.scale,
    juliaX: -0.74543,
    juliaY: 0.11301,
    speed: 1,
    minSpeed: 0.08,
    maxSpeed: 60,
    dragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
    keys: new Set(),
    width: 1,
    height: 1,
    dpr: 1,
    dirty: true,
    moving: false,
    renderToken: 0,
    lastRenderAt: 0,
    lastFrameAt: performance.now(),
    idleTimer: 0
  };

  bootstrap();

  function bootstrap() {
    if (!canvas || !ctx) {
      showFatal('No se ha podido inicializar el lienzo Canvas 2D.');
      return;
    }

    bindEvents();
    resizeCanvas();
    resetView('mandelbrot');
    drawStartupScreen();
    scheduleRender(false);
    requestAnimationFrame(frame);
    showToast('Motor Canvas 2D estable cargado');
  }

  function bindEvents() {
    window.addEventListener('resize', () => {
      resizeCanvas();
      scheduleRender(false);
    });

    ui.fractalType.addEventListener('change', () => {
      resetView(ui.fractalType.value);
      showToast(`Fractal activo: ${ui.fractalType.options[ui.fractalType.selectedIndex].text}`);
    });

    ui.iterations.addEventListener('input', () => scheduleRender(false));
    ui.quality.addEventListener('change', () => {
      resizeCanvas();
      scheduleRender(false);
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
      link.download = `fractales-${state.type}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Imagen PNG generada');
    });

    ui.togglePanel.addEventListener('click', () => ui.panel.classList.toggle('is-collapsed'));

    canvas.addEventListener('pointerdown', (event) => {
      state.dragging = true;
      state.lastPointerX = event.clientX;
      state.lastPointerY = event.clientY;
      canvas.classList.add('dragging');
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!state.dragging) return;
      const dx = event.clientX - state.lastPointerX;
      const dy = event.clientY - state.lastPointerY;
      state.lastPointerX = event.clientX;
      state.lastPointerY = event.clientY;
      const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
      state.centerX -= dx / Math.max(canvas.clientWidth, 1) * state.scale * aspect;
      state.centerY -= dy / Math.max(canvas.clientHeight, 1) * state.scale;
      scheduleRender(true);
    });

    canvas.addEventListener('pointerup', (event) => {
      state.dragging = false;
      canvas.classList.remove('dragging');
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      scheduleRender(false);
    });

    canvas.addEventListener('pointercancel', () => {
      state.dragging = false;
      canvas.classList.remove('dragging');
      scheduleRender(false);
    });

    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
      state.speed = clamp(state.speed * factor, state.minSpeed, state.maxSpeed);
      updateReadout(0, 'velocidad');
      showToast(`Velocidad ${state.speed.toFixed(2)}×`);
    }, { passive: false });

    window.addEventListener('keydown', (event) => {
      const valid = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!valid.includes(event.code)) return;
      event.preventDefault();
      state.keys.add(event.code);
    });

    window.addEventListener('keyup', (event) => {
      state.keys.delete(event.code);
      scheduleRender(false);
    });
  }

  function frame(now) {
    const dt = clamp((now - state.lastFrameAt) / 1000, 0, 0.05);
    state.lastFrameAt = now;

    const moved = updateKeyboardMovement(dt);
    if (moved) scheduleRender(true);

    requestAnimationFrame(frame);
  }

  function updateKeyboardMovement(dt) {
    let moved = false;
    const pan = state.scale * state.speed * dt * 0.72;
    const zoom = Math.exp(state.speed * dt * 0.92);

    if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) {
      state.centerX -= pan;
      moved = true;
    }
    if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) {
      state.centerX += pan;
      moved = true;
    }
    if (state.keys.has('ArrowUp')) {
      state.centerY -= pan;
      moved = true;
    }
    if (state.keys.has('ArrowDown')) {
      state.centerY += pan;
      moved = true;
    }
    if (state.keys.has('KeyW')) {
      state.scale /= zoom;
      moved = true;
    }
    if (state.keys.has('KeyS')) {
      state.scale *= zoom;
      moved = true;
    }

    state.scale = clamp(state.scale, 1e-13, 1e8);
    return moved;
  }

  function resizeCanvas() {
    const quality = Number(ui.quality.value) || 0.72;
    state.dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const w = Math.max(2, Math.floor(canvas.clientWidth * state.dpr));
    const h = Math.max(2, Math.floor(canvas.clientHeight * state.dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    state.width = w;
    state.height = h;
    state.quality = quality;
  }

  function resetView(type = state.type) {
    const preset = PRESETS[type];
    state.type = type;
    state.centerX = preset.centerX;
    state.centerY = preset.centerY;
    state.scale = preset.scale;
    state.baseScale = preset.scale;
    ui.iterations.value = String(preset.iter);
    scheduleRender(false);
    updateReadout(0, 'reset');
  }

  function scheduleRender(interactive) {
    state.moving = Boolean(interactive);
    state.dirty = true;
    clearTimeout(state.idleTimer);

    const now = performance.now();
    const minDelay = interactive ? 40 : 0;
    if (now - state.lastRenderAt > minDelay) {
      render(interactive);
    }

    if (interactive) {
      state.idleTimer = setTimeout(() => render(false), 180);
    }
  }

  function render(interactive) {
    state.lastRenderAt = performance.now();
    const token = ++state.renderToken;
    const started = performance.now();
    resizeCanvas();

    const preset = PRESETS[state.type];
    drawBackdrop();

    try {
      if (preset.family === 'escape') renderEscapeFractal(interactive, token);
      else if (preset.family === 'newton') renderNewtonFractal(interactive, token);
      else if (preset.family === 'points') renderPointFractal(interactive);
      else renderGeometryFractal(interactive);
    } catch (error) {
      drawFallbackPattern(String(error));
    }

    updateReadout(performance.now() - started, interactive ? 'rápido' : 'final');
  }

  function drawStartupScreen() {
    drawBackdrop();
    ctx.save();
    ctx.fillStyle = 'rgba(235, 248, 255, 0.92)';
    ctx.font = `${Math.max(18, state.width / 58)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Fractales', state.width / 2, state.height / 2 - 10);
    ctx.font = `${Math.max(11, state.width / 110)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(170, 210, 235, 0.88)';
    ctx.fillText('Inicializando motor visual estable…', state.width / 2, state.height / 2 + 24);
    ctx.restore();
  }

  function drawBackdrop() {
    const gradient = ctx.createRadialGradient(state.width * 0.52, state.height * 0.44, 0, state.width * 0.52, state.height * 0.44, Math.max(state.width, state.height) * 0.78);
    gradient.addColorStop(0, '#16224c');
    gradient.addColorStop(0.42, '#071026');
    gradient.addColorStop(1, '#01030a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function getRenderSize(interactive) {
    const quality = Number(ui.quality.value) || 0.72;
    const maxPixels = interactive ? 250000 : quality >= 1 ? 1300000 : quality >= 0.72 ? 820000 : 420000;
    const rawW = Math.max(160, Math.floor(state.width * quality));
    const rawH = Math.max(120, Math.floor(state.height * quality));
    const count = rawW * rawH;
    const limiter = count > maxPixels ? Math.sqrt(maxPixels / count) : 1;
    return {
      width: Math.max(160, Math.floor(rawW * limiter)),
      height: Math.max(120, Math.floor(rawH * limiter))
    };
  }

  function renderEscapeFractal(interactive) {
    const { width, height } = getRenderSize(interactive);
    const image = ctx.createImageData(width, height);
    const data = image.data;
    const maxIter = Math.floor(Number(ui.iterations.value));
    const aspect = width / height;
    let offset = 0;

    for (let py = 0; py < height; py += 1) {
      const cy = state.centerY + (py / height - 0.5) * state.scale;
      for (let px = 0; px < width; px += 1) {
        const cx = state.centerX + (px / width - 0.5) * state.scale * aspect;
        let zx = 0;
        let zy = 0;
        let cr = cx;
        let ci = cy;

        if (state.type === 'julia') {
          zx = cx;
          zy = cy;
          cr = state.juliaX;
          ci = state.juliaY;
        }

        let i = 0;
        for (; i < maxIter; i += 1) {
          let x = zx;
          let y = zy;
          let nx;
          let ny;

          if (state.type === 'burningShip') {
            x = Math.abs(x);
            y = Math.abs(y);
            nx = x * x - y * y + cr;
            ny = 2 * x * y + ci;
          } else if (state.type === 'tricorn') {
            nx = x * x - y * y + cr;
            ny = -2 * x * y + ci;
          } else if (state.type === 'multibrot3') {
            nx = x * x * x - 3 * x * y * y + cr;
            ny = 3 * x * x * y - y * y * y + ci;
          } else {
            nx = x * x - y * y + cr;
            ny = 2 * x * y + ci;
          }

          zx = nx;
          zy = ny;
          if (zx * zx + zy * zy > 16) break;
        }

        const rgb = escapeColour(i, maxIter, zx, zy, state.type);
        data[offset] = rgb[0];
        data[offset + 1] = rgb[1];
        data[offset + 2] = rgb[2];
        data[offset + 3] = 255;
        offset += 4;
      }
    }

    paintImageData(image, width, height);
  }

  function escapeColour(iter, maxIter, zx, zy, variant) {
    if (iter >= maxIter) return [2, 6, 18];
    const radius = Math.max(Math.sqrt(zx * zx + zy * zy), 1.000001);
    const smooth = iter + 1 - Math.log(Math.max(Math.log(radius), 0.000001)) / Math.log(2);
    const t = clamp(smooth / maxIter, 0, 1);
    const phase = variant === 'burningShip' ? 0.13 : variant === 'tricorn' ? 0.34 : variant === 'multibrot3' ? 0.58 : 0.45;
    const r = Math.floor(28 + 218 * Math.pow(t, 0.68));
    const g = Math.floor(34 + 178 * (0.5 + 0.5 * Math.sin(9.2 * t + phase)) * (1 - t * 0.16));
    const b = Math.floor(58 + 190 * (1 - Math.pow(t, 1.55)));
    return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
  }

  function renderNewtonFractal(interactive) {
    const { width, height } = getRenderSize(interactive);
    const image = ctx.createImageData(width, height);
    const data = image.data;
    const maxIter = Math.min(Math.floor(Number(ui.iterations.value)), 140);
    const aspect = width / height;
    const roots = [
      { x: 1, y: 0, color: [255, 214, 92] },
      { x: -0.5, y: Math.sqrt(3) / 2, color: [92, 214, 255] },
      { x: -0.5, y: -Math.sqrt(3) / 2, color: [255, 92, 196] }
    ];
    let offset = 0;

    for (let py = 0; py < height; py += 1) {
      let y = state.centerY + (py / height - 0.5) * state.scale;
      for (let px = 0; px < width; px += 1) {
        let x = state.centerX + (px / width - 0.5) * state.scale * aspect;
        let rootIndex = 0;
        let i = 0;

        for (; i < maxIter; i += 1) {
          const x2 = x * x;
          const y2 = y * y;
          const fx = x * x2 - 3 * x * y2 - 1;
          const fy = 3 * x2 * y - y * y2;
          const dfx = 3 * (x2 - y2);
          const dfy = 6 * x * y;
          const denom = dfx * dfx + dfy * dfy;
          if (denom < 1e-12) break;
          const qx = (fx * dfx + fy * dfy) / denom;
          const qy = (fy * dfx - fx * dfy) / denom;
          x -= qx;
          y -= qy;

          for (let r = 0; r < roots.length; r += 1) {
            const dx = x - roots[r].x;
            const dy = y - roots[r].y;
            if (dx * dx + dy * dy < 1e-8) {
              rootIndex = r;
              i = maxIter;
              break;
            }
          }
        }

        const base = roots[rootIndex].color;
        const shade = clamp(0.2 + 0.8 * (1 - i / maxIter), 0.18, 1);
        data[offset] = Math.floor(base[0] * shade);
        data[offset + 1] = Math.floor(base[1] * shade);
        data[offset + 2] = Math.floor(base[2] * shade);
        data[offset + 3] = 255;
        offset += 4;
      }
    }

    paintImageData(image, width, height);
  }

  function paintImageData(image, width, height) {
    const buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;
    const bctx = buffer.getContext('2d', { alpha: false });
    bctx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buffer, 0, 0, state.width, state.height);
  }

  function renderPointFractal(interactive) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(124, 229, 255, 0.42)';
    const count = interactive ? 32000 : Math.floor(70000 + detailLevel() * 180000);

    if (state.type === 'barnsley') drawBarnsley(count);
    else drawSierpinski(count);

    ctx.restore();
  }

  function drawBarnsley(count) {
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
      plotWorldPoint(x, 10 - y, 1);
    }
  }

  function drawSierpinski(count) {
    const vertices = [[0.5, 0.02], [0.05, 0.92], [0.95, 0.92]];
    let x = 0.37;
    let y = 0.41;
    for (let i = 0; i < count; i += 1) {
      const v = vertices[Math.floor(Math.random() * 3)];
      x = (x + v[0]) * 0.5;
      y = (y + v[1]) * 0.5;
      plotWorldPoint(x, y, 1);
    }
  }

  function renderGeometryFractal(interactive) {
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 235, 255, 0.92)';
    ctx.fillStyle = 'rgba(130, 225, 255, 0.86)';
    ctx.lineWidth = Math.max(1, state.dpr * 1.1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (state.type === 'carpet') drawCarpet(interactive ? 4 : clamp(Math.floor(Number(ui.iterations.value) / 120), 3, 6));
    if (state.type === 'koch') drawPolyline(kochPoints(interactive ? 4 : clamp(Math.floor(Number(ui.iterations.value) / 115), 2, 6)));
    if (state.type === 'dragon') drawPolyline(normalisePoints(dragonPoints(interactive ? 12 : clamp(Math.floor(Number(ui.iterations.value) / 45), 9, 16)), 0.08, 0.92, 0.08, 0.92));
    if (state.type === 'hilbert') drawPolyline(hilbertPoints(interactive ? 5 : clamp(Math.floor(Number(ui.iterations.value) / 110), 3, 7)));

    ctx.restore();
  }

  function drawCarpet(depth) {
    function square(x, y, size, level) {
      if (level === 0) {
        const a = worldToScreen(x, y);
        const b = worldToScreen(x + size, y + size);
        ctx.fillRect(a.x, a.y, b.x - a.x + 0.5, b.y - a.y + 0.5);
        return;
      }
      const third = size / 3;
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          if (row === 1 && col === 1) continue;
          square(x + col * third, y + row * third, third, level - 1);
        }
      }
    }
    square(0, 0, 1, depth);
  }

  function kochPoints(depth) {
    const radius = 1.1;
    const triangle = [];
    for (let i = 0; i < 3; i += 1) {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / 3;
      triangle.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
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
    return points;
  }

  function dragonPoints(order) {
    let points = [[0, 0], [1, 0]];
    for (let n = 0; n < order; n += 1) {
      const pivot = points[points.length - 1];
      for (let i = points.length - 2; i >= 0; i -= 1) {
        const dx = points[i][0] - pivot[0];
        const dy = points[i][1] - pivot[1];
        points.push([pivot[0] - dy, pivot[1] + dx]);
      }
    }
    return points;
  }

  function hilbertPoints(order) {
    const n = 1 << order;
    const points = [];
    for (let i = 0; i < n * n; i += 1) {
      const p = hilbertIndexToXY(order, i);
      points.push([p[0] / (n - 1), p[1] / (n - 1)]);
    }
    return points;
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

  function normalisePoints(points, tx0, tx1, ty0, ty1) {
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

  function drawPolyline(points) {
    if (!points.length) return;
    const first = worldToScreen(points[0][0], points[0][1]);
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < points.length; i += 1) {
      const p = worldToScreen(points[i][0], points[i][1]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  function worldToScreen(x, y) {
    const aspect = state.width / Math.max(state.height, 1);
    return {
      x: ((x - state.centerX) / (state.scale * aspect) + 0.5) * state.width,
      y: ((y - state.centerY) / state.scale + 0.5) * state.height
    };
  }

  function plotWorldPoint(x, y, size) {
    const p = worldToScreen(x, y);
    if (p.x < -2 || p.y < -2 || p.x > state.width + 2 || p.y > state.height + 2) return;
    ctx.fillRect(p.x, p.y, size * state.dpr, size * state.dpr);
  }

  function detailLevel() {
    const min = Number(ui.iterations.min);
    const max = Number(ui.iterations.max);
    return clamp((Number(ui.iterations.value) - min) / (max - min), 0, 1);
  }

  function drawFallbackPattern(message) {
    drawBackdrop();
    ctx.save();
    ctx.strokeStyle = 'rgba(130, 225, 255, 0.72)';
    ctx.lineWidth = Math.max(1, state.dpr * 1.1);
    const cx = state.width / 2;
    const cy = state.height / 2;
    for (let i = 0; i < 14; i += 1) {
      ctx.beginPath();
      const r = 20 * state.dpr + i * 18 * state.dpr;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = `${Math.max(12, state.width / 95)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Motor de emergencia activo', cx, cy);
    ctx.fillStyle = 'rgba(190,220,240,.86)';
    ctx.fillText(message.slice(0, 90), cx, cy + 26 * state.dpr);
    ctx.restore();
  }

  function updateReadout(ms, mode) {
    const zoom = state.baseScale / state.scale;
    const t = Math.log(state.speed / state.minSpeed) / Math.log(state.maxSpeed / state.minSpeed);
    ui.speedValue.textContent = `${state.speed.toFixed(2)}×`;
    ui.speedBar.style.width = `${clamp(t, 0, 1) * 100}%`;
    ui.zoomValue.textContent = `Zoom: ${zoom.toFixed(2)}×`;
    ui.positionValue.textContent = `X: ${state.centerX.toFixed(6)} · Y: ${state.centerY.toFixed(6)}`;
    ui.renderValue.textContent = `Canvas 2D · ${ms.toFixed(0)} ms · ${mode}`;
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => ui.toast.classList.remove('is-visible'), 2200);
  }

  function showFatal(message) {
    document.body.classList.add('webgl-error');
    const pre = document.createElement('pre');
    pre.textContent = message;
    pre.style.position = 'fixed';
    pre.style.left = '18px';
    pre.style.bottom = '18px';
    pre.style.zIndex = '40';
    pre.style.color = '#fff';
    pre.style.background = 'rgba(5,8,20,.94)';
    pre.style.border = '1px solid rgba(255,255,255,.22)';
    pre.style.borderRadius = '14px';
    pre.style.padding = '14px';
    document.body.appendChild(pre);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
