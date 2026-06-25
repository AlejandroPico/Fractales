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

  const FRACTAL_PRESETS = {
    mandelbrot: { centerX: -0.55, centerY: 0, scale: 3.35, iterations: 180, family: 'escape' },
    julia: { centerX: 0, centerY: 0, scale: 3.2, iterations: 220, family: 'escape' },
    burningShip: { centerX: -0.45, centerY: -0.52, scale: 3.35, iterations: 190, family: 'escape' },
    tricorn: { centerX: 0, centerY: 0, scale: 3.4, iterations: 180, family: 'escape' },
    multibrot3: { centerX: 0, centerY: 0, scale: 3.0, iterations: 170, family: 'escape' },
    newton: { centerX: 0, centerY: 0, scale: 4.0, iterations: 70, family: 'newton' },
    barnsley: { centerX: 0, centerY: 5.1, scale: 11.2, iterations: 800, family: 'points' },
    sierpinski: { centerX: 0.5, centerY: 0.43, scale: 1.25, iterations: 800, family: 'points' },
    carpet: { centerX: 0.5, centerY: 0.5, scale: 1.18, iterations: 650, family: 'geometry' },
    koch: { centerX: 0, centerY: 0.05, scale: 3.4, iterations: 650, family: 'geometry' },
    dragon: { centerX: 0.45, centerY: 0.25, scale: 2.2, iterations: 680, family: 'geometry' },
    hilbert: { centerX: 0.5, centerY: 0.5, scale: 1.2, iterations: 650, family: 'geometry' }
  };

  const state = {
    type: 'mandelbrot',
    centerX: FRACTAL_PRESETS.mandelbrot.centerX,
    centerY: FRACTAL_PRESETS.mandelbrot.centerY,
    scale: FRACTAL_PRESETS.mandelbrot.scale,
    baseScale: FRACTAL_PRESETS.mandelbrot.scale,
    iterations: FRACTAL_PRESETS.mandelbrot.iterations,
    quality: Number(ui.quality.value),
    speed: 1,
    minSpeed: 0.08,
    maxSpeed: 40,
    juliaCx: -0.74543,
    juliaCy: 0.11301,
    dragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    keys: new Set(),
    needsRender: true,
    interactive: false,
    finalTimer: 0,
    lastFrameTime: performance.now(),
    lastRenderTime: 0,
    cssWidth: 1,
    cssHeight: 1,
    pixelRatio: 1
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => ui.toast.classList.remove('is-visible'), 2200);
  }

  function resetView(type = state.type) {
    const preset = FRACTAL_PRESETS[type];
    state.type = type;
    state.centerX = preset.centerX;
    state.centerY = preset.centerY;
    state.scale = preset.scale;
    state.baseScale = preset.scale;
    state.iterations = preset.iterations;
    ui.iterations.value = String(clamp(preset.iterations, Number(ui.iterations.min), Number(ui.iterations.max)));
    requestRender(false);
    updateReadout();
  }

  function resizeCanvas() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    state.pixelRatio = dpr;
    state.cssWidth = Math.max(1, canvas.clientWidth);
    state.cssHeight = Math.max(1, canvas.clientHeight);
    canvas.width = Math.floor(state.cssWidth * dpr);
    canvas.height = Math.floor(state.cssHeight * dpr);
    requestRender(false);
  }

  function requestRender(interactive) {
    state.needsRender = true;
    state.interactive = Boolean(interactive);
    if (!interactive) return;

    clearTimeout(state.finalTimer);
    state.finalTimer = setTimeout(() => {
      state.interactive = false;
      state.needsRender = true;
    }, 180);
  }

  function adjustSpeed(direction) {
    const factor = direction > 0 ? 1.13 : 0.885;
    state.speed = clamp(state.speed * factor, state.minSpeed, state.maxSpeed);
    updateReadout();
    showToast(`Velocidad ${state.speed.toFixed(2)}×`);
  }

  function worldToRender(x, y, renderWidth, renderHeight) {
    return {
      x: (x - state.centerX) / state.scale * renderWidth + renderWidth / 2,
      y: (y - state.centerY) / state.scale * renderWidth + renderHeight / 2
    };
  }

  function updateReadout() {
    const zoom = state.baseScale / state.scale;
    const speedPct = Math.log(state.speed / state.minSpeed) / Math.log(state.maxSpeed / state.minSpeed);
    ui.speedValue.textContent = `${state.speed.toFixed(2)}×`;
    ui.speedBar.style.width = `${clamp(speedPct, 0, 1) * 100}%`;
    ui.zoomValue.textContent = `Zoom: ${zoom.toFixed(2)}×`;
    ui.positionValue.textContent = `X: ${state.centerX.toFixed(6)} · Y: ${state.centerY.toFixed(6)}`;
  }

  function complexityValue() {
    const raw = clamp(Number(ui.iterations.value), Number(ui.iterations.min), Number(ui.iterations.max));
    return (raw - Number(ui.iterations.min)) / (Number(ui.iterations.max) - Number(ui.iterations.min));
  }

  function pointIterations(min, max) {
    return Math.floor(min + complexityValue() * (max - min));
  }

  function buildRenderTarget() {
    const baseQuality = state.interactive ? Math.min(0.38, state.quality) : state.quality;
    const maxPixels = state.interactive ? 360000 : 1200000;
    const desiredWidth = Math.max(160, Math.floor(canvas.width * baseQuality));
    const desiredHeight = Math.max(120, Math.floor(canvas.height * baseQuality));
    const pixelCount = desiredWidth * desiredHeight;
    const limiter = pixelCount > maxPixels ? Math.sqrt(maxPixels / pixelCount) : 1;
    const width = Math.max(160, Math.floor(desiredWidth * limiter));
    const height = Math.max(120, Math.floor(desiredHeight * limiter));
    const buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;
    const bufferCtx = buffer.getContext('2d', { alpha: false });
    return { buffer, bufferCtx, width, height };
  }

  function paintBackground(targetCtx, width, height) {
    const gradient = targetCtx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, '#111b3a');
    gradient.addColorStop(0.55, '#050917');
    gradient.addColorStop(1, '#01030a');
    targetCtx.fillStyle = gradient;
    targetCtx.fillRect(0, 0, width, height);
  }

  function escapeColor(iteration, maxIterations, zx, zy, variant) {
    if (iteration >= maxIterations) return [3, 6, 14];
    const magnitude = Math.sqrt(zx * zx + zy * zy);
    const smooth = iteration + 1 - Math.log(Math.log(Math.max(magnitude, 1.000001))) / Math.log(2);
    const t = clamp(smooth / maxIterations, 0, 1);
    const wave = variant === 'burningShip' ? 0.15 : variant === 'tricorn' ? 0.32 : variant === 'multibrot3' ? 0.58 : 0.45;
    const r = Math.floor(30 + 210 * Math.pow(t, 0.72));
    const g = Math.floor(38 + 175 * (0.5 + 0.5 * Math.sin(9.5 * t + wave)) * (1 - t * 0.18));
    const b = Math.floor(70 + 185 * (1 - Math.pow(t, 1.7)));
    return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
  }

  function renderEscape(targetCtx, width, height) {
    const maxIterations = clamp(Number(ui.iterations.value), 30, 800);
    const image = targetCtx.createImageData(width, height);
    const data = image.data;
    let offset = 0;

    for (let py = 0; py < height; py += 1) {
      const cy = state.centerY + (py - height / 2) / width * state.scale;
      for (let px = 0; px < width; px += 1) {
        const cx = state.centerX + (px - width / 2) / width * state.scale;
        let zx = 0;
        let zy = 0;
        let cReal = cx;
        let cImag = cy;

        if (state.type === 'julia') {
          zx = cx;
          zy = cy;
          cReal = state.juliaCx;
          cImag = state.juliaCy;
        }

        let i = 0;
        for (; i < maxIterations; i += 1) {
          let nx;
          let ny;
          if (state.type === 'burningShip') {
            const ax = Math.abs(zx);
            const ay = Math.abs(zy);
            nx = ax * ax - ay * ay + cReal;
            ny = 2 * ax * ay + cImag;
          } else if (state.type === 'tricorn') {
            nx = zx * zx - zy * zy + cReal;
            ny = -2 * zx * zy + cImag;
          } else if (state.type === 'multibrot3') {
            nx = zx * zx * zx - 3 * zx * zy * zy + cReal;
            ny = 3 * zx * zx * zy - zy * zy * zy + cImag;
          } else {
            nx = zx * zx - zy * zy + cReal;
            ny = 2 * zx * zy + cImag;
          }
          zx = nx;
          zy = ny;
          if (zx * zx + zy * zy > 16) break;
        }

        const [r, g, b] = escapeColor(i, maxIterations, zx, zy, state.type);
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = 255;
        offset += 4;
      }
    }

    targetCtx.putImageData(image, 0, 0);
  }

  function renderNewton(targetCtx, width, height) {
    const maxIterations = clamp(Number(ui.iterations.value), 20, 140);
    const image = targetCtx.createImageData(width, height);
    const data = image.data;
    const roots = [
      { x: 1, y: 0, color: [255, 225, 114] },
      { x: -0.5, y: Math.sqrt(3) / 2, color: [110, 218, 255] },
      { x: -0.5, y: -Math.sqrt(3) / 2, color: [255, 120, 202] }
    ];
    let offset = 0;

    for (let py = 0; py < height; py += 1) {
      const y = state.centerY + (py - height / 2) / width * state.scale;
      for (let px = 0; px < width; px += 1) {
        let x = state.centerX + (px - width / 2) / width * state.scale;
        let zy = y;
        let rootIndex = 0;
        let i = 0;

        for (; i < maxIterations; i += 1) {
          const x2 = x * x;
          const y2 = zy * zy;
          const denom = 3 * (x2 + y2) * (x2 + y2);
          if (denom < 1e-12) break;

          const fx = x * x2 - 3 * x * y2 - 1;
          const fy = 3 * x2 * zy - zy * y2;
          const dfx = 3 * (x2 - y2);
          const dfy = 6 * x * zy;
          const qx = (fx * dfx + fy * dfy) / (dfx * dfx + dfy * dfy);
          const qy = (fy * dfx - fx * dfy) / (dfx * dfx + dfy * dfy);
          x -= qx;
          zy -= qy;

          let converged = false;
          for (let r = 0; r < roots.length; r += 1) {
            const dx = x - roots[r].x;
            const dy = zy - roots[r].y;
            if (dx * dx + dy * dy < 0.000001) {
              rootIndex = r;
              converged = true;
              break;
            }
          }
          if (converged) break;
        }

        const root = roots[rootIndex].color;
        const shade = clamp(1 - (i / maxIterations) * 0.88, 0.15, 1);
        data[offset] = Math.floor(root[0] * shade);
        data[offset + 1] = Math.floor(root[1] * shade);
        data[offset + 2] = Math.floor(root[2] * shade);
        data[offset + 3] = 255;
        offset += 4;
      }
    }

    targetCtx.putImageData(image, 0, 0);
  }

  function renderPointFractal(targetCtx, width, height) {
    paintBackground(targetCtx, width, height);
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'lighter';
    targetCtx.fillStyle = 'rgba(150, 230, 255, 0.34)';

    if (state.type === 'barnsley') renderBarnsley(targetCtx, width, height);
    if (state.type === 'sierpinski') renderSierpinski(targetCtx, width, height);

    targetCtx.restore();
  }

  function plotWorldPoint(targetCtx, width, height, x, y, size = 1) {
    const point = worldToRender(x, y, width, height);
    if (point.x < -2 || point.y < -2 || point.x > width + 2 || point.y > height + 2) return;
    targetCtx.fillRect(point.x, point.y, size, size);
  }

  function renderBarnsley(targetCtx, width, height) {
    let x = 0;
    let y = 0;
    const iterations = state.interactive ? 55000 : pointIterations(50000, 260000);
    for (let i = 0; i < iterations; i += 1) {
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
      if (i > 20) plotWorldPoint(targetCtx, width, height, x, 10 - y, 1);
    }
  }

  function renderSierpinski(targetCtx, width, height) {
    const vertices = [
      [0.5, 0.02],
      [0.05, 0.9],
      [0.95, 0.9]
    ];
    let x = 0.5;
    let y = 0.5;
    const iterations = state.interactive ? 45000 : pointIterations(40000, 180000);
    for (let i = 0; i < iterations; i += 1) {
      const vertex = vertices[Math.floor(Math.random() * vertices.length)];
      x = (x + vertex[0]) / 2;
      y = (y + vertex[1]) / 2;
      plotWorldPoint(targetCtx, width, height, x, y, 1);
    }
  }

  function renderGeometry(targetCtx, width, height) {
    paintBackground(targetCtx, width, height);
    targetCtx.save();
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    targetCtx.strokeStyle = 'rgba(190, 236, 255, 0.9)';
    targetCtx.fillStyle = 'rgba(140, 218, 255, 0.8)';
    targetCtx.lineWidth = Math.max(1, width / 1200);

    if (state.type === 'koch') renderKoch(targetCtx, width, height);
    if (state.type === 'dragon') renderDragon(targetCtx, width, height);
    if (state.type === 'hilbert') renderHilbert(targetCtx, width, height);
    if (state.type === 'carpet') renderCarpet(targetCtx, width, height);

    targetCtx.restore();
  }

  function drawPolyline(targetCtx, width, height, points) {
    if (points.length < 2) return;
    targetCtx.beginPath();
    const first = worldToRender(points[0][0], points[0][1], width, height);
    targetCtx.moveTo(first.x, first.y);
    for (let i = 1; i < points.length; i += 1) {
      const p = worldToRender(points[i][0], points[i][1], width, height);
      targetCtx.lineTo(p.x, p.y);
    }
    targetCtx.stroke();
  }

  function kochSegment(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const p1 = [a[0] + dx / 3, a[1] + dy / 3];
    const p3 = [a[0] + dx * 2 / 3, a[1] + dy * 2 / 3];
    const angle = Math.PI / 3;
    const rx = Math.cos(angle) * (p3[0] - p1[0]) - Math.sin(angle) * (p3[1] - p1[1]);
    const ry = Math.sin(angle) * (p3[0] - p1[0]) + Math.cos(angle) * (p3[1] - p1[1]);
    const p2 = [p1[0] + rx, p1[1] + ry];
    return [a, p1, p2, p3];
  }

  function renderKoch(targetCtx, width, height) {
    const radius = 1.05;
    const triangle = [];
    for (let i = 0; i < 3; i += 1) {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / 3;
      triangle.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
    let points = [triangle[0], triangle[1], triangle[2], triangle[0]];
    const depth = state.interactive ? 4 : clamp(Math.floor(Number(ui.iterations.value) / 110), 1, 6);
    for (let d = 0; d < depth; d += 1) {
      const next = [];
      for (let i = 0; i < points.length - 1; i += 1) {
        next.push(...kochSegment(points[i], points[i + 1]));
      }
      next.push(points[points.length - 1]);
      points = next;
    }
    drawPolyline(targetCtx, width, height, points);
  }

  function renderDragon(targetCtx, width, height) {
    const order = state.interactive ? 12 : clamp(Math.floor(Number(ui.iterations.value) / 45), 8, 16);
    let points = [[0, 0], [1, 0]];
    for (let n = 0; n < order; n += 1) {
      const pivot = points[points.length - 1];
      for (let i = points.length - 2; i >= 0; i -= 1) {
        const dx = points[i][0] - pivot[0];
        const dy = points[i][1] - pivot[1];
        points.push([pivot[0] - dy, pivot[1] + dx]);
      }
    }
    const normalised = normalisePoints(points, 0.12, 0.88, 0.12, 0.88);
    drawPolyline(targetCtx, width, height, normalised);
  }

  function normalisePoints(points, minXTarget, maxXTarget, minYTarget, maxYTarget) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const sourceW = maxX - minX || 1;
    const sourceH = maxY - minY || 1;
    return points.map(([x, y]) => [
      minXTarget + (x - minX) / sourceW * (maxXTarget - minXTarget),
      minYTarget + (y - minY) / sourceH * (maxYTarget - minYTarget)
    ]);
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

  function renderHilbert(targetCtx, width, height) {
    const order = state.interactive ? 5 : clamp(Math.floor(Number(ui.iterations.value) / 110), 2, 7);
    const n = 1 << order;
    const points = [];
    for (let i = 0; i < n * n; i += 1) {
      const [x, y] = hilbertIndexToXY(order, i);
      points.push([x / (n - 1), y / (n - 1)]);
    }
    drawPolyline(targetCtx, width, height, points);
  }

  function renderCarpet(targetCtx, width, height) {
    const depth = state.interactive ? 4 : clamp(Math.floor(Number(ui.iterations.value) / 120), 2, 6);
    targetCtx.fillStyle = 'rgba(178, 232, 255, 0.92)';

    function drawSquare(x, y, size, level) {
      if (level === 0) {
        const a = worldToRender(x, y, width, height);
        const b = worldToRender(x + size, y + size, width, height);
        targetCtx.fillRect(a.x, a.y, b.x - a.x + 0.4, b.y - a.y + 0.4);
        return;
      }
      const third = size / 3;
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          if (row === 1 && col === 1) continue;
          drawSquare(x + col * third, y + row * third, third, level - 1);
        }
      }
    }

    drawSquare(0, 0, 1, depth);
  }

  function render() {
    const start = performance.now();
    state.needsRender = false;
    const { buffer, bufferCtx, width, height } = buildRenderTarget();
    const family = FRACTAL_PRESETS[state.type].family;

    if (family === 'escape') renderEscape(bufferCtx, width, height);
    if (family === 'newton') renderNewton(bufferCtx, width, height);
    if (family === 'points') renderPointFractal(bufferCtx, width, height);
    if (family === 'geometry') renderGeometry(bufferCtx, width, height);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height);

    const elapsed = performance.now() - start;
    state.lastRenderTime = elapsed;
    ui.renderValue.textContent = `Render: ${elapsed.toFixed(0)} ms · ${width}×${height}`;
    updateReadout();
  }

  function animationFrame(now) {
    const deltaSeconds = clamp((now - state.lastFrameTime) / 1000, 0, 0.05);
    state.lastFrameTime = now;

    let moved = false;
    const panStep = state.scale * state.speed * deltaSeconds * 0.65;
    const zoomStep = Math.exp(state.speed * deltaSeconds * 0.9);

    if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) {
      state.centerX -= panStep;
      moved = true;
    }
    if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) {
      state.centerX += panStep;
      moved = true;
    }
    if (state.keys.has('ArrowUp')) {
      state.centerY -= panStep;
      moved = true;
    }
    if (state.keys.has('ArrowDown')) {
      state.centerY += panStep;
      moved = true;
    }
    if (state.keys.has('KeyW')) {
      state.scale /= zoomStep;
      moved = true;
    }
    if (state.keys.has('KeyS')) {
      state.scale *= zoomStep;
      moved = true;
    }

    state.scale = clamp(state.scale, 1e-13, 1e8);

    if (moved) requestRender(true);
    if (state.needsRender) render();
    requestAnimationFrame(animationFrame);
  }

  function bindEvents() {
    window.addEventListener('resize', resizeCanvas);

    ui.fractalType.addEventListener('change', () => {
      resetView(ui.fractalType.value);
      showToast(`Fractal activo: ${ui.fractalType.options[ui.fractalType.selectedIndex].text}`);
    });

    ui.iterations.addEventListener('input', () => requestRender(false));
    ui.quality.addEventListener('change', () => {
      state.quality = Number(ui.quality.value);
      requestRender(false);
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
      link.download = `fractales-${state.type}.png`;
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
      state.centerX -= dx / state.cssWidth * state.scale;
      state.centerY -= dy / state.cssWidth * state.scale;
      requestRender(true);
    });

    canvas.addEventListener('pointerup', (event) => {
      state.dragging = false;
      canvas.classList.remove('dragging');
      canvas.releasePointerCapture(event.pointerId);
      requestRender(false);
    });

    canvas.addEventListener('pointercancel', () => {
      state.dragging = false;
      canvas.classList.remove('dragging');
      requestRender(false);
    });

    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      adjustSpeed(event.deltaY < 0 ? 1 : -1);
    }, { passive: false });

    window.addEventListener('keydown', (event) => {
      const navigationKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!navigationKeys.includes(event.code)) return;
      event.preventDefault();
      state.keys.add(event.code);
    });

    window.addEventListener('keyup', (event) => {
      state.keys.delete(event.code);
      requestRender(false);
    });
  }

  function init() {
    bindEvents();
    resizeCanvas();
    resetView('mandelbrot');
    showToast('Fractales v1 cargado');
    requestAnimationFrame(animationFrame);
  }

  init();
})();
