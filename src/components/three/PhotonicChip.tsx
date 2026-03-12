"use client";

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Float, Sphere, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

const NUM_PARTICLES = 600;

// Mapping numbers to geometric "perfect" orbits
function getOrbit(value: number) {
  const q = Math.max(3, Math.min(Math.round(value), 64)); 
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
  const pointsRef = useRef<THREE.Points>(null);
  const lineRef = useRef<THREE.Line>(null);
  const segmentsRef = useRef<THREE.LineSegments>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  
  const radius = 2.0;

  // Persistent particle data
  const particles = useMemo(() => {
    const pnts = [];
    const velocities = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
        pnts.push(new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        ));
        velocities.push(new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        ));
    }
    return { pnts, velocities };
  }, []);

  // Target shape vertices $\{q/p\}$
  const targetVertices = useMemo(() => {
    const verts: THREE.Vector3[] = [];
    for (let i = 0; i <= q; i++) {
        const angle = (i * p * 2 * Math.PI) / q;
        verts.push(new THREE.Vector3(
            radius * Math.cos(angle),
            radius * Math.sin(angle),
            0
        ));
    }
    return verts;
  }, [q, p, radius]);

  // Type-safe Three.js Objects to avoid SVG conflicts
  const mainLine = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(128 * 3), 3));
    const mat = new THREE.LineBasicMaterial({ color: 'white', transparent: true, opacity: 0 });
    return new THREE.Line(geo, mat);
  }, []);

  const beamSegments = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(128 * 3 * 2), 3));
    const mat = new THREE.LineBasicMaterial({ color: 'white', transparent: true, opacity: 0 });
    return new THREE.LineSegments(geo, mat);
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const positions = pointsRef.current?.geometry.attributes.position.array as Float32Array;

    const lerpSpeed = isSolving ? 0.02 : 0.1;

    for (let i = 0; i < NUM_PARTICLES; i++) {
      const particle = particles.pnts[i];
      const vel = particles.velocities[i];

      if (isSolving) {
        // Chaos swarm logic
        particle.add(vel);
        
        // Bounce off sphere wall (radius=2)
        if (particle.length() > radius) {
            particle.normalize().multiplyScalar(radius);
            vel.reflect(particle.clone().normalize()).multiplyScalar(0.9);
        }
        
        // Small random perturbations
        vel.x += (Math.random() - 0.5) * 0.005;
        vel.y += (Math.random() - 0.5) * 0.005;
        vel.z += (Math.random() - 0.5) * 0.005;
        vel.clampLength(0, 0.05);

      } else {
        // Topological collapse to shape vertices
        const target = targetVertices[i % targetVertices.length];
        particle.lerp(target, lerpSpeed);
      }

      // Update BufferAttributes for points
      if (positions) {
        positions[i * 3] = particle.x;
        positions[i * 3 + 1] = particle.y;
        positions[i * 3 + 2] = particle.z;
      }
    }

    if (pointsRef.current) pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Update the ray paths only when collapsed
    if (lineRef.current) {
        const linePos = lineRef.current.geometry.attributes.position.array as Float32Array;
        const opacityTarget = isSolving ? 0 : 0.6;
        (lineRef.current.material as THREE.LineBasicMaterial).opacity += (opacityTarget - (lineRef.current.material as THREE.LineBasicMaterial).opacity) * 0.1;
        
        if (!isSolving) {
            for (let i = 0; i <= q; i++) {
                const pnt = particles.pnts[i];
                linePos[i * 3] = pnt.x;
                linePos[i * 3 + 1] = pnt.y;
                linePos[i * 3 + 2] = pnt.z;
            }
            lineRef.current.geometry.setDrawRange(0, q + 1);
            lineRef.current.geometry.attributes.position.needsUpdate = true;
        }
    }

    // Update the intersection beams only when collapsed
    if (segmentsRef.current) {
        const segPos = segmentsRef.current.geometry.attributes.position.array as Float32Array;
        const opacityTarget = isSolving ? 0 : 0.1;
        (segmentsRef.current.material as THREE.LineBasicMaterial).opacity += (opacityTarget - (segmentsRef.current.material as THREE.LineBasicMaterial).opacity) * 0.1;

        if (!isSolving) {
            for (let i = 0; i < q; i++) {
                const pnt = particles.pnts[i];
                // Start at origin
                segPos[i * 6] = 0;
                segPos[i * 6 + 1] = 0;
                segPos[i * 6 + 2] = 0;
                // End at point
                segPos[i * 6 + 3] = pnt.x;
                segPos[i * 6 + 4] = pnt.y;
                segPos[i * 6 + 5] = pnt.z;
            }
            segmentsRef.current.geometry.setDrawRange(0, q * 2);
            segmentsRef.current.geometry.attributes.position.needsUpdate = true;
        }
    }

    // Core pulsing
    if (coreRef.current) {
      const s = isSolving ? 0.8 + Math.sin(t * 20) * 0.2 : 0.3;
      coreRef.current.scale.setScalar(s);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = isSolving ? 0.6 + Math.sin(t * 30) * 0.2 : 0.15;
    }
  });

  return (
    <group>
      {/* The Particle Swarm */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={NUM_PARTICLES}
            array={new Float32Array(NUM_PARTICLES * 3)}
            itemSize={3}
            args={[new Float32Array(NUM_PARTICLES * 3), 3]}
          />
        </bufferGeometry>
        <PointMaterial 
            transparent 
            color="white" 
            size={0.035} 
            sizeAttenuation={true} 
            depthWrite={false} 
        />
      </points>

      {/* The Billiard Rays (collapsed state) */}
      <primitive object={mainLine} ref={lineRef} />

      {/* The Intersection Beams (collapsed state) */}
      <primitive object={beamSegments} ref={segmentsRef} />

      {/* Boundary Sphere */}
      <Sphere args={[radius, 32, 32]}>
        <meshBasicMaterial color="white" transparent opacity={0.03} wireframe />
      </Sphere>

      {/* Central Intersection Core */}
      <Sphere ref={coreRef} args={[0.2, 16, 16]}>
        <meshBasicMaterial color="white" transparent opacity={0.2} />
      </Sphere>

      <pointLight intensity={isSolving ? 1.5 : 0.4} />
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
    }, 2500); // Slightly longer for "collapse" impact
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-black overflow-hidden">
      <div className="flex-1 w-full scale-125 md:scale-110">
        <Canvas gl={{ antialias: false, powerPreference: "high-performance" }} dpr={[1, 1.5]}>
          <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={25} />
          <OrbitControls 
            enablePan={false} 
            autoRotate={!isSolving} 
            autoRotateSpeed={0.5} 
            minDistance={4}
            maxDistance={12}
          />
          <ambientLight intensity={0.5} />
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
            <RaySystem q={orbit.q} p={orbit.p} isSolving={isSolving} />
          </Float>
        </Canvas>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 flex flex-col items-center gap-6 bg-black/95 border-t border-white/5 backdrop-blur-2xl">
        <form onSubmit={handleSolve} className="w-full max-w-sm relative group">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="◊.ENTER_EQUATION"
            className="w-full bg-transparent border-b border-white/10 py-3 px-1 text-[11px] uppercase tracking-[0.5em] text-white focus:outline-none focus:border-white/40 transition-all text-center placeholder:opacity-20"
          />
          <button 
            type="submit"
            disabled={isSolving}
            className="absolute right-0 bottom-3 text-[9px] text-white/30 hover:text-white transition-colors tracking-[0.3em] font-bold disabled:opacity-20"
          >
            {isSolving ? "[SOLVING]" : "[EXEC]"}
          </button>
        </form>

        <div className="flex items-center gap-8 md:gap-14">
            <div className="flex flex-col items-center">
              <div className="text-[7px] tracking-[0.4em] text-white/20 uppercase mb-1">Status</div>
              <div className="text-[9px] tracking-[0.2em] text-white/60 uppercase font-mono">{isSolving ? "WAVE_SWARM" : "PERIODIC_SNAP"}</div>
            </div>
            
            {result !== null && (
                <div className="flex flex-col items-center border-x border-white/10 px-6 md:px-10">
                  <div className="text-[7px] tracking-[0.4em] text-white/20 uppercase mb-1">Collapse_Value</div>
                  <div className="text-[12px] tracking-[0.2em] text-white font-mono font-bold">{result}</div>
                </div>
            )}

            <div className="flex flex-col items-center">
              <div className="text-[7px] tracking-[0.4em] text-white/20 uppercase mb-1">Topology</div>
              <div className="text-[9px] tracking-[0.2em] text-white/60 uppercase font-mono">{orbit.q}:{orbit.p}</div>
            </div>
        </div>
      </div>
    </div>
  );
}
