'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Location } from '@/lib/api/types';
import { LocationMarker } from './LocationMarker';

interface Globe3DProps {
  locations: Location[];
  onLocationClick: (location: Location) => void;
}

export function Globe3D({ locations, onLocationClick }: Globe3DProps) {
  const earthRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.001;
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <mesh ref={earthRef} rotation={[0, 0, 0]}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial color="#1e3a8a" />
      </mesh>

      {locations.map((location) => (
        <LocationMarker
          key={location.locationId}
          location={location}
          onClick={() => onLocationClick(location)}
        />
      ))}

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        autoRotate={true}
        autoRotateSpeed={0.5}
      />
    </>
  );
}
