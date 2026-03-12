"use client";

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Sphere, Line, OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';

const MAX_POINTS = 400;

// Mapping numbers to geometric "perfect" orbits
function getOrbit(value: number) {
  // Simplistic mapping: q = value + some base symmetry
  // For p, we pick something that looks "esoteric" but stable
  const q = Math.max(3, Math.round(value));
  let p = 1;
  for (let i = Math.floor(q / 2); i > 0; i--) {
    if (gcd(q, i) === 1) {
      p = i;
      break;
    }
  }
  return { q, p };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function RaySystem({ q, p, isSolving }: { q: number, p: number, isSolving: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  
  const points = useMemo(() => {
    const pnts: THREE.Vector3[] = [];
    const radius = 2;
    // We draw the star polygon path
    for (let i = 0; i <= q * 2; i++) {
        const angle = (i * p * 2 * Math.PI) / q;
        pnts.push(new THREE.Vector3(
            radius * Math.cos(angle),
            radius * Math.sin(angle),
            radius * Math.sin(angle * 0.5) * 0.1 
        ));
    }
    return pnts;
  }, [q, p]);

  useFrame((state) => {
    if (groupRef.current) {
        // Solving phase: faster rotation
        const speed = isSolving ? 0.5 : 0.05;
        groupRef.current.rotation.y += speed * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <Sphere args={[2, 64, 64]}>
        <meshPhysicalMaterial 
          color="white" 
          transparent 
          opacity={0.05} 
          transmission={0.9}
          thickness={1}
          roughness={0}
        />
      </Sphere>
      
      <Line
        points={points}
        color="white" 
        lineWidth={isSolving ? 2 : 1}
        transparent
        opacity={isSolving ? 0.9 : 0.4}
      />
      
      {points.slice(0, q).map((pnt, i) => (
        <Sphere key={i} position={pnt} args={[isSolving ? 0.04 : 0.02, 16, 16]}>
          <meshBasicMaterial color="white" />
        </Sphere>
      ))}
    </group>
  );
}

export default function PhotonicComputer() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [orbit, setOrbit] = useState({ q: 8, p: 3 });

  const handleSolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;

    setIsSolving(true);
    
    // Attempt to evaluate simple math
    setTimeout(() => {
      try {
        // Safe evaluation of simple arithmetic
        const sanitized = input.replace(/[^-+*/().0-9]/g, '');
        // eslint-disable-next-line no-eval
        const val = eval(sanitized);
        const num = parseFloat(val);
        if (!isNaN(num)) {
          setResult(num);
          setOrbit(getOrbit(num));
        }
      } catch (err) {
        console.error("Math error", err);
      }
      setIsSolving(false);
    }, 1500); 
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center">
      <div className="flex-1 w-full">
        <Canvas dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={35} />
          <OrbitControls enablePan={false} autoRotate={!isSolving} autoRotateSpeed={0.5} />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          
          <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
            <RaySystem q={orbit.q} p={orbit.p} isSolving={isSolving} />
          </Float>
          
          <Environment preset="night" />
        </Canvas>
      </div>

      {/* Symbolic Console Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col items-center gap-4 bg-black/80 border-t border-white/10 backdrop-blur-md">
        <form onSubmit={handleSolve} className="w-full max-w-xs relative">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="◊.ENTER_EQUATION"
            className="w-full bg-transparent border-b border-white/20 py-2 px-1 text-[10px] uppercase tracking-[0.4em] text-white focus:outline-none focus:border-white transition-colors"
          />
          <button 
            type="submit"
            className="absolute right-0 bottom-2 text-[10px] text-white/40 hover:text-white transition-colors tracking-widest"
          >
            [EXEC]
          </button>
        </form>

        <div className="flex items-center gap-6">
            <div className="text-[8px] tracking-[0.5em] text-white/20 uppercase">
                Status: {isSolving ? "◊.SOLVING" : "◊.IDLE"}
            </div>
            {result !== null && (
                <div className="text-[10px] tracking-[0.4em] text-white uppercase border-l border-white/20 pl-6">
                    Res: {result}
                </div>
            )}
            <div className="text-[8px] tracking-[0.5em] text-white/20 uppercase">
                Orbit: {orbit.q}/{orbit.p}
            </div>
        </div>
      </div>
    </div>
  );
}
