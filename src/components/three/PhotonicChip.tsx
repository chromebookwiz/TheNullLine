"use client";

import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';

const MAX_POINTS = 200;
const NUM_RAYS = 5;

function Ray({ seed, speed }: { seed: number, speed: number }) {
  const lineRef = useRef<any>(null);
  
  // Initial state for one ray
  const state = useMemo(() => {
    const pos = new THREE.Vector3(0, 0, 0);
    // Random direction but weighted to create interesting orbits
    const dir = new THREE.Vector3(
      Math.sin(seed * 1.5), 
      Math.cos(seed * 2.1), 
      Math.sin(seed * 0.7)
    ).normalize();
    
    return { pos, dir, points: [pos.clone()] };
  }, [seed]);

  useFrame(() => {
    if (!lineRef.current) return;

    // Movement
    const step = speed;
    state.pos.add(state.dir.clone().multiplyScalar(step));

    // Collision check with sphere (radius 2)
    const radius = 2;
    if (state.pos.length() >= radius) {
      // Intersection point (approximate for simplicity)
      state.pos.setLength(radius);
      
      // Reflect dir: V' = V - 2(V.N)N
      const normal = state.pos.clone().normalize();
      const dot = state.dir.dot(normal);
      state.dir.sub(normal.multiplyScalar(2 * dot)).normalize();
      
      // Store point
      state.points.push(state.pos.clone());
      if (state.points.length > MAX_POINTS) state.points.shift();
      
      // Update geometry
      if (lineRef.current?.geometry) {
        lineRef.current.geometry.setFromPoints(state.points);
      }
    }
  });

  return (
    <Line
      ref={lineRef}
      points={state.points}
      color="white"
      lineWidth={0.5}
      transparent
      opacity={0.4}
    />
  );
}

function BilliardSystem() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
      groupRef.current.rotation.z = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* The Boundary Sphere */}
      <Sphere args={[2, 32, 32]}>
        <meshBasicMaterial 
          color="white" 
          transparent 
          opacity={0.03} 
          wireframe 
        />
      </Sphere>

      {/* Symmetrical Orbit Rays */}
      {Array.from({ length: NUM_RAYS }).map((_, i) => (
        <Ray key={i} seed={i + 1} speed={0.15} />
      ))}

      {/* Center Core Dot */}
      <Sphere args={[0.02, 16, 16]}>
        <meshBasicMaterial color="white" />
      </Sphere>
    </group>
  );
}

export default function PhotonicChip() {
  return (
    <Canvas dpr={[1, 2]}>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={35} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      <BilliardSystem />
      
      <Environment preset="night" />
    </Canvas>
  );
}
