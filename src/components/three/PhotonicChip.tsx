"use client";

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Sphere, Line, OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';

const MAX_POINTS = 500; // Fixed buffer size

// Mapping numbers to geometric "perfect" orbits
function getOrbit(value: number) {
  const q = Math.max(3, Math.min(Math.round(value), 64)); // Clamp for safety
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

const RaySystem = React.memo(function RaySystem({ q, p, isSolving }: { q: number, p: number, isSolving: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<any>(null);
  const verticesRef = useRef<THREE.Group>(null);
  const beamsRef = useRef<THREE.Group>(null);

  // Constants for geometry
  const radius = 1.5;

  // We maintain a persistent array of points for the "current" state
  const currentPoints = useMemo(() => {
    const pnts = [];
    for (let i = 0; i < MAX_POINTS; i++) pnts.push(new THREE.Vector3(0, 0, 0));
    return pnts;
  }, []);

  // Targets are calculated only when q/p changes
  const targetPoints = useMemo(() => {
    const pnts: THREE.Vector3[] = [];
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

  // Search Phase state
  const searchState = useRef({ q, p, lastUpdate: 0 });

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // 1. Update Search Phase (Logic only, no react state)
    if (isSolving && t - searchState.current.lastUpdate > 0.1) {
      searchState.current.q = Math.floor(Math.random() * 20) + 3;
      searchState.current.p = Math.floor(Math.random() * 8) + 1;
      searchState.current.lastUpdate = t;
    }

    // 2. Derive Current Target (search vs real)
    let activeTarget = targetPoints;
    if (isSolving) {
      const sq = searchState.current.q;
      const sp = searchState.current.p;
      activeTarget = [];
      for (let i = 0; i <= sq; i++) {
        const angle = (i * sp * 2 * Math.PI) / sq;
        activeTarget.push(new THREE.Vector3(radius * Math.cos(angle), radius * Math.sin(angle), 0));
      }
    }

    // 3. Smoothly animate points (Direct Manipulation)
    const lerpSpeed = isSolving ? 0.3 : 0.1;
    for (let i = 0; i < MAX_POINTS; i++) {
      const target = activeTarget[i % activeTarget.length];
      const current = currentPoints[i];
      
      if (isSolving) {
        const jitter = (Math.random() - 0.5) * 0.15;
        current.x += (target.x + jitter - current.x) * lerpSpeed;
        current.y += (target.y + jitter - current.y) * lerpSpeed;
        current.z += (target.z + jitter - current.z) * lerpSpeed;
      } else {
        current.x += (target.x - current.x) * lerpSpeed;
        current.y += (target.y - current.y) * lerpSpeed;
        current.z += (target.z - current.z) * lerpSpeed;
      }
    }

    // 4. Update Line Geometry (Directly)
    if (lineRef.current) {
      const positions = lineRef.current.geometry.attributes.position.array;
      for (let i = 0; i < activeTarget.length; i++) {
        positions[i * 3] = currentPoints[i].x;
        positions[i * 3 + 1] = currentPoints[i].y;
        positions[i * 3 + 2] = currentPoints[i].z;
      }
      lineRef.current.geometry.setDrawRange(0, activeTarget.length);
      lineRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // 5. Update Vertices (Directly)
    if (verticesRef.current) {
      verticesRef.current.children.forEach((child, i) => {
        if (i < activeTarget.length - 1) {
          child.visible = true;
          child.position.copy(currentPoints[i]);
          (child as any).scale.setScalar(isSolving ? 1.5 : 1.0);
        } else {
          child.visible = false;
        }
      });
    }

    // 6. Update Beams (Directly)
    if (beamsRef.current) {
      beamsRef.current.children.forEach((child, i) => {
        if (i < activeTarget.length - 1) {
          child.visible = true;
          const pos = (child as any).geometry.attributes.position.array;
          pos[3] = currentPoints[i].x;
          pos[4] = currentPoints[i].y;
          pos[5] = currentPoints[i].z;
          (child as any).geometry.attributes.position.needsUpdate = true;
        } else {
          child.visible = false;
        }
      });
    }

    // 7. Core & Rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += (isSolving ? 0.05 : 0.005);
    }
    if (coreRef.current) {
      const s = isSolving ? 1 + Math.sin(t * 30) * 0.3 : 0.4;
      coreRef.current.scale.setScalar(s);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = isSolving ? 0.7 + Math.sin(t * 50) * 0.3 : 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer Shell - Very faint for performance */}
      <Sphere args={[2, 32, 32]}>
        <meshBasicMaterial color="white" transparent opacity={0.01} wireframe />
      </Sphere>

      {/* Main Waveform Line - Pre-allocated buffer */}
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={MAX_POINTS}
            array={new Float32Array(MAX_POINTS * 3)}
            itemSize={3}
            args={[new Float32Array(MAX_POINTS * 3), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="white" transparent opacity={0.8} linewidth={2} />
      </line>

      {/* Quantized Vertices Group */}
      <group ref={verticesRef}>
        {Array.from({ length: 64 }).map((_, i) => (
          <Sphere key={i} args={[0.03, 8, 8]}>
            <meshBasicMaterial color="white" transparent opacity={0.6} />
          </Sphere>
        ))}
      </group>

      {/* Intersection Beams Group */}
      <group ref={beamsRef}>
        {Array.from({ length: 64 }).map((_, i) => (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([0, 0, 0, 0, 0, 0])}
                itemSize={3}
                args={[new Float32Array([0, 0, 0, 0, 0, 0]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="white" transparent opacity={0.1} />
          </line>
        ))}
      </group>

      {/* The Collapse Core */}
      <Sphere ref={coreRef} args={[0.15, 16, 16]}>
        <meshBasicMaterial color="white" transparent opacity={0.3} />
      </Sphere>

      <pointLight intensity={isSolving ? 1.5 : 0.5} />
    </group>
  );
});

export default function PhotonicComputer() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [orbit, setOrbit] = useState({ q: 8, p: 3 });

  const handleSolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || isSolving) return;

    setIsSolving(true);
    setTimeout(() => {
      try {
        const sanitized = input.replace(/[^-+*/().0-9]/g, '');
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
    }, 2000); 
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-black overflow-hidden">
      <div className="flex-1 w-full scale-125 md:scale-100">
        <Canvas gl={{ antialias: false, powerPreference: "high-performance" }} dpr={[1, 1.5]}>
          <PerspectiveCamera makeDefault position={[0, 0, 9]} fov={25} />
          <OrbitControls enablePan={false} autoRotate={!isSolving} autoRotateSpeed={0.5} />
          <ambientLight intensity={0.4} />
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <RaySystem q={orbit.q} p={orbit.p} isSolving={isSolving} />
          </Float>
        </Canvas>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 flex flex-col items-center gap-6 bg-black/95 border-t border-white/5 backdrop-blur-2xl">
        <form onSubmit={handleSolve} className="w-full max-w-sm relative">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="◊.ENTER_EQUATION"
            className="w-full bg-transparent border-b border-white/10 py-3 px-1 text-[11px] uppercase tracking-[0.5em] text-white focus:outline-none focus:border-white/40 transition-all text-center"
          />
          <button 
            type="submit"
            disabled={isSolving}
            className="absolute right-0 bottom-3 text-[9px] text-white/30 hover:text-white transition-colors tracking-[0.3em] font-bold disabled:opacity-20"
          >
            {isSolving ? "[WAIT]" : "[EXEC]"}
          </button>
        </form>

        <div className="flex items-center gap-6 md:gap-12">
            <div className="flex flex-col items-center">
              <div className="text-[7px] tracking-[0.4em] text-white/20 uppercase">Core Status</div>
              <div className="text-[9px] tracking-[0.2em] text-white/60 uppercase">{isSolving ? "◊.COLLAPSING" : "◊.STABLE"}</div>
            </div>
            
            {result !== null && (
                <div className="flex flex-col items-center border-x border-white/10 px-6 md:px-10">
                  <div className="text-[7px] tracking-[0.4em] text-white/20 uppercase">Resultant</div>
                  <div className="text-[11px] tracking-[0.2em] text-white font-bold">{result}</div>
                </div>
            )}

            <div className="flex flex-col items-center">
              <div className="text-[7px] tracking-[0.4em] text-white/20 uppercase">Manifold</div>
              <div className="text-[9px] tracking-[0.2em] text-white/60 uppercase">{orbit.q}:{orbit.p}</div>
            </div>
        </div>
      </div>
    </div>
  );
}
