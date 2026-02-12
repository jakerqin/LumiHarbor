'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Footprint } from '@/lib/api/types';
import { FootprintMarker3D } from './FootprintMarker3D';
import { FootprintLine3D } from './FootprintLine3D';

interface Globe3DMapProps {
  footprints: Footprint[];
  onFootprintClick: (footprint: Footprint) => void;
}

export function Globe3DMap({ footprints, onFootprintClick }: Globe3DMapProps) {
  const earthRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1} />
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      {/* 地球 */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial color="#1e3a8a" />
      </mesh>

      {/* 足迹连线 */}
      <FootprintLine3D footprints={footprints} />

      {/* 足迹标记 */}
      {footprints.map((fp) => (
        <FootprintMarker3D
          key={fp.id}
          footprint={fp}
          onClick={onFootprintClick}
        />
      ))}

      <OrbitControls
        enableZoom
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}
