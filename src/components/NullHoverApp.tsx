"use client";

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ── Terrain height function (sum-of-sinusoids, cheap Perlin substitute) ───────
function terrainH(x: number, z: number): number {
  return (
    14 * Math.sin(x * 0.035) * Math.cos(z * 0.042) +
     8 * Math.sin(x * 0.080 + 1.2) * Math.cos(z * 0.070 + 0.9) +
     4 * Math.sin(x * 0.160 + 2.4) * Math.sin(z * 0.140 + 1.5) +
     2 * Math.sin(x * 0.350 + 0.7) * Math.cos(z * 0.300 + 0.4) +
     1 * Math.sin(x * 0.700 + 1.1) * Math.cos(z * 0.650 + 0.2)
  );
}

function terrainColor(h: number): [number, number, number] {
  if (h < -5) return [0.18, 0.38, 0.63]; // water
  if (h <  0) return [0.62, 0.52, 0.37]; // sand/shore
  if (h <  8) return [0.33, 0.47, 0.28]; // grass
  if (h < 16) return [0.27, 0.40, 0.20]; // forest
  if (h < 22) return [0.52, 0.52, 0.47]; // rocky
  return [0.92, 0.92, 0.96];              // snow
}

// ── Chunk geometry builder ────────────────────────────────────────────────────
const CHUNK_SIZE = 240;
const CHUNK_SEGS = 44;

function buildChunk(cx: number, cz: number): THREE.BufferGeometry {
  const n = CHUNK_SEGS + 1;
  const positions = new Float32Array(n * n * 3);
  const colors    = new Float32Array(n * n * 3);
  const half = CHUNK_SIZE / 2;
  const step = CHUNK_SIZE / CHUNK_SEGS;

  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const lx = -half + ix * step;
      const lz = -half + iz * step;
      const wx = cx * CHUNK_SIZE + lx;
      const wz = cz * CHUNK_SIZE + lz;
      const h  = terrainH(wx, wz);
      const i  = (iz * n + ix) * 3;
      positions[i] = lx; positions[i+1] = h; positions[i+2] = lz;
      const [r,g,b] = terrainColor(h);
      colors[i] = r; colors[i+1] = g; colors[i+2] = b;
    }
  }

  const indices: number[] = [];
  for (let iz = 0; iz < CHUNK_SEGS; iz++) {
    for (let ix = 0; ix < CHUNK_SEGS; ix++) {
      const a = iz * n + ix, b = a + 1, c = a + n, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function TerrainChunk({ cx, cz }: { cx: number; cz: number }) {
  const geo = useMemo(() => buildChunk(cx, cz), [cx, cz]);
  return (
    <mesh geometry={geo} position={[cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE]}>
      <meshLambertMaterial vertexColors />
    </mesh>
  );
}

function Terrain({ cx, cz }: { cx: number; cz: number }) {
  const R = 2;
  const chunks = [];
  for (let dz = -R; dz <= R; dz++)
    for (let dx = -R; dx <= R; dx++)
      chunks.push(<TerrainChunk key={`${cx+dx}:${cz+dz}`} cx={cx+dx} cz={cz+dz} />);
  return <>{chunks}</>;
}

// ── HUD data type ─────────────────────────────────────────────────────────────
interface HUDData { alt: number; speed: number; heading: number; }

// ── Inner Three.js scene ──────────────────────────────────────────────────────
function HoverScene({
  keysRef,
  onHUD,
  onLockChange,
}: {
  keysRef: React.RefObject<Set<string>>;
  onHUD: (d: HUDData) => void;
  onLockChange: (v: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const craftRef = useRef<THREE.Group>(null);
  const lockedRef = useRef(false);

  const state = useRef({
    pos: new THREE.Vector3(0, 30, 0),
    vel: new THREE.Vector3(),
    yaw: 0,
    tilt: 0,
  });

  const chunkCRef  = useRef({ x: 0, z: 0 });
  const [chunk, setChunk] = useState({ x: 0, z: 0 });
  const frameN = useRef(0);

  // Pointer lock
  useEffect(() => {
    const canvas = gl.domElement;
    const onMouse = (e: MouseEvent) => {
      if (!lockedRef.current) return;
      state.current.yaw -= e.movementX * 0.0022;
    };
    const onLockChange = () => {
      lockedRef.current = document.pointerLockElement === canvas;
    };
    canvas.addEventListener('click', () => { canvas.requestPointerLock(); });
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouse);
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouse);
    };
  }, [gl]);

  // Sync locked state to parent
  useEffect(() => {
    const canvas = gl.domElement;
    const h = () => {
      const locked = document.pointerLockElement === canvas;
      lockedRef.current = locked;
      onLockChange(locked);
    };
    document.addEventListener('pointerlockchange', h);
    return () => document.removeEventListener('pointerlockchange', h);
  }, [gl, onLockChange]);

  useFrame((_, dt) => {
    const dts = Math.min(dt, 0.05);
    const { pos, vel } = state.current;
    const yaw = state.current.yaw;
    const keys = keysRef.current!;

    const sy = Math.sin(yaw), cy = Math.cos(yaw);
    const fwd = new THREE.Vector3(-sy, 0, -cy);
    const rgt = new THREE.Vector3( cy, 0, -sy);
    const THRUST = 32;

    if (keys.has('w')) vel.addScaledVector(fwd,  THRUST * dts);
    if (keys.has('s')) vel.addScaledVector(fwd, -THRUST * dts);
    if (keys.has('a')) vel.addScaledVector(rgt, -THRUST * dts);
    if (keys.has('d')) vel.addScaledVector(rgt,  THRUST * dts);
    if (keys.has(' ')) vel.y += 22 * dts;
    if (keys.has('c')) vel.y -= 22 * dts;

    vel.multiplyScalar(Math.pow(0.07, dts));
    pos.addScaledVector(vel, dts);

    const gh = terrainH(pos.x, pos.z);
    if (pos.y < gh + 5) { pos.y = gh + 5; if (vel.y < 0) vel.y = 0; }
    pos.y = Math.min(pos.y, 200);

    // Lateral tilt
    const lateral = vel.dot(rgt);
    state.current.tilt = state.current.tilt * Math.pow(0.04, dts) + lateral * 0.04;
    state.current.tilt = Math.max(-0.28, Math.min(0.28, state.current.tilt));

    // Update craft mesh imperatively
    if (craftRef.current) {
      craftRef.current.position.copy(pos);
      craftRef.current.rotation.y = yaw;
      craftRef.current.rotation.z = -state.current.tilt;
    }

    // Chase camera (behind, slightly above)
    camera.position.set(pos.x + sy * 28, pos.y + 10, pos.z + cy * 28);
    camera.lookAt(pos.x, pos.y + 2, pos.z);

    // Chunk boundary tracking
    const ncx = Math.round(pos.x / CHUNK_SIZE);
    const ncz = Math.round(pos.z / CHUNK_SIZE);
    if (ncx !== chunkCRef.current.x || ncz !== chunkCRef.current.z) {
      chunkCRef.current = { x: ncx, z: ncz };
      setChunk({ x: ncx, z: ncz });
    }

    // HUD throttle
    frameN.current++;
    if (frameN.current % 5 === 0) {
      const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z) * 3.6 * 60;
      const heading = ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
      onHUD({ alt: pos.y - gh, speed, heading });
    }
  });

  return (
    <>
      <ambientLight intensity={0.65} color="#d0e8f8" />
      <directionalLight position={[150, 300, 80]} intensity={1.15} color="#fff8e8" />
      <fog attach="fog" args={['#b8d4e8', 280, 850]} />

      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[900, 16, 8]} />
        <meshBasicMaterial color="#a4c4de" side={THREE.BackSide} />
      </mesh>

      <Terrain cx={chunk.x} cz={chunk.z} />

      {/* Craft */}
      <group ref={craftRef}>
        <mesh>
          <cylinderGeometry args={[4.0, 4.6, 0.9, 32]} />
          <meshLambertMaterial color="#18182a" />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <sphereGeometry args={[2.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.5]} />
          <meshLambertMaterial color="#1a304e" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <torusGeometry args={[4.3, 0.22, 8, 48]} />
          <meshBasicMaterial color="#50c8ff" />
        </mesh>
        <pointLight color="#3060ff" intensity={3.5} distance={28} position={[0, -1, 0]} />
      </group>
    </>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
const COMPASS = ['N','NE','E','SE','S','SW','W','NW'];

export default function NullHoverApp() {
  const [started, setStarted]     = useState(false);
  const [locked, setLocked]       = useState(false);
  const [isFS, setIsFS]           = useState(false);
  const [hud, setHud]             = useState<HUDData>({ alt: 30, speed: 0, heading: 0 });
  const keysRef                   = useRef(new Set<string>());
  const containerRef              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key === ' ' ? ' ' : e.key.toLowerCase();
      if (['w','a','s','d',' ','c'].includes(k)) e.preventDefault();
      keysRef.current.add(k);
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key === ' ' ? ' ' : e.key.toLowerCase());
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    const h = () => setIsFS(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const toggleFS = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const dir = COMPASS[Math.round(hud.heading / 45) % 8];

  return (
    <div ref={containerRef} className="w-full h-full relative bg-[#a4c4de] font-mono overflow-hidden select-none">
      {/* Three.js scene */}
      {started && (
        <Canvas
          className="absolute inset-0 w-full h-full"
          camera={{ fov: 68, near: 0.5, far: 900 }}
          gl={{ antialias: true }}
        >
          <HoverScene keysRef={keysRef} onHUD={setHud} onLockChange={setLocked} />
        </Canvas>
      )}

      {/* ── Start screen ── */}
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="w-[340px] border border-white/10 p-8">
            <div className="text-[9px] tracking-[0.5em] text-white/30 uppercase mb-1">◊.NULL_HOVER</div>
            <h1 className="text-2xl font-bold text-white leading-tight mb-1">Electromagnetic<br/>Levitation Craft</h1>
            <p className="text-[10px] text-white/30 mb-6 italic">"It doesn't fly. It falls — upward."</p>

            <div className="border-t border-white/10 pt-4 mb-6 space-y-1.5">
              <div className="text-[8px] tracking-[0.4em] text-white/20 uppercase mb-2">Flight Controls</div>
              {[
                ['W / S',    'Forward / Back'],
                ['A / D',    'Strafe Left / Right'],
                ['SPACE',    'Ascend'],
                ['C',        'Descend'],
                ['MOUSE',    'Steer · Click canvas to lock'],
                ['ESC',      'Release mouse'],
              ].map(([key, desc]) => (
                <div key={key} className="flex justify-between text-[10px]">
                  <span className="font-bold text-white/80 w-20 shrink-0">{key}</span>
                  <span className="text-white/40">{desc}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStarted(true)}
              className="w-full py-3 bg-white text-black font-bold text-[10px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all"
            >
              ▶ ENGAGE COILS
            </button>
          </div>
        </div>
      )}

      {/* ── HUD (when flying) ── */}
      {started && (
        <>
          {/* Top readout bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-5 bg-black/35 backdrop-blur-sm px-5 py-2.5 pointer-events-none">
            {[
              ['ALT',     `${hud.alt.toFixed(1)} m`],
              ['SPEED',   `${hud.speed.toFixed(0)} km/h`],
              ['HEADING', `${dir} ${hud.heading.toFixed(0)}°`],
            ].map(([lbl, val]) => (
              <div key={lbl} className="text-center">
                <div className="text-[7px] text-white/35 uppercase tracking-widest">{lbl}</div>
                <div className="text-[12px] font-bold text-white">{val}</div>
              </div>
            ))}
          </div>

          {/* "Click to lock" hint */}
          {!locked && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 text-white/50 text-[8px] uppercase tracking-[0.3em] pointer-events-none">
              CLICK CANVAS TO LOCK MOUSE · ESC TO RELEASE
            </div>
          )}

          {/* WASD key display */}
          {locked && (
            <div className="absolute bottom-14 left-5 pointer-events-none">
              {(['w','a','s','d'] as const).map(k => {
                const [cx, cy] = k === 'w' ? [1,0] : k === 'a' ? [0,1] : k === 's' ? [1,1] : [2,1];
                const active = keysRef.current.has(k);
                return (
                  <div
                    key={k}
                    style={{ position: 'absolute', left: cx * 22, top: cy * 22, width: 18, height: 18 }}
                    className={`flex items-center justify-center text-[8px] font-bold border transition-colors ${active ? 'bg-white/80 border-white text-black' : 'bg-black/30 border-white/20 text-white/40'}`}
                  >
                    {k.toUpperCase()}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom-right buttons */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={toggleFS}
              className="px-3 py-1.5 bg-black/40 text-white/55 text-[8px] uppercase tracking-widest hover:bg-black/60 hover:text-white transition-all border border-white/10 hover:border-white/25"
            >
              {isFS ? '⊡ Exit FS' : '⊞ Fullscreen'}
            </button>
            <button
              onClick={() => { setStarted(false); setLocked(false); }}
              className="px-3 py-1.5 bg-black/40 text-white/55 text-[8px] uppercase tracking-widest hover:bg-black/60 hover:text-white transition-all border border-white/10 hover:border-white/25"
            >
              ⊠ Land
            </button>
          </div>
        </>
      )}
    </div>
  );
}

