"use client";

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Sphere, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, Zap, Cpu, Atom } from 'lucide-react';

const NUM_PARTICLES = 1000;

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
  const groupRef = useRef<THREE.Group>(null);
  
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
        // Null rays: velocity vector magnitude is strictly part of the null condition
        const v = new THREE.Vector3(
            (Math.random() - 0.5),
            (Math.random() - 0.5),
            (Math.random() - 0.5)
        ).normalize().multiplyScalar(0.08); // Fixed "speed of light" for the simulation
        velocities.push(v);
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

  // Pre-calculate line segments for the "flow-in" effect
  const raySegments = useMemo(() => {
    const segs: { start: THREE.Vector3, end: THREE.Vector3 }[] = [];
    for (let i = 0; i < q; i++) {
        segs.push({ start: targetVertices[i], end: targetVertices[i+1] });
    }
    return segs;
  }, [q, targetVertices]);

  // Type-safe Three.js Objects to avoid SVG conflicts
  const mainLine = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(256 * 3), 3));
    const mat = new THREE.LineBasicMaterial({ color: 'white', transparent: true, opacity: 0 });
    return new THREE.Line(geo, mat);
  }, []);

  const beamSegments = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(256 * 3 * 2), 3));
    const mat = new THREE.LineBasicMaterial({ color: 'white', transparent: true, opacity: 0 });
    return new THREE.LineSegments(geo, mat);
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const positions = pointsRef.current?.geometry.attributes.position.array as Float32Array;

    const lerpSpeed = isSolving ? 0.03 : 0.08;

    for (let i = 0; i < NUM_PARTICLES; i++) {
      const particle = particles.pnts[i];
      const vel = particles.velocities[i];

      if (isSolving) {
        // NULL RAY DYNAMICS: Constant velocity straight-line segments
        particle.add(vel);
        
        // Specular reflection at R=radius (Boundary Localization)
        if (particle.length() > radius) {
            const normal = particle.clone().normalize();
            particle.copy(normal).multiplyScalar(radius);
            vel.reflect(normal); // Perfect reflection
            // Add slight "wave" jitter to represent probabilistic search
            vel.add(new THREE.Vector3(
                (Math.random()-0.5)*0.01,
                (Math.random()-0.5)*0.01,
                (Math.random()-0.5)*0.01
            )).normalize().multiplyScalar(0.08);
        }
      } else {
        // TOPOLOGICAL COLLAPSE: Snap to Mass M=Q
        const segmentIdx = i % raySegments.length;
        const segment = raySegments[segmentIdx];
        
        let target;
        if (i % 10 < 3) {
          // Snap to vertex (ADE Root Nodes)
          target = targetVertices[segmentIdx];
        } else {
          // "Bleed" along ray path (Null Momentum Alignment)
          const progress = ((i + t * 0.45) % 10) / 10;
          target = new THREE.Vector3().copy(segment.start).lerp(segment.end, progress);
        }
        
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
        const opacityTarget = isSolving ? 0 : 0.4;
        (lineRef.current.material as THREE.LineBasicMaterial).opacity += (opacityTarget - (lineRef.current.material as THREE.LineBasicMaterial).opacity) * 0.05;
        
        if (!isSolving) {
            for (let i = 0; i <= q; i++) {
                const v = targetVertices[i];
                linePos[i * 3] = v.x;
                linePos[i * 3 + 1] = v.y;
                linePos[i * 3 + 2] = v.z;
            }
            lineRef.current.geometry.setDrawRange(0, q + 1);
            lineRef.current.geometry.attributes.position.needsUpdate = true;
        }
    }

    // Update the intersection beams only when collapsed
    if (segmentsRef.current) {
        const segPos = segmentsRef.current.geometry.attributes.position.array as Float32Array;
        const opacityTarget = isSolving ? 0 : 0.05;
        (segmentsRef.current.material as THREE.LineBasicMaterial).opacity += (opacityTarget - (segmentsRef.current.material as THREE.LineBasicMaterial).opacity) * 0.05;

        if (!isSolving) {
            for (let i = 0; i < q; i++) {
                const v = targetVertices[i];
                segPos[i * 6] = 0;
                segPos[i * 6 + 1] = 0;
                segPos[i * 6 + 2] = 0;
                segPos[i * 6 + 3] = v.x;
                segPos[i * 6 + 4] = v.y;
                segPos[i * 6 + 5] = v.z;
            }
            segmentsRef.current.geometry.setDrawRange(0, q * 2);
            segmentsRef.current.geometry.attributes.position.needsUpdate = true;
        }
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += (isSolving ? 0.02 : 0.005);
      groupRef.current.rotation.z += (isSolving ? 0.01 : 0.002);
    }
    
    if (coreRef.current) {
      const s = isSolving ? 0.8 + Math.sin(t * 15) * 0.2 : 0.3;
      coreRef.current.scale.setScalar(s);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = isSolving ? 0.6 + Math.sin(t * 20) * 0.2 : 0.1;
    }
  });

  return (
    <group ref={groupRef}>
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
            size={0.025} 
            sizeAttenuation={true} 
            depthWrite={false} 
            opacity={0.8}
        />
      </points>

      <primitive object={mainLine} ref={lineRef} />
      <primitive object={beamSegments} ref={segmentsRef} />

      <Sphere args={[radius, 32, 32]}>
        <meshBasicMaterial color="white" transparent opacity={0.02} wireframe />
      </Sphere>

      <Sphere ref={coreRef} args={[0.2, 16, 16]}>
        <meshBasicMaterial color="white" transparent opacity={0.15} />
      </Sphere>

      <pointLight intensity={isSolving ? 1.2 : 0.3} color="white" />
    </group>
  );
});

export default function PhotonicComputer() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [orbit, setOrbit] = useState({ q: 8, p: 3 });
  const [showTheory, setShowTheory] = useState(false);

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
    }, 3000); 
  };

  const handleClear = () => {
    setInput("");
    setResult(null);
    setOrbit({ q: 1, p: 1 }); // Reset to unit symmetry (base state)
  };

  const isFree = result === null && !isSolving;

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-black overflow-hidden select-none font-mono">
      {/* 3D Simulation Layer */}
      <div className="flex-1 w-full relative">
        <Canvas gl={{ antialias: false, powerPreference: "high-performance" }} dpr={[1, 1.5]}>
          <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={28} />
          <OrbitControls 
            enablePan={false} 
            autoRotate={!isSolving} 
            autoRotateSpeed={0.4} 
            minDistance={4}
            maxDistance={15}
            enableDamping={true}
            dampingFactor={0.05}
          />
          <ambientLight intensity={0.4} />
          <RaySystem q={orbit.q} p={orbit.p} isSolving={isSolving || isFree} />
        </Canvas>
      </div>

      {/* Theory Overlay Toggle */}
      <button 
        onClick={() => setShowTheory(true)}
        className="absolute top-6 right-6 z-50 p-3 bg-black border border-white/20 text-white/40 hover:text-white hover:border-white/50 transition-all group rounded-full"
        title="Theoretical Framework"
      >
        <Info size={16} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* Scientific Overlay */}
      <AnimatePresence>
        {showTheory && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="absolute inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/60"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl max-h-[85vh] bg-white border border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,0.1)] flex flex-col relative"
            >
              <div className="p-4 border-b border-black flex items-center justify-between bg-black text-white">
                <div className="flex items-center gap-3">
                  <Atom size={16} className="text-white/60" />
                  <span className="text-[10px] tracking-[0.3em] font-bold">◊.THEORETICAL_FRAMEWORK</span>
                </div>
                <button onClick={() => setShowTheory(false)} className="hover:rotate-90 transition-transform">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-10 text-black custom-scrollbar">
                <section>
                  <h3 className="text-[11px] font-bold tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Zap size={12} className="text-black/30" /> 1. PRIMITIVE TOPOLOGY
                  </h3>
                  <p className="text-[10px] leading-6 tracking-wide text-black/60 uppercase">
                    ESTABLISHING THE <span className="text-black font-bold">NULL CONE</span> AS THE LOGICALLY PRIMITIVE STRUCTURE (ZEEMAN, 1964). 
                    COMPUTING IS THE <span className="text-black font-bold">TOPOLOGICAL LOCALIZATION</span> OF NULL MOMENTUM WITHIN 
                    A LORENTZIAN SUBSTRATE. BIJECTIONS PRESERVING THE NULL CONDITION K·K=0 DEFINE THE LOGIC GATES.
                  </p>
                </section>

                <section>
                  <h3 className="text-[11px] font-bold tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Atom size={12} className="text-black/30" /> 2. EMERGENT MASS (M=Q)
                  </h3>
                  <p className="text-[10px] leading-6 tracking-wide text-black/60 uppercase">
                    PHOTONS TRAPPED IN THE WAVEFORM MANIFOLD REFLECT AT ANGLE α. 
                    FOR RATIONAL ORBITS <span className="font-bold text-black">α = Pπ/Q</span>, SPATIAL MOMENTA CANCEL BY SYMMETRY. 
                    INVARIANT MASS <span className="font-bold text-black">M=Q</span> EMERGES FROM LIGHT via GEOMETRIC CLOSURE—THE 
                    PERIODIC SNAP.
                  </p>
                </section>

                <section>
                  <h3 className="text-[11px] font-bold tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Cpu size={12} className="text-black/30" /> 3. RIEMANN & E8 ROOT LATTICE
                  </h3>
                  <p className="text-[10px] leading-6 tracking-wide text-black/60 uppercase">
                    STABLE STATES ARE CLASSIFIED BY <span className="font-bold text-black">ADE DYNKIN DIAGRAMS</span>. 
                    WE UTILIZE THE <span className="font-bold text-black">E8 ROOT SYSTEM</span> AS THE SPECTRAL OPERATOR. 
                    WEIL POSITIVITY ENSURES COMPUTATIONAL STABILITY; THE WAVEFORM COLLAPSE IS PHYSICALLY ISOMORPHIC 
                    TO THE DISTRIBUTION OF CRITICAL ZEROS IN THE <span className="font-bold text-black">RIEMANN ZETA FUNCTION</span>.
                  </p>
                </section>

                <section className="pt-6 border-t border-black/5">
                  <p className="text-[9px] text-black/30 leading-5 italic">
                    Derived from "NullBilliards: Emergent Mass and the Spectral Operator" (Nathan Noll, 2026).
                  </p>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main UI Layer */}
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 flex flex-col items-center gap-6 bg-black/95 border-t border-white/5 backdrop-blur-2xl">
        <form onSubmit={handleSolve} className="w-full max-w-sm relative group">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="◊.EQUATION_FIELD"
            className="w-full bg-transparent border-b border-white/5 py-3 px-1 text-[11px] uppercase tracking-[0.5em] text-white focus:outline-none focus:border-white/30 transition-all text-center placeholder:opacity-10"
          />
          <div className="absolute right-0 bottom-3 flex gap-4">
            <button 
              type="button"
              onClick={handleClear}
              className="text-[9px] text-white/20 hover:text-white transition-colors tracking-[0.3em] font-bold"
            >
              [CLEAR]
            </button>
            <button 
              type="submit"
              disabled={isSolving}
              className="text-[9px] text-white/20 hover:text-white transition-colors tracking-[0.3em] font-bold disabled:opacity-5"
            >
              {isSolving ? "[SEARCHING]" : "[EXEC]"}
            </button>
          </div>
        </form>

        <div className="flex items-center gap-8 md:gap-14 opacity-40">
            <div className="flex flex-col items-center">
              <div className="text-[7px] tracking-[0.4em] text-white/50 uppercase mb-1">Compute</div>
              <div className="text-[9px] tracking-[0.1em] text-white/80 uppercase font-mono">{isSolving ? "WAVE_SWARM" : "STABLE_GEO"}</div>
            </div>
            
            {result !== null && (
                <div className="flex flex-col items-center border-x border-white/10 px-6 md:px-10">
                  <div className="text-[7px] tracking-[0.4em] text-white/50 uppercase mb-1">Result</div>
                  <div className="text-[11px] tracking-[0.1em] text-white font-mono">{result}</div>
                </div>
            )}

            <div className="flex flex-col items-center">
              <div className="text-[7px] tracking-[0.4em] text-white/50 uppercase mb-1">Manifold</div>
              <div className="text-[9px] tracking-[0.1em] text-white/80 uppercase font-mono">{orbit.q}:{orbit.p}</div>
            </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
