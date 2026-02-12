'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Footprint } from '@/lib/api/types';
import { latLngToVector3, createArcPoints } from '@/lib/utils/geo';

interface FootprintLine3DProps {
  footprints: Footprint[];
}

/** 3D 足迹连线（球面弧线） */
export function FootprintLine3D({ footprints }: FootprintLine3DProps) {
  const linePoints = useMemo(() => {
    if (footprints.length < 2) return [];

    const allPoints: THREE.Vector3[] = [];
    const radius = 2.02; // 略高于球面，避免穿模

    for (let i = 0; i < footprints.length - 1; i++) {
      const start = latLngToVector3(footprints[i].latitude, footprints[i].longitude, radius);
      const end = latLngToVector3(footprints[i + 1].latitude, footprints[i + 1].longitude, radius);
      const arcPoints = createArcPoints(start, end, radius, 32);

      // 避免重复添加起点（除了第一段）
      if (i === 0) {
        allPoints.push(...arcPoints);
      } else {
        allPoints.push(...arcPoints.slice(1));
      }
    }

    return allPoints;
  }, [footprints]);

  if (linePoints.length < 2) return null;

  const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
  const material = new THREE.LineBasicMaterial({
    color: '#3b82f6',
    transparent: true,
    opacity: 0.6,
  });
  const lineObj = new THREE.Line(geometry, material);

  return <primitive object={lineObj} />;
}
