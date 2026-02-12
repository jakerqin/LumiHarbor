import * as THREE from 'three';

/** 经纬度转 3D 球面坐标 */
export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/** 生成两点间的弧线路径（贴合球面） */
export function createArcPoints(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  segments: number = 32
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // 球面线性插值（Slerp）
    const point = new THREE.Vector3().lerpVectors(start, end, t).normalize().multiplyScalar(radius);
    points.push(point);
  }

  return points;
}
