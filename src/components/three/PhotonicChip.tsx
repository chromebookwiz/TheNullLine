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
  const coreRef = useRef<THREE.Mesh>(null);
  const targetPoints = useMemo(() => {
    const pnts: THREE.Vector3[] = [];
    const radius = 1.5;
    for (let i = 0; i <= q; i++) {
        const angle = (i * p * 2 * Math.PI) / q;
        pnts.push(new THREE.Vector3(
            radius * Math.cos(angle),
            radius * Math.sin(angle),
            radius * Math.sin(angle * 0.5) * 0.1 
        ));
    }
    return pnts;
  }, [q, p]);

  // Current points that will lerp to targetPoints
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>(targetPoints);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (groupRef.current) {
        const speed = isSolving ? 0.3 : 0.05;
        groupRef.current.rotation.y += speed * 0.1;
    }

    if (coreRef.current) {
      const coreScale = isSolving ? 1 + Math.sin(t * 20) * 0.2 : 0.4;
      coreRef.current.scale.setScalar(coreScale);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = isSolving ? 0.8 + Math.sin(t * 30) * 0.2 : 0.3;
    }

    // Smoothed transition
    const lerpSpeed = isSolving ? 0.02 : 0.15;
    const newPoints = targetPoints.map((target, i) => {
      const current = currentPoints[i] || new THREE.Vector3();
      
      // If solving, add chaotic jitter
      if (isSolving) {
        const noise = new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        );
        return current.clone().lerp(target.clone().add(noise), 0.1);
      }
      
      return current.clone().lerp(target, lerpSpeed);
    });
    setCurrentPoints(newPoints);
  });

  return (
    <group ref={groupRef}>
      {/* The Whisper Gallery Sphere */}
      <Sphere args={[2, 64, 64]}>
        <meshPhysicalMaterial 
          color="white" 
          transparent 
          opacity={0.03} 
          transmission={0.95}
          thickness={0.5}
          roughness={0}
        />
      </Sphere>

      {/* Internal Intersection Beams */}
      {currentPoints.slice(0, q).map((pnt, i) => (
        <Line
          key={`beam-${i}`}
          points={[new THREE.Vector3(0,0,0), pnt]}
          color="white"
          lineWidth={0.5}
          transparent
          opacity={isSolving ? 0.5 : 0.1}
        />
      ))}

      {/* Waveform Trace */}
      <Line
        points={currentPoints}
        color="white" 
        lineWidth={isSolving ? 3 : 1.5}
        transparent
        opacity={isSolving ? 0.9 : 0.5}
      />
      
      {/* Quantized Vertices */}
      {currentPoints.slice(0, q).map((pnt, i) => (
        <Sphere key={i} position={pnt} args={[isSolving ? 0.05 : 0.03, 16, 16]}>
          <meshBasicMaterial color="white" transparent opacity={0.8} />
        </Sphere>
      ))}

      {/* The Intersection Core (The Collapse Point) */}
      <Sphere ref={coreRef} args={[0.15, 32, 32]}>
        <meshBasicMaterial color="white" transparent opacity={0.3} />
      </Sphere>
      
      <pointLight intensity={isSolving ? 2 : 0.5} color="white" />
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
          <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={25} />
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
