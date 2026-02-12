'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Footprint } from '@/lib/api/types';
import { latLngToVector3 } from '@/lib/utils/geo';

interface FootprintMarker3DProps {
  footprint: Footprint;
  onClick: (footprint: Footprint) => void;
}

export function FootprintMarker3D({ footprint, onClick }: FootprintMarker3DProps) {
  const markerRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = latLngToVector3(footprint.latitude, footprint.longitude, 2.02);

  useFrame(({ clock }) => {
    if (markerRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
      markerRef.current.scale.setScalar(hovered ? scale * 1.5 : scale);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={markerRef}
        onClick={() => onClick(footprint)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshBasicMaterial
          color={hovered ? '#ffffff' : '#3b82f6'}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        intensity={hovered ? 2 : 1}
        distance={0.5}
        color="#3b82f6"
      />
    </group>
  );
}
