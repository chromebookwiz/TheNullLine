"use client";

import React, { useRef, useMemo, useState, useContext } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, Zap, Cpu, Atom } from 'lucide-react';
import { WindowSuspendedContext } from '../DraggableWindow';

// ── E8 Null Sphere Computer: 8 microspheres in cube/E8 arrangement ─────────
// The 8 nodes embody the E8 root lattice. Null photons travel between spheres
// as null geodesics. Orbit {q/p}: α = pπ/q, closed after q reflections.
// Emergent mass M = q from K=(q,0,0,0) via spatial momentum cancellation.

const D = 1.72;  // half-edge of the sphere placement cube

// 8 sphere positions — cube corners
const SPHERE_POS: THREE.Vector3[] = [
  new THREE.Vector3( D,  D,  D), new THREE.Vector3( D,  D, -D),
  new THREE.Vector3( D, -D,  D), new THREE.Vector3( D, -D, -D),
  new THREE.Vector3(-D,  D,  D), new THREE.Vector3(-D,  D, -D),
  new THREE.Vector3(-D, -D,  D), new THREE.Vector3(-D, -D, -D),
];

// Cube edges (index pairs) — the null geodesic pathways between spheres
const CUBE_EDGES: [number, number][] = [
  [0,1],[0,2],[0,4],[7,3],[7,5],[7,6],[1,3],[1,5],[2,3],[2,6],[4,5],[4,6],
];

// Nearest-neighbor adjacency for each sphere (3 neighbors per corner = E8 branching number)
const NEIGHBORS: number[][] = SPHERE_POS.map((_, i) =>
  CUBE_EDGES.filter(([a, b]) => a === i || b === i)
            .map(([a, b]) => (a === i ? b : a))
);

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function getOrbit(value: number) {
  const q = Math.max(3, Math.min(Math.round(value), 64));
  let p = 1;
  for (let i = Math.floor(q / 2); i > 0; i--) {
    if (gcd(q, i) === 1) { p = i; break; }
  }
  return { q, p };
}

// Build the sphere-to-sphere orbit sequence for a {q/p} orbit on 8 spheres
function buildOrbitPath(q: number, p: number): number[] {
  return Array.from({ length: q }, (_, k) => (k * p) % 8);
}

interface Photon {
  pos: THREE.Vector3;
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
  step: number;  // current position in orbitPath
}

// ── 8-Sphere Scene ────────────────────────────────────────────────────────────
const NULL_SPHERE_R = 0.27;

const EightSphereScene = React.memo(function EightSphereScene({
  q, p, isSolving,
}: { q: number; p: number; isSolving: boolean }) {
  const groupRef     = useRef<THREE.Group>(null);
  const photonGeoRef = useRef<THREE.BufferGeometry>(null);
  const flashTimers  = useRef<number[]>(new Array(8).fill(0));
  const sphereGlows  = useRef<(THREE.Mesh | null)[]>(new Array(8).fill(null));
  const sphereLights = useRef<(THREE.PointLight | null)[]>(new Array(8).fill(null));

  const orbitPath = useMemo(() => buildOrbitPath(q, p), [q, p]);

  // Photon particles — staggered along the orbit
  const photons = useMemo<Photon[]>(() => {
    const count = Math.min(16, q);
    return Array.from({ length: count }, (_, i) => {
      const step = i % orbitPath.length;
      const fromIdx = orbitPath[step];
      const toIdx   = orbitPath[(step + 1) % orbitPath.length];
      return {
        pos: SPHERE_POS[fromIdx].clone(),
        fromIdx, toIdx,
        progress: i / count,
        speed: 0.38 + Math.random() * 0.14,
        step,
      };
    });
  }, [q, p, orbitPath]);

  const photonGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(
      new Float32Array(photons.length * 3), 3
    ));
    return geo;
  }, [photons.length]);

  // Cube edge lines
  const edgeGeo = useMemo(() => {
    const flat: number[] = [];
    for (const [a, b] of CUBE_EDGES) {
      const pa = SPHERE_POS[a], pb = SPHERE_POS[b];
      flat.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
    return geo;
  }, []);

  useFrame((state, dt) => {
    const dts = Math.min(dt, 0.05);
    const t   = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y += dts * (isSolving ? 0.20 : 0.065);
      groupRef.current.rotation.x  = Math.sin(t * 0.11) * 0.18;
    }
    // Decay flash
    for (let s = 0; s < 8; s++) flashTimers.current[s] = Math.max(0, flashTimers.current[s] - dts * 3);

    // Update photons
    const pos = photonGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < photons.length; i++) {
      const ph = photons[i];
      ph.progress += dts * ph.speed;
      if (ph.progress >= 1) {
        flashTimers.current[ph.toIdx] = 1.0;
        ph.fromIdx   = ph.toIdx;
        ph.step      = (ph.step + 1) % orbitPath.length;
        // When free/chaotic, sometimes pick a random neighbor
        if (!isSolving && Math.random() < 0.45) {
          const nbrs = NEIGHBORS[ph.fromIdx];
          ph.toIdx = nbrs[Math.floor(Math.random() * nbrs.length)];
        } else {
          ph.toIdx = orbitPath[(ph.step + 1) % orbitPath.length];
        }
        ph.progress = 0;
      }
      ph.pos.lerpVectors(SPHERE_POS[ph.fromIdx], SPHERE_POS[ph.toIdx], ph.progress);
      pos[i * 3]     = ph.pos.x;
      pos[i * 3 + 1] = ph.pos.y;
      pos[i * 3 + 2] = ph.pos.z;
    }
    photonGeo.attributes.position.needsUpdate = true;

    // Update sphere glow opacity
    for (let s = 0; s < 8; s++) {
      const mesh = sphereGlows.current[s];
      if (mesh) {
        (mesh.material as THREE.MeshBasicMaterial).opacity =
          (isSolving ? 0.28 : 0.10) + flashTimers.current[s] * 0.70;
      }
      const light = sphereLights.current[s];
      if (light) light.intensity = flashTimers.current[s] * 1.8 + 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Cube edges — null geodesic pathways */}
      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial color="white" transparent opacity={0.07} />
      </lineSegments>

      {/* 8 microspheres */}
      {SPHERE_POS.map((pos, i) => (
        <group key={i} position={[pos.x, pos.y, pos.z]}>
          <mesh>
            <sphereGeometry args={[NULL_SPHERE_R, 20, 20]} />
            <meshBasicMaterial color="white" transparent opacity={0.10} wireframe />
          </mesh>
          <mesh ref={(el) => { sphereGlows.current[i] = el; }}>
            <sphereGeometry args={[NULL_SPHERE_R * 1.65, 14, 14]} />
            <meshBasicMaterial color="white" transparent opacity={0.12} />
          </mesh>
          <mesh>
            <sphereGeometry args={[NULL_SPHERE_R * 0.45, 10, 10]} />
            <meshBasicMaterial color="#a8c8ff" transparent opacity={0.65} />
          </mesh>
          <pointLight
            ref={(el) => { sphereLights.current[i] = el; }}
            color="#8098ff" intensity={0.08} distance={1.4}
          />
        </group>
      ))}

      {/* Null photons */}
      <points geometry={photonGeo}>
        <PointMaterial
          transparent color="white" size={0.065}
          sizeAttenuation depthWrite={false} opacity={0.95}
        />
      </points>

      <pointLight color="white" intensity={isSolving ? 0.7 : 0.18} />
    </group>
  );
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _photonGeoRef = null; // suppress unused ref warning

export default function NullPhotonSphereComputer() {
  const isSuspended = useContext(WindowSuspendedContext);
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
        if (!isNaN(num)) { setResult(num); setOrbit(getOrbit(num)); }
      } catch { /* ignore */ }
      setIsSolving(false);
    }, 3000);
  };

  const handleClear = () => { setInput(""); setResult(null); setOrbit({ q: 8, p: 3 }); };
  const isFree = result === null && !isSolving;

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-black overflow-hidden select-none font-mono">
      {/* 3D scene */}
      <div className="flex-1 w-full relative">
        <Canvas
          gl={{ antialias: false, powerPreference: "high-performance" }}
          dpr={[1, 1.5]}
          frameloop={isSuspended ? 'never' : 'always'}
        >
          <PerspectiveCamera makeDefault position={[0, 0, 9]} fov={32} />
          <OrbitControls
            enablePan={false} autoRotate={!isSolving} autoRotateSpeed={0.3}
            minDistance={4} maxDistance={16} enableDamping dampingFactor={0.06}
          />
          <ambientLight intensity={0.3} />
          <EightSphereScene q={orbit.q} p={orbit.p} isSolving={isSolving || isFree} />
        </Canvas>
      </div>

      {/* Status labels */}
      <div className="absolute top-5 left-6 z-20 pointer-events-none space-y-0.5">
        <div className="text-[7px] tracking-[0.5em] text-white/20 uppercase">◊.NULL_PHOTON_SPHERE</div>
        <div className="text-[10px] text-white/50 font-bold">8-SPHERE E₈ COMPUTER</div>
        <div className="text-[8px] text-white/25">
          Orbit &#123;q/p&#125; = {orbit.q}/{orbit.p} · M = {orbit.q}
        </div>
      </div>

      {/* Theory toggle */}
      <button
        onClick={() => setShowTheory(true)}
        className="absolute top-6 right-6 z-50 p-3 bg-black border border-white/20 text-white/40 hover:text-white hover:border-white/50 transition-all rounded-full"
        title="Theoretical Framework"
      >
        <Info size={16} />
      </button>

      {/* Theory modal */}
      <AnimatePresence>
        {showTheory && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl max-h-[85vh] bg-white border border-black shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-black flex items-center justify-between bg-black text-white shrink-0">
                <div className="flex items-center gap-3">
                  <Atom size={14} className="text-white/60" />
                  <span className="text-[10px] tracking-[0.3em] font-bold">◊.NULL_PHOTON_SPHERE_COMPUTER</span>
                </div>
                <button onClick={() => setShowTheory(false)} className="hover:rotate-90 transition-transform">
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8 text-black custom-scrollbar">
                <section>
                  <h3 className="text-[10px] font-bold tracking-widest mb-3 flex items-center gap-2">
                    <Zap size={11} className="text-black/30" /> 1. 8-SPHERE E₈ ARCHITECTURE
                  </h3>
                  <p className="text-[9px] leading-6 text-black/60 uppercase">
                    Eight high-Q microspheres (Q = 10⁹, SiO₂) placed in the E₈ Dynkin configuration.
                    Each sphere supports whispering gallery modes (WGM). Null photons travel between
                    spheres via evanescent coupling — straight null geodesics at c. The &#123;q/p&#125; orbit
                    visits all 8 spheres in a sequence defined by α = pπ/q.
                  </p>
                </section>
                <section>
                  <h3 className="text-[10px] font-bold tracking-widest mb-3 flex items-center gap-2">
                    <Atom size={11} className="text-black/30" /> 2. EMERGENT MASS M = Q
                  </h3>
                  <p className="text-[9px] leading-6 text-black/60 uppercase">
                    Reflection angle α = pπ/q (rational multiple of π) closes the orbit after q
                    reflections. Total four-momentum K = Σkᵢ: spatial components cancel by symmetry,
                    giving K = (q, 0, 0, 0). Invariant mass M² = q² emerges from massless photons.
                    Computation completes when the orbit closes — mass locks in.
                  </p>
                </section>
                <section>
                  <h3 className="text-[10px] font-bold tracking-widest mb-3 flex items-center gap-2">
                    <Cpu size={11} className="text-black/30" /> 3. E₈ ROOT SYSTEM & ADE CLASSIFICATION
                  </h3>
                  <p className="text-[9px] leading-6 text-black/60 uppercase">
                    The E₈ root lattice embeds 240 minimal vectors as null vectors in ℝ^1,8.
                    ADE Dynkin diagrams classify all stable orbit types. E₈ maximises
                    distinguishable states per sphere. Topological protection: ADE type
                    cannot change without a discrete phase transition — intrinsic error correction.
                  </p>
                </section>
                <section className="pt-4 border-t border-black/5">
                  <p className="text-[8px] text-black/30 italic">
                    Paper: "NullBilliards: Periodic Orbits, Emergent Mass, and the E₈ Null Sphere Computer" — Nathan Noll, 2026
                  </p>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input panel */}
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 flex flex-col items-center gap-4 bg-black/95 border-t border-white/5">
        <form onSubmit={handleSolve} className="w-full max-w-sm relative">
          <input
            type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="◊.EQUATION_FIELD"
            className="w-full bg-transparent border-b border-white/10 py-3 px-1 text-[11px] uppercase tracking-[0.5em] text-white focus:outline-none focus:border-white/40 transition-all text-center placeholder:opacity-10"
          />
          <div className="absolute right-0 bottom-3 flex gap-4">
            <button type="button" onClick={handleClear} className="text-[8px] text-white/20 hover:text-white transition-colors tracking-widest">[CLEAR]</button>
            <button type="submit" disabled={isSolving} className="text-[8px] text-white/40 hover:text-white disabled:opacity-30 transition-colors tracking-widest">
              {isSolving ? '[SOLVING]' : '[COMPUTE]'}
            </button>
          </div>
        </form>
        <div className="flex gap-8 text-center opacity-70">
          {result !== null && (
            <div>
              <div className="text-[7px] text-white/30 uppercase tracking-widest">RESULT</div>
              <div className="text-sm font-bold text-white">{result}</div>
            </div>
          )}
          <div>
            <div className="text-[7px] text-white/30 uppercase tracking-widest">ORBIT</div>
            <div className="text-sm font-bold text-white">{orbit.q}/{orbit.p}</div>
          </div>
          <div>
            <div className="text-[7px] text-white/30 uppercase tracking-widest">MASS M=q</div>
            <div className="text-sm font-bold text-white">{orbit.q}</div>
          </div>
          <div>
            <div className="text-[7px] text-white/30 uppercase tracking-widest">SPHERES</div>
            <div className="text-sm font-bold text-white">8 × E₈</div>
          </div>
        </div>
      </div>
    </div>
  );
}
