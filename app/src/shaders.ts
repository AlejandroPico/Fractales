export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;
  precision highp int;

  varying vec2 vUv;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform int uDimension;
  uniform int uFractal;
  uniform vec2 uCenterHi;
  uniform vec2 uCenterLo;
  uniform vec2 uScaleDS;
  uniform vec2 uJuliaHi;
  uniform vec2 uJuliaLo;
  uniform int uIterations;
  uniform int uRaySteps;
  uniform int uVolumeIterations;
  uniform int uStage;
  uniform float uPower;
  uniform float uAux;
  uniform float uExposure;
  uniform float uPalette;
  uniform float uSurfacePrecision;
  uniform float uGlow;
  uniform vec3 uCameraPosition;
  uniform mat3 uCameraMatrix;

  const float FAR_PLANE = 120.0;
  const float SPLITTER = 4097.0;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  vec3 palette(float t, float variant) {
    t = clamp(t, 0.0, 1.0);
    vec3 a = vec3(0.055, 0.065, 0.13);
    vec3 b = vec3(0.62, 0.54, 0.74);
    vec3 c = vec3(0.92, 0.80, 0.62);
    vec3 d = vec3(0.035 + variant, 0.18 + variant * 0.23, 0.36 + variant * 0.17);
    vec3 col = a + b * cos(6.2831853 * (c * t + d));
    col += vec3(0.055, 0.14, 0.23) * pow(t, 0.31);
    return clamp(col, 0.0, 1.0);
  }

  vec2 dsAdd(vec2 a, vec2 b) {
    float s = a.x + b.x;
    float v = s - a.x;
    float t = ((b.x - v) + (a.x - (s - v))) + a.y + b.y;
    float hi = s + t;
    return vec2(hi, t - (hi - s));
  }

  vec2 dsSub(vec2 a, vec2 b) {
    return dsAdd(a, -b);
  }

  vec2 splitSingle(float value) {
    float c = SPLITTER * value;
    float big = c - value;
    float hi = c - big;
    return vec2(hi, value - hi);
  }

  vec2 dsMul(vec2 a, vec2 b) {
    float product = a.x * b.x;
    vec2 as = splitSingle(a.x);
    vec2 bs = splitSingle(b.x);
    float error = ((as.x * bs.x - product) + as.x * bs.y + as.y * bs.x) + as.y * bs.y;
    error += a.x * b.y + a.y * b.x;
    float hi = product + error;
    return vec2(hi, error - (hi - product));
  }

  vec2 dsMulFloat(vec2 a, float b) {
    return dsMul(a, vec2(b, 0.0));
  }

  vec2 dsAbs(vec2 a) {
    return (a.x + a.y) < 0.0 ? -a : a;
  }

  float dsValue(vec2 a) {
    return a.x + a.y;
  }

  vec4 dcAdd(vec4 a, vec4 b) {
    return vec4(dsAdd(a.xy, b.xy), dsAdd(a.zw, b.zw));
  }

  vec4 dcSub(vec4 a, vec4 b) {
    return vec4(dsSub(a.xy, b.xy), dsSub(a.zw, b.zw));
  }

  vec4 dcMul(vec4 a, vec4 b) {
    vec2 realPart = dsSub(dsMul(a.xy, b.xy), dsMul(a.zw, b.zw));
    vec2 imaginaryPart = dsAdd(dsMul(a.xy, b.zw), dsMul(a.zw, b.xy));
    return vec4(realPart, imaginaryPart);
  }

  vec4 dcMulFloat(vec4 a, float b) {
    return vec4(dsMulFloat(a.xy, b), dsMulFloat(a.zw, b));
  }

  vec4 dcPow3(vec4 z) {
    return dcMul(dcMul(z, z), z);
  }

  vec4 dcPow4(vec4 z) {
    vec4 z2 = dcMul(z, z);
    return dcMul(z2, z2);
  }

  vec4 dcPow5(vec4 z) {
    vec4 z2 = dcMul(z, z);
    return dcMul(dcMul(z2, z2), z);
  }

  vec2 complexSquareFloat(vec2 z) {
    return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
  }

  vec2 complexMulFloat(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
  }

  vec2 complexDivFloat(vec2 a, vec2 b) {
    float denominator = max(dot(b, b), 1e-20);
    return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / denominator;
  }

  vec4 pixelCoordinate(vec2 fragCoord) {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = (fragCoord / uResolution - 0.5) * vec2(aspect, 1.0);
    vec2 x = dsAdd(vec2(uCenterHi.x, uCenterLo.x), dsMulFloat(uScaleDS, p.x));
    vec2 y = dsAdd(vec2(uCenterHi.y, uCenterLo.y), dsMulFloat(uScaleDS, p.y));
    return vec4(x, y);
  }

  vec3 renderNewtonFamily(vec4 coordinate) {
    vec2 c = vec2(dsValue(coordinate.xy), dsValue(coordinate.zw));
    vec2 z = c;
    float iteration = 0.0;
    int rootIndex = 0;

    if (uFractal == 10) {
      for (int i = 0; i < 900; i++) {
        if (i >= uIterations) break;
        vec2 numerator = complexSquareFloat(z) + c - vec2(1.0, 0.0);
        vec2 denominator = 2.0 * z + c - vec2(2.0, 0.0);
        vec2 ratio = complexDivFloat(numerator, denominator);
        z = complexSquareFloat(ratio);
        iteration = float(i);
        if (dot(z - vec2(1.0, 0.0), z - vec2(1.0, 0.0)) < 1e-10 || dot(z, z) > 1e12) break;
      }
      float t = fract(iteration / max(float(uIterations), 1.0) * 7.0 + uPalette * 0.09);
      return palette(t, 0.46 + uPalette * 0.025);
    }

    for (int i = 0; i < 900; i++) {
      if (i >= uIterations) break;
      vec2 z2 = complexSquareFloat(z);
      vec2 z3 = complexMulFloat(z2, z);
      vec2 numerator = z3 - vec2(1.0, 0.0);
      vec2 denominator = 3.0 * z2;
      vec2 correction = complexDivFloat(numerator, denominator);
      float relaxation = uFractal == 15 ? max(uAux, 0.05) : 1.0;
      z -= correction * relaxation;
      if (uFractal == 15) z += c * 0.08;
      iteration = float(i);
      float d0 = dot(z - vec2(1.0, 0.0), z - vec2(1.0, 0.0));
      float d1 = dot(z - vec2(-0.5, 0.8660254), z - vec2(-0.5, 0.8660254));
      float d2 = dot(z - vec2(-0.5, -0.8660254), z - vec2(-0.5, -0.8660254));
      if (min(d0, min(d1, d2)) < 1e-10) {
        rootIndex = d1 < d0 && d1 < d2 ? 1 : (d2 < d0 && d2 < d1 ? 2 : 0);
        break;
      }
    }

    vec3 rootColor = palette(0.18 + uPalette * 0.02, 0.05);
    if (rootIndex == 1) rootColor = palette(0.48 + uPalette * 0.02, 0.25);
    if (rootIndex == 2) rootColor = palette(0.78 + uPalette * 0.02, 0.45);
    float shade = 0.15 + 0.85 * pow(clamp(1.0 - iteration / max(float(uIterations), 1.0), 0.0, 1.0), 0.42);
    return rootColor * shade;
  }

  vec3 render2D(vec2 fragCoord) {
    vec4 coordinate = pixelCoordinate(fragCoord);
    if (uFractal == 10 || uFractal == 11 || uFractal == 15) return renderNewtonFamily(coordinate);

    vec4 z = vec4(0.0);
    vec4 previousZ = vec4(0.0);
    vec4 k = coordinate;
    if (uFractal == 1) {
      z = coordinate;
      k = vec4(uJuliaHi.x, uJuliaLo.x, uJuliaHi.y, uJuliaLo.y);
    }

    float escaped = 0.0;
    float iteration = 0.0;
    float orbitTrap = 10.0;

    for (int i = 0; i < 2400; i++) {
      if (i >= uIterations) break;
      vec4 working = z;
      vec4 nextZ;

      if (uFractal == 2) {
        working.xy = dsAbs(working.xy);
        working.zw = dsAbs(working.zw);
        nextZ = dcAdd(dcMul(working, working), k);
      } else if (uFractal == 3) {
        working.zw = -working.zw;
        nextZ = dcAdd(dcMul(working, working), k);
      } else if (uFractal == 4) {
        nextZ = dcAdd(dcPow3(working), k);
      } else if (uFractal == 5) {
        nextZ = dcAdd(dcMul(working, working), k);
        nextZ.xy = dsAbs(nextZ.xy);
      } else if (uFractal == 6) {
        nextZ = dcAdd(dcMul(working, working), k);
        nextZ.xy = dsAbs(nextZ.xy);
        nextZ.zw = -dsAbs(nextZ.zw);
      } else if (uFractal == 7) {
        working.zw = dsAbs(working.zw);
        nextZ = dcAdd(dcMul(working, working), k);
      } else if (uFractal == 8) {
        working.xy = dsAbs(working.xy);
        working.zw = -working.zw;
        nextZ = dcAdd(dcMul(working, working), k);
      } else if (uFractal == 9) {
        nextZ = dcAdd(dcAdd(dcMul(working, working), k), dcMulFloat(previousZ, uAux));
      } else if (uFractal == 12) {
        nextZ = dcAdd(dcPow4(working), k);
      } else if (uFractal == 13) {
        nextZ = dcAdd(dcPow5(working), k);
      } else if (uFractal == 14) {
        working.xy = dsAbs(working.xy);
        working.zw = dsAbs(working.zw);
        nextZ = dcAdd(dcPow3(working), k);
      } else {
        nextZ = dcAdd(dcMul(working, working), k);
      }

      previousZ = z;
      z = nextZ;
      vec2 zf = vec2(dsValue(z.xy), dsValue(z.zw));
      orbitTrap = min(orbitTrap, min(abs(length(zf) - 0.72), min(abs(zf.x), abs(zf.y))));
      if (dot(zf, zf) > 64.0) {
        escaped = 1.0;
        iteration = float(i);
        break;
      }
    }

    if (escaped < 0.5) {
      float glow = exp(-18.0 * orbitTrap) * uGlow;
      return vec3(0.0015, 0.0035, 0.013) + palette(glow, uPalette * 0.065) * glow * 0.26;
    }

    vec2 zf = vec2(dsValue(z.xy), dsValue(z.zw));
    float radius = max(length(zf), 1.000001);
    float smoothIteration = iteration + 1.0 - log(max(log(radius), 0.000001)) / log(max(uPower, 2.0));
    float normalized = smoothIteration / max(float(uIterations), 1.0);
    float bands = 0.88 + 0.12 * sin(smoothIteration * 0.48);
    float colorPosition = fract(normalized * 6.0 + uPalette * 0.105);
    vec3 color = palette(colorPosition, float(uFractal) * 0.031 + uPalette * 0.026);
    color *= bands;
    color += vec3(0.13, 0.25, 0.36) * exp(-25.0 * orbitTrap) * uGlow;
    return color;
  }

  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }

  vec2 mandelbulbDE(vec3 p, float power, vec3 juliaOffset) {
    vec3 z = p;
    float dr = 1.0;
    float radius = 0.0;
    float trap = 10.0;
    for (int i = 0; i < 32; i++) {
      if (i >= uVolumeIterations) break;
      radius = length(z);
      trap = min(trap, abs(radius - 1.0));
      if (radius > 4.0) break;
      float safeRadius = max(radius, 0.000001);
      float theta = acos(clamp(z.z / safeRadius, -1.0, 1.0));
      float phi = atan(z.y, z.x);
      float poweredRadius = pow(safeRadius, power);
      dr = pow(safeRadius, power - 1.0) * power * dr + 1.0;
      theta *= power;
      phi *= power;
      z = poweredRadius * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
      z += p + juliaOffset;
    }
    float distance = 0.5 * log(max(radius, 0.000001)) * radius / max(dr, 0.000001);
    return vec2(distance, trap);
  }

  vec2 mandelboxDE(vec3 p) {
    vec4 z = vec4(p, 1.0);
    vec4 offset = z;
    float trap = 10.0;
    const float scale = -1.78;
    const float minRadius2 = 0.25;
    const float fixedRadius2 = 1.0;
    for (int i = 0; i < 28; i++) {
      if (i >= uVolumeIterations) break;
      z.xyz = clamp(z.xyz, -1.0, 1.0) * 2.0 - z.xyz;
      float radius2 = dot(z.xyz, z.xyz);
      trap = min(trap, abs(radius2 - 0.65));
      if (radius2 < minRadius2) z *= fixedRadius2 / minRadius2;
      else if (radius2 < fixedRadius2) z *= fixedRadius2 / radius2;
      z = z * scale + offset;
    }
    return vec2((length(z.xyz) - abs(scale - 1.0)) / max(abs(z.w), 0.000001), trap);
  }

  vec2 mengerDE(vec3 p) {
    float distance = sdBox(p, vec3(1.35));
    float scale = 1.0;
    float trap = 10.0;
    for (int i = 0; i < 10; i++) {
      if (i >= uVolumeIterations) break;
      vec3 a = mod(p * scale, 2.0) - 1.0;
      scale *= 3.0;
      vec3 r = abs(1.0 - 3.0 * abs(a));
      float da = max(r.x, r.y);
      float db = max(r.y, r.z);
      float dc = max(r.z, r.x);
      float cut = (min(da, min(db, dc)) - 1.0) / scale;
      distance = max(distance, cut);
      trap = min(trap, abs(cut));
    }
    return vec2(distance, trap);
  }

  vec2 sierpinskiDE(vec3 p) {
    const vec3 v0 = vec3(1.0, 1.0, 1.0);
    const vec3 v1 = vec3(-1.0, -1.0, 1.0);
    const vec3 v2 = vec3(-1.0, 1.0, -1.0);
    const vec3 v3 = vec3(1.0, -1.0, -1.0);
    float scale = 1.0;
    float trap = 10.0;
    for (int i = 0; i < 14; i++) {
      if (i >= uVolumeIterations) break;
      vec3 nearest = v0;
      float nearestDistance = dot(p - v0, p - v0);
      float d1 = dot(p - v1, p - v1);
      float d2 = dot(p - v2, p - v2);
      float d3 = dot(p - v3, p - v3);
      if (d1 < nearestDistance) { nearestDistance = d1; nearest = v1; }
      if (d2 < nearestDistance) { nearestDistance = d2; nearest = v2; }
      if (d3 < nearestDistance) { nearestDistance = d3; nearest = v3; }
      p = (p - nearest) * 2.0;
      scale *= 2.0;
      trap = min(trap, sqrt(nearestDistance) / scale);
    }
    return vec2((length(p) - 1.15) / scale, trap);
  }

  vec2 apollonianDE(vec3 p) {
    float scale = 1.0;
    float trap = 10.0;
    for (int i = 0; i < 14; i++) {
      if (i >= uVolumeIterations) break;
      p = mod(p + 1.0, 2.0) - 1.0;
      float radius2 = max(dot(p, p), 0.04);
      float factor = 1.35 / radius2;
      p *= factor;
      scale *= factor;
      trap = min(trap, abs(radius2 - 0.58));
    }
    return vec2((length(p) - 1.0) / max(scale, 0.000001), trap);
  }

  vec2 amazingSurfaceDE(vec3 p) {
    vec3 z = p;
    float derivative = 1.0;
    float trap = 10.0;
    for (int i = 0; i < 24; i++) {
      if (i >= uVolumeIterations) break;
      z.xy = clamp(z.xy, -1.0, 1.0) * 2.0 - z.xy;
      float radius2 = max(dot(z.xy, z.xy), 0.12);
      float factor = clamp(1.2 / radius2, 0.75, 4.0);
      z *= factor;
      derivative *= factor;
      z = z * 1.72 + p;
      derivative = derivative * 1.72 + 1.0;
      trap = min(trap, abs(radius2 - 0.72));
    }
    return vec2((length(z.xy) - 0.55) / max(derivative, 0.000001), trap);
  }

  vec2 kaleidoscopicDE(vec3 p) {
    float scale = 1.0;
    float trap = 10.0;
    for (int i = 0; i < 20; i++) {
      if (i >= uVolumeIterations) break;
      p = abs(p);
      if (p.x < p.y) p.xy = p.yx;
      if (p.x < p.z) p.xz = p.zx;
      if (p.y < p.z) p.yz = p.zy;
      p = p * 1.82 - vec3(1.12, 0.72, 0.54);
      scale *= 1.82;
      trap = min(trap, abs(length(p) - 0.64) / scale);
    }
    return vec2((length(p) - 0.22) / scale, trap);
  }

  vec2 mapScene(vec3 p) {
    if (uFractal == 100) return mandelbulbDE(p, max(uPower, 2.0), vec3(0.0));
    if (uFractal == 101) return mandelboxDE(p);
    if (uFractal == 102) return mengerDE(p);
    if (uFractal == 103) return mandelbulbDE(p, max(uPower, 2.0), vec3(-0.18, 0.08, 0.03));
    if (uFractal == 104) return sierpinskiDE(p);
    if (uFractal == 105) return apollonianDE(p);
    if (uFractal == 106) return amazingSurfaceDE(p);
    if (uFractal == 107) return kaleidoscopicDE(p);
    return mandelbulbDE(p, 8.0, vec3(0.0));
  }

  vec3 estimateNormal(vec3 p, float epsilon) {
    vec2 h = vec2(epsilon, 0.0);
    return normalize(vec3(
      mapScene(p + h.xyy).x - mapScene(p - h.xyy).x,
      mapScene(p + h.yxy).x - mapScene(p - h.yxy).x,
      mapScene(p + h.yyx).x - mapScene(p - h.yyx).x
    ));
  }

  float ambientOcclusion(vec3 p, vec3 normal, float epsilon) {
    float result = 0.0;
    float weight = 1.0;
    for (int i = 1; i <= 6; i++) {
      float stepDistance = epsilon * (5.0 + 7.0 * float(i));
      float sampleDistance = mapScene(p + normal * stepDistance).x;
      result += (stepDistance - sampleDistance) * weight;
      weight *= 0.55;
    }
    return clamp(1.0 - result * 1.9, 0.06, 1.0);
  }

  float softShadow(vec3 origin, vec3 direction, float startDistance, float endDistance, float softness) {
    float result = 1.0;
    float travel = startDistance;
    for (int i = 0; i < 24; i++) {
      if (uStage == 0 || travel > endDistance) break;
      float distance = mapScene(origin + direction * travel).x;
      result = min(result, softness * distance / max(travel, 0.0001));
      travel += clamp(distance, 0.01, 0.45);
    }
    return clamp(result, 0.12, 1.0);
  }

  vec3 sky(vec3 rayDirection, vec2 fragCoord) {
    float horizon = pow(max(0.0, 1.0 - abs(rayDirection.y)), 3.0);
    vec3 color = mix(vec3(0.0015, 0.003, 0.010), vec3(0.022, 0.050, 0.105), horizon);
    float star = step(0.9987, hash21(floor(fragCoord * 0.36)));
    color += vec3(star) * (0.30 + 0.70 * hash21(floor(fragCoord * 0.36) + 7.1));
    return color;
  }

  vec3 render3D(vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - uResolution) / max(uResolution.y, 1.0);
    vec3 rayOrigin = uCameraPosition;
    vec3 rayDirection = normalize(uCameraMatrix * vec3(uv, 1.45));
    float totalDistance = 0.0;
    float trap = 10.0;
    float hit = 0.0;
    vec3 point = rayOrigin;
    float baseEpsilon = mix(0.0012, 0.000035, clamp(uSurfacePrecision, 0.0, 1.0));

    for (int i = 0; i < 420; i++) {
      if (i >= uRaySteps) break;
      point = rayOrigin + rayDirection * totalDistance;
      vec2 result = mapScene(point);
      float distance = result.x;
      trap = min(trap, result.y);
      float epsilon = max(baseEpsilon, totalDistance * baseEpsilon * 0.075);
      if (distance < epsilon) { hit = 1.0; break; }
      totalDistance += max(distance * 0.68, epsilon * 0.5);
      if (totalDistance > FAR_PLANE) break;
    }

    if (hit < 0.5) return sky(rayDirection, fragCoord);

    float normalEpsilon = max(baseEpsilon * 1.8, totalDistance * baseEpsilon * 0.10);
    vec3 normal = estimateNormal(point, normalEpsilon);
    vec3 sunDirection = normalize(vec3(-0.45, 0.72, 0.38));
    vec3 rimDirection = normalize(vec3(0.6, 0.15, -0.8));
    float diffuse = max(dot(normal, sunDirection), 0.0);
    float shadow = softShadow(point + normal * normalEpsilon * 3.0, sunDirection, normalEpsilon * 4.0, 20.0, 18.0);
    float rim = pow(max(1.0 - dot(normal, -rayDirection), 0.0), 2.35);
    float backLight = max(dot(normal, rimDirection), 0.0) * 0.34;
    float ao = uStage == 0 ? 0.82 : ambientOcclusion(point, normal, normalEpsilon);
    float detail = exp(-11.0 * trap);
    vec3 base = palette(fract(detail * 0.74 + totalDistance * 0.017 + uPalette * 0.11), 0.12 + uPalette * 0.038);
    vec3 color = base * (0.12 + diffuse * shadow * 1.12 + backLight) * ao;
    color += vec3(0.20, 0.46, 0.75) * rim * 0.52;
    color += base * detail * 0.32 * uGlow;
    float fog = 1.0 - exp(-totalDistance * 0.026);
    return mix(color, sky(rayDirection, fragCoord), fog);
  }

  void main() {
    vec2 fragCoord = vUv * uResolution;
    vec3 color = uDimension == 0 ? render2D(fragCoord) : render3D(fragCoord);
    color = vec3(1.0) - exp(-color * max(uExposure, 0.1));
    color = pow(max(color, 0.0), vec3(0.92));
    float vignette = smoothstep(1.25, 0.18, length(vUv - 0.5));
    color *= 0.79 + 0.21 * vignette;
    gl_FragColor = vec4(color, 1.0);
  }
`;
