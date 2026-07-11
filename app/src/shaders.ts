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
  uniform vec2 uCenter;
  uniform float uScale;
  uniform vec2 uJulia;
  uniform int uIterations;
  uniform int uRaySteps;
  uniform float uPower;
  uniform float uExposure;
  uniform float uPalette;
  uniform vec3 uCameraPosition;
  uniform mat3 uCameraMatrix;

  const float FAR_PLANE = 80.0;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  vec3 palette(float t, float variant) {
    t = clamp(t, 0.0, 1.0);
    vec3 a = vec3(0.08, 0.085, 0.15);
    vec3 b = vec3(0.60, 0.52, 0.72);
    vec3 c = vec3(0.92, 0.82, 0.64);
    vec3 d = vec3(0.03 + variant, 0.18 + variant * 0.25, 0.36 + variant * 0.18);
    vec3 col = a + b * cos(6.2831853 * (c * t + d));
    col += vec3(0.06, 0.14, 0.22) * pow(t, 0.34);
    return clamp(col, 0.0, 1.0);
  }

  vec2 complexPow(vec2 z, float power) {
    float r = length(z);
    float angle = atan(z.y, z.x);
    float rp = pow(max(r, 0.0000001), power);
    float ap = angle * power;
    return rp * vec2(cos(ap), sin(ap));
  }

  vec3 render2D(vec2 fragCoord) {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = (fragCoord / uResolution - 0.5) * vec2(aspect, 1.0);
    vec2 c = uCenter + p * uScale;
    vec2 z = vec2(0.0);
    vec2 k = c;
    if (uFractal == 1) { z = c; k = uJulia; }
    float escaped = 0.0;
    float iteration = 0.0;
    float orbitTrap = 10.0;

    for (int i = 0; i < 1400; i++) {
      if (i >= uIterations) break;
      float x = z.x;
      float y = z.y;
      vec2 nextZ;
      if (uFractal == 2) {
        x = abs(x); y = abs(y);
        nextZ = vec2(x * x - y * y, 2.0 * x * y) + k;
      } else if (uFractal == 3) {
        nextZ = vec2(x * x - y * y, -2.0 * x * y) + k;
      } else if (uFractal == 4) {
        nextZ = complexPow(z, 3.0) + k;
      } else if (uFractal == 5) {
        nextZ = vec2(abs(x * x - y * y), 2.0 * x * y) + k;
      } else {
        nextZ = vec2(x * x - y * y, 2.0 * x * y) + k;
      }
      z = nextZ;
      orbitTrap = min(orbitTrap, abs(length(z) - 0.72));
      if (dot(z, z) > 64.0) {
        escaped = 1.0;
        iteration = float(i);
        break;
      }
    }

    if (escaped < 0.5) {
      float glow = exp(-18.0 * orbitTrap);
      return vec3(0.0025, 0.005, 0.018) + palette(glow, uPalette * 0.07) * glow * 0.22;
    }

    float radius = max(length(z), 1.000001);
    float smoothIteration = iteration + 1.0 - log(max(log(radius), 0.000001)) / log(2.0);
    float t = smoothIteration / max(float(uIterations), 1.0);
    float bands = 0.88 + 0.12 * sin(smoothIteration * 0.55);
    vec3 col = palette(fract(t * 5.0 + uPalette * 0.11), float(uFractal) * 0.055 + uPalette * 0.03);
    col *= bands;
    col += vec3(0.12, 0.22, 0.30) * exp(-24.0 * orbitTrap);
    return col;
  }

  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }

  vec2 mandelbulbDE(vec3 p, float power, vec3 juliaOffset) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    float trap = 10.0;
    for (int i = 0; i < 18; i++) {
      r = length(z);
      trap = min(trap, abs(r - 1.0));
      if (r > 4.0) break;
      float theta = acos(clamp(z.z / max(r, 0.000001), -1.0, 1.0));
      float phi = atan(z.y, z.x);
      float zr = pow(r, power);
      dr = pow(r, power - 1.0) * power * dr + 1.0;
      theta *= power;
      phi *= power;
      z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
      z += p + juliaOffset;
    }
    float distance = 0.5 * log(max(r, 0.000001)) * r / max(dr, 0.000001);
    return vec2(distance, trap);
  }

  vec2 mandelboxDE(vec3 p) {
    vec4 z = vec4(p, 1.0);
    vec4 offset = z;
    float trap = 10.0;
    const float scale = -1.78;
    const float minRadius2 = 0.25;
    const float fixedRadius2 = 1.0;
    for (int i = 0; i < 15; i++) {
      z.xyz = clamp(z.xyz, -1.0, 1.0) * 2.0 - z.xyz;
      float r2 = dot(z.xyz, z.xyz);
      trap = min(trap, abs(r2 - 0.65));
      if (r2 < minRadius2) {
        z *= fixedRadius2 / minRadius2;
      } else if (r2 < fixedRadius2) {
        z *= fixedRadius2 / r2;
      }
      z = z * scale + offset;
    }
    return vec2((length(z.xyz) - abs(scale - 1.0)) / abs(z.w), trap);
  }

  vec2 mengerDE(vec3 p) {
    float d = sdBox(p, vec3(1.35));
    float scale = 1.0;
    float trap = 10.0;
    for (int i = 0; i < 6; i++) {
      vec3 a = mod(p * scale, 2.0) - 1.0;
      scale *= 3.0;
      vec3 r = abs(1.0 - 3.0 * abs(a));
      float da = max(r.x, r.y);
      float db = max(r.y, r.z);
      float dc = max(r.z, r.x);
      float c = (min(da, min(db, dc)) - 1.0) / scale;
      d = max(d, c);
      trap = min(trap, abs(c));
    }
    return vec2(d, trap);
  }

  vec2 mapScene(vec3 p) {
    if (uFractal == 10) return mandelbulbDE(p, max(uPower, 2.0), vec3(0.0));
    if (uFractal == 11) return mandelboxDE(p);
    if (uFractal == 12) return mengerDE(p);
    if (uFractal == 13) return mandelbulbDE(p, max(uPower, 2.0), vec3(-0.18, 0.08, 0.03));
    return mandelbulbDE(p, 8.0, vec3(0.0));
  }

  vec3 estimateNormal(vec3 p) {
    float e = 0.0008;
    vec2 h = vec2(e, 0.0);
    return normalize(vec3(
      mapScene(p + h.xyy).x - mapScene(p - h.xyy).x,
      mapScene(p + h.yxy).x - mapScene(p - h.yxy).x,
      mapScene(p + h.yyx).x - mapScene(p - h.yyx).x
    ));
  }

  float ambientOcclusion(vec3 p, vec3 n) {
    float result = 0.0;
    float weight = 1.0;
    for (int i = 1; i <= 5; i++) {
      float stepDistance = 0.035 * float(i);
      float sampleDistance = mapScene(p + n * stepDistance).x;
      result += (stepDistance - sampleDistance) * weight;
      weight *= 0.56;
    }
    return clamp(1.0 - result * 2.2, 0.08, 1.0);
  }

  vec3 sky(vec3 rayDirection, vec2 fragCoord) {
    float horizon = pow(max(0.0, 1.0 - abs(rayDirection.y)), 3.0);
    vec3 col = mix(vec3(0.002, 0.004, 0.012), vec3(0.025, 0.055, 0.11), horizon);
    float star = step(0.9985, hash21(floor(fragCoord * 0.38)));
    col += vec3(star) * (0.35 + 0.65 * hash21(floor(fragCoord * 0.38) + 7.1));
    return col;
  }

  vec3 render3D(vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - uResolution) / max(uResolution.y, 1.0);
    vec3 rayOrigin = uCameraPosition;
    vec3 rayDirection = normalize(uCameraMatrix * vec3(uv, 1.45));
    float totalDistance = 0.0;
    float trap = 1.0;
    float hit = 0.0;
    vec3 p = rayOrigin;

    for (int i = 0; i < 260; i++) {
      if (i >= uRaySteps) break;
      p = rayOrigin + rayDirection * totalDistance;
      vec2 result = mapScene(p);
      float distance = result.x;
      trap = min(trap, result.y);
      float epsilon = max(0.00035, totalDistance * 0.00008);
      if (distance < epsilon) { hit = 1.0; break; }
      totalDistance += distance * 0.72;
      if (totalDistance > FAR_PLANE) break;
    }

    if (hit < 0.5) return sky(rayDirection, fragCoord);
    vec3 normal = estimateNormal(p);
    vec3 sunDirection = normalize(vec3(-0.45, 0.72, 0.38));
    vec3 rimDirection = normalize(vec3(0.6, 0.15, -0.8));
    float diffuse = max(dot(normal, sunDirection), 0.0);
    float rim = pow(max(1.0 - dot(normal, -rayDirection), 0.0), 2.4);
    float backLight = max(dot(normal, rimDirection), 0.0) * 0.35;
    float ao = ambientOcclusion(p, normal);
    float detail = exp(-11.0 * trap);
    vec3 base = palette(fract(detail * 0.7 + totalDistance * 0.018 + uPalette * 0.12), 0.12 + uPalette * 0.04);
    vec3 color = base * (0.14 + diffuse * 1.05 + backLight) * ao;
    color += vec3(0.22, 0.48, 0.72) * rim * 0.55;
    color += base * detail * 0.28;
    float fog = 1.0 - exp(-totalDistance * 0.032);
    return mix(color, sky(rayDirection, fragCoord), fog);
  }

  void main() {
    vec2 fragCoord = vUv * uResolution;
    vec3 color = uDimension == 0 ? render2D(fragCoord) : render3D(fragCoord);
    color = vec3(1.0) - exp(-color * max(uExposure, 0.1));
    color = pow(max(color, 0.0), vec3(0.92));
    float vignette = smoothstep(1.25, 0.18, length(vUv - 0.5));
    color *= 0.78 + 0.22 * vignette;
    gl_FragColor = vec4(color, 1.0);
  }
`;
