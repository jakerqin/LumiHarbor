'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Location } from '@/lib/api/types';

interface LocationMarkerProps {
  location: Location;
  onClick: () => void;
}

function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

export function LocationMarker({ location, onClick }: LocationMarkerProps) {
  const markerRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = latLngToVector3(
    location.latitude,
    location.longitude,
    2.02
  );

  useFrame(({ clock }) => {
    if (markerRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
      markerRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={markerRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.02, 16, 16]} />
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
