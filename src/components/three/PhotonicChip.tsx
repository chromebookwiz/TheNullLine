"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, Float, PerspectiveCamera, Environment, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

function SphereRelay({ position, color }: { position: [number, number, number], color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    // Subtle breathing effect for WGM
    const scale = 1 + Math.sin(time * 2 + position[0] * 5) * 0.05;
    meshRef.current.scale.set(scale, scale, scale);
  });

  return (
    <group position={position}>
      {/* The WGM Microsphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <MeshTransmissionMaterial 
          backside 
          samples={4} 
          thickness={0.5} 
          chromaticAberration={0.06} 
          anisotropy={0.1} 
          distortion={0.1} 
          distortionScale={0.1} 
          temporalDistortion={0.1} 
          color={color}
          attenuationDistance={0.5}
          attenuationColor={color}
        />
      </mesh>
      
      {/* WGM Glow Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.45, 0.01, 16, 100]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {/* Outer Point Light */}
      <pointLight distance={2} intensity={2} color={color} />
    </group>
  );
}

function ChipBase() {
  return (
    <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <boxGeometry args={[4, 4, 0.1]} />
      <meshStandardMaterial 
        color="#0a0a1a" 
        metalness={0.9} 
        roughness={0.1} 
        envMapIntensity={1}
      />
      {/* Etched Circuits */}
      <gridHelper args={[4, 20, "#7d41ff", "#1a1a3a"]} position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]} />
    </mesh>
  );
}

function E8Topology() {
  const groupRef = useRef<THREE.Group>(null);
  
  // 8 Spheres in a symmetrical "photonic" arrangement
  const spherePositions: [number, number, number][] = useMemo(() => [
    [-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1],
    [0.5, 0.8, 0.5], [-0.5, 0.8, -0.5], [1.5, 0.4, 0], [-1.5, 0.4, 0]
  ], []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
  });

  return (
    <group ref={groupRef}>
      <ChipBase />
      {spherePositions.map((pos, i) => (
        <SphereRelay 
          key={i} 
          position={pos} 
          color={i % 2 === 0 ? "#7d41ff" : "#00d4ff"} 
        />
      ))}
      
      {/* Laser Connections */}
      <group>
        {spherePositions.map((pos, i) => {
          const nextPos = spherePositions[(i + 1) % spherePositions.length];
          return (
            <Line
              key={i}
              points={[pos, nextPos]}
              color="#7d41ff"
              lineWidth={1}
              transparent
              opacity={0.3}
            />
          );
        })}
      </group>
    </group>
  );
}

export default function PhotonicChip() {
  return (
    <div className="w-full h-full relative">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 3, 6]} fov={35} />
        <ambientLight intensity={1} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={10} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={5} />
        
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <E8Topology />
        </Float>
        
        <Environment preset="city" />
      </Canvas>
      
      {/* Label Overlay */}
      <div className="absolute bottom-4 left-4 glass px-3 py-1 rounded-full text-[10px] uppercase tracking-widest opacity-60 pointer-events-none">
        Null Sphere Computer v1.0 | Photonic Interposer
      </div>
    </div>
  );
}
