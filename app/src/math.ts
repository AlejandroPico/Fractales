import * as THREE from 'three';

export function splitFloat64(value: number): [number, number] {
  const high = Math.fround(value);
  return [high, value - high];
}

export function formatScientific(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e5 || abs < 1e-4) return value.toExponential(digits);
  return value.toFixed(Math.min(8, Math.max(0, digits + 2)));
}

export function mandelbulbDistance(point: THREE.Vector3, power = 8, juliaOffset?: THREE.Vector3): number {
  const z = point.clone();
  let derivative = 1;
  let radius = 0;

  for (let i = 0; i < 18; i += 1) {
    radius = z.length();
    if (radius > 4) break;
    const safeRadius = Math.max(radius, 1e-9);
    let theta = Math.acos(THREE.MathUtils.clamp(z.z / safeRadius, -1, 1));
    let phi = Math.atan2(z.y, z.x);
    derivative = Math.pow(safeRadius, power - 1) * power * derivative + 1;
    const powered = Math.pow(safeRadius, power);
    theta *= power;
    phi *= power;
    z.set(
      powered * Math.sin(theta) * Math.cos(phi),
      powered * Math.sin(theta) * Math.sin(phi),
      powered * Math.cos(theta)
    );
    z.add(point);
    if (juliaOffset) z.add(juliaOffset);
  }

  return Math.abs(0.5 * Math.log(Math.max(radius, 1e-9)) * radius / Math.max(derivative, 1e-9));
}

export function mandelboxDistance(point: THREE.Vector3): number {
  const z = new THREE.Vector4(point.x, point.y, point.z, 1);
  const offset = z.clone();
  const scale = -1.78;
  const minRadius2 = 0.25;
  const fixedRadius2 = 1;

  for (let i = 0; i < 16; i += 1) {
    z.x = THREE.MathUtils.clamp(z.x, -1, 1) * 2 - z.x;
    z.y = THREE.MathUtils.clamp(z.y, -1, 1) * 2 - z.y;
    z.z = THREE.MathUtils.clamp(z.z, -1, 1) * 2 - z.z;
    const radius2 = z.x * z.x + z.y * z.y + z.z * z.z;
    if (radius2 < minRadius2) z.multiplyScalar(fixedRadius2 / minRadius2);
    else if (radius2 < fixedRadius2) z.multiplyScalar(fixedRadius2 / radius2);
    z.multiplyScalar(scale).add(offset);
  }

  return Math.abs((Math.hypot(z.x, z.y, z.z) - Math.abs(scale - 1)) / Math.max(Math.abs(z.w), 1e-9));
}

export function mengerDistance(point: THREE.Vector3): number {
  const p = point.clone();
  let d = boxDistance(p, new THREE.Vector3(1.35, 1.35, 1.35));
  let scale = 1;

  for (let i = 0; i < 8; i += 1) {
    const ax = mod(p.x * scale, 2) - 1;
    const ay = mod(p.y * scale, 2) - 1;
    const az = mod(p.z * scale, 2) - 1;
    scale *= 3;
    const rx = Math.abs(1 - 3 * Math.abs(ax));
    const ry = Math.abs(1 - 3 * Math.abs(ay));
    const rz = Math.abs(1 - 3 * Math.abs(az));
    const c = (Math.min(Math.max(rx, ry), Math.max(ry, rz), Math.max(rz, rx)) - 1) / scale;
    d = Math.max(d, c);
  }

  return Math.abs(d);
}

export function sierpinskiDistance(point: THREE.Vector3): number {
  const p = point.clone();
  const vertices = [
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(-1, -1, 1),
    new THREE.Vector3(-1, 1, -1),
    new THREE.Vector3(1, -1, -1)
  ];
  let scale = 1;

  for (let i = 0; i < 11; i += 1) {
    let nearest = vertices[0]!;
    let nearestDistance = p.distanceToSquared(nearest);
    for (let j = 1; j < vertices.length; j += 1) {
      const distance = p.distanceToSquared(vertices[j]!);
      if (distance < nearestDistance) {
        nearest = vertices[j]!;
        nearestDistance = distance;
      }
    }
    p.sub(nearest).multiplyScalar(2);
    scale *= 2;
  }

  return Math.abs((p.length() - 1.15) / scale);
}

export function apollonianDistance(point: THREE.Vector3): number {
  const p = point.clone();
  let scale = 1;
  for (let i = 0; i < 9; i += 1) {
    p.set(mod(p.x + 1, 2) - 1, mod(p.y + 1, 2) - 1, mod(p.z + 1, 2) - 1);
    const radius2 = Math.max(p.lengthSq(), 0.04);
    const factor = 1.35 / radius2;
    p.multiplyScalar(factor);
    scale *= factor;
  }
  return Math.abs((p.length() - 1) / Math.max(scale, 1e-8));
}

export function amazingSurfaceDistance(point: THREE.Vector3): number {
  const p = point.clone();
  let derivative = 1;
  for (let i = 0; i < 14; i += 1) {
    p.x = THREE.MathUtils.clamp(p.x, -1, 1) * 2 - p.x;
    p.y = THREE.MathUtils.clamp(p.y, -1, 1) * 2 - p.y;
    const radius2 = Math.max(p.x * p.x + p.y * p.y, 0.12);
    const factor = THREE.MathUtils.clamp(1.2 / radius2, 0.75, 4);
    p.multiplyScalar(factor);
    derivative *= factor;
    p.multiplyScalar(1.72).add(point);
    derivative = derivative * 1.72 + 1;
  }
  return Math.abs((Math.hypot(p.x, p.y) - 0.55) / Math.max(derivative, 1e-8));
}

export function kaleidoscopicDistance(point: THREE.Vector3): number {
  const p = point.clone();
  let scale = 1;
  for (let i = 0; i < 12; i += 1) {
    p.set(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z));
    if (p.x < p.y) [p.x, p.y] = [p.y, p.x];
    if (p.x < p.z) [p.x, p.z] = [p.z, p.x];
    if (p.y < p.z) [p.y, p.z] = [p.z, p.y];
    p.multiplyScalar(1.82).sub(new THREE.Vector3(1.12, 0.72, 0.54));
    scale *= 1.82;
  }
  return Math.abs((p.length() - 0.22) / scale);
}

export function estimateSceneDistance(shaderId: number, point: THREE.Vector3, power: number): number {
  switch (shaderId) {
    case 100: return mandelbulbDistance(point, Math.max(power, 2));
    case 101: return mandelboxDistance(point);
    case 102: return mengerDistance(point);
    case 103: return mandelbulbDistance(point, Math.max(power, 2), new THREE.Vector3(-0.18, 0.08, 0.03));
    case 104: return sierpinskiDistance(point);
    case 105: return apollonianDistance(point);
    case 106: return amazingSurfaceDistance(point);
    case 107: return kaleidoscopicDistance(point);
    default: return mandelbulbDistance(point, 8);
  }
}

function boxDistance(point: THREE.Vector3, bounds: THREE.Vector3): number {
  const q = point.clone();
  q.set(Math.abs(q.x), Math.abs(q.y), Math.abs(q.z)).sub(bounds);
  return new THREE.Vector3(Math.max(q.x, 0), Math.max(q.y, 0), Math.max(q.z, 0)).length() + Math.min(Math.max(q.x, q.y, q.z), 0);
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
