"use client";

import React, { useRef, useState, useEffect, useMemo, useContext } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WindowSuspendedContext } from './DraggableWindow';

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

// ── Physics constants (EDS levitation — based on NullHover paper) ──────────────
// F_lev = 3μ₀m²/(128πh⁴) at optimal AC frequency.
// In simulation we model the same stable equilibrium with a PD controller:
const SPHERE_R    = 4.5;    // craft sphere radius (m)
const GRAVITY     = 9.81;   // m/s²
const EDS_TARGET  = 5.5;    // desired hover gap: sphere-bottom to terrain (m)
const EDS_MAX_GAP = 42.0;   // EDS range limit — beyond this, gravity wins
const EDS_KP      = 42.0;   // PD proportional gain
const EDS_KD      = 8.5;    // PD derivative gain
const RESTITUTION = 0.36;   // shell impact energy retention (absorbs 64%)
const GYRO_RPM    = 12000;  // gyroscopic core spin speed (RPM)
const HORIZ_DRAG  = 0.072;  // horizontal drag exponent base

// ── HUD data type ─────────────────────────────────────────────────────────────
interface HUDData { alt: number; speed: number; heading: number; gap: number; onGround: boolean; }

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

  const craftRef    = useRef<THREE.Group>(null);
  const rollGroupRef = useRef<THREE.Group>(null);
  const gyroRing1   = useRef<THREE.Mesh>(null);
  const gyroRing2   = useRef<THREE.Mesh>(null);
  const edsGlowRef  = useRef<THREE.Mesh>(null);
  const edsLightRef = useRef<THREE.PointLight>(null);
  const lockedRef   = useRef(false);

  const state = useRef({
    pos:         new THREE.Vector3(0, 35, 0),
    vel:         new THREE.Vector3(),
    yaw:         0,
    rollX:       0,
    rollZ:       0,
    angVX:       0,
    angVZ:       0,
    gyroAngle1:  0,
    gyroAngle2:  0,
    impactFlash: 0,
    edsStrength: 0,
    onGround:    false,
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
    const onLC = () => {
      lockedRef.current = document.pointerLockElement === canvas;
      onLockChange(lockedRef.current);
    };
    canvas.addEventListener('click', () => { canvas.requestPointerLock(); });
    document.addEventListener('pointerlockchange', onLC);
    document.addEventListener('mousemove', onMouse);
    return () => {
      document.removeEventListener('pointerlockchange', onLC);
      document.removeEventListener('mousemove', onMouse);
    };
  }, [gl, onLockChange]);

  useFrame((_, dt) => {
    const dts = Math.min(dt, 0.05);
    const s   = state.current;
    const { pos, vel } = s;
    const keys = keysRef.current!;
    const yaw  = s.yaw;

    const sy = Math.sin(yaw), cy = Math.cos(yaw);
    const fwd = new THREE.Vector3(-sy, 0, -cy);
    const rgt = new THREE.Vector3( cy, 0, -sy);

    // ── Player horizontal thrust ─────────────────────────────────────
    if (keys.has('w')) vel.addScaledVector(fwd,  30 * dts);
    if (keys.has('s')) vel.addScaledVector(fwd, -30 * dts);
    if (keys.has('a')) vel.addScaledVector(rgt, -30 * dts);
    if (keys.has('d')) vel.addScaledVector(rgt,  30 * dts);

    // ── Gravity ──────────────────────────────────────────────────────
    vel.y -= GRAVITY * dts;

    // ── Terrain / EDS ───────────────────────────────────────────────
    const gh  = terrainH(pos.x, pos.z);
    const gap = pos.y - gh - SPHERE_R; // sphere-bottom → terrain clearance
    s.onGround = false;

    if (gap < 0) {
      // Impact: shell absorbs energy (RESTITUTION coefficient from paper)
      pos.y = gh + SPHERE_R;
      const impactSpeed = Math.abs(vel.y);
      if (vel.y < 0) {
        vel.y = RESTITUTION * impactSpeed;
        if (impactSpeed > 4) {
          vel.x *= 0.78; vel.z *= 0.78; // lateral energy absorbed
          s.impactFlash = Math.min(impactSpeed / 18, 1);
        }
      }
      s.onGround = true;
      // Rolling: ω = v / r  (pure rolling constraint)
      s.angVX =  vel.z / SPHERE_R;
      s.angVZ = -vel.x / SPHERE_R;
    } else if (gap < EDS_MAX_GAP) {
      // EDS levitation — PD controller models F_lev = 3μ₀m²/(128πh⁴)
      const err  = EDS_TARGET - gap;
      vel.y += (EDS_KP * err - EDS_KD * vel.y) * dts;
      s.edsStrength = Math.max(0, Math.min(1, 1 - gap / EDS_MAX_GAP));
    } else {
      s.edsStrength = 0;
    }

    // ── Slope gravity — sphere rolls naturally downhill ───────────────
    const hL = terrainH(pos.x - 0.5, pos.z), hR = terrainH(pos.x + 0.5, pos.z);
    const hD = terrainH(pos.x, pos.z - 0.5), hU = terrainH(pos.x, pos.z + 0.5);
    const slopeX = (hR - hL);
    const slopeZ = (hU - hD);
    const slopeFactor = Math.max(0, 1 - gap / 28);
    vel.x -= slopeX * GRAVITY * 0.38 * slopeFactor * dts;
    vel.z -= slopeZ * GRAVITY * 0.38 * slopeFactor * dts;

    // ── Vertical overrides ───────────────────────────────────────────
    if (keys.has(' '))                        vel.y += 68 * dts;  // ascend
    if (keys.has('c') || keys.has('control')) vel.y -= 46 * dts;  // Ctrl/C = descend

    // ── Drag ─────────────────────────────────────────────────────────
    vel.x *= Math.pow(HORIZ_DRAG, dts);
    vel.z *= Math.pow(HORIZ_DRAG, dts);
    vel.y *= Math.pow(0.20, dts);  // vertical damping (stable hover feel)

    pos.addScaledVector(vel, dts);
    pos.y = Math.min(pos.y, 220);

    // ── Rolling orientation ──────────────────────────────────────────
    if (s.onGround) {
      s.rollX += s.angVX * dts;
      s.rollZ += s.angVZ * dts;
    } else {
      s.angVX *= Math.pow(0.25, dts);
      s.angVZ *= Math.pow(0.25, dts);
      s.rollX += s.angVX * dts;
      s.rollZ += s.angVZ * dts;
    }

    // ── Gyroscope spin (12,000 RPM = 1,257 rad/s) ───────────────────
    const gyroRad = (GYRO_RPM * 2 * Math.PI / 60) * dts;
    s.gyroAngle1 += gyroRad;
    s.gyroAngle2 += gyroRad * 0.72;

    // ── Impact flash decay ───────────────────────────────────────────
    s.impactFlash = Math.max(0, s.impactFlash - dts * 4);

    // ── Update meshes imperatively ───────────────────────────────────
    if (craftRef.current) {
      craftRef.current.position.copy(pos);
      craftRef.current.rotation.y = yaw;
    }
    if (rollGroupRef.current) {
      rollGroupRef.current.rotation.x = s.rollX;
      rollGroupRef.current.rotation.z = s.rollZ;
    }
    if (gyroRing1.current) gyroRing1.current.rotation.x = s.gyroAngle1;
    if (gyroRing2.current) gyroRing2.current.rotation.z = s.gyroAngle2;
    if (edsGlowRef.current) {
      (edsGlowRef.current.material as THREE.MeshBasicMaterial).opacity =
        s.edsStrength * 0.22 + s.impactFlash * 0.6;
    }
    if (edsLightRef.current) {
      edsLightRef.current.intensity = 3 + s.edsStrength * 6 + s.impactFlash * 14;
    }

    // ── Chase camera ─────────────────────────────────────────────────
    camera.position.set(pos.x + sy * 32, pos.y + 13, pos.z + cy * 32);
    camera.lookAt(pos.x, pos.y + 1, pos.z);

    // ── Chunk update ─────────────────────────────────────────────────
    const ncx = Math.round(pos.x / CHUNK_SIZE);
    const ncz = Math.round(pos.z / CHUNK_SIZE);
    if (ncx !== chunkCRef.current.x || ncz !== chunkCRef.current.z) {
      chunkCRef.current = { x: ncx, z: ncz };
      setChunk({ x: ncx, z: ncz });
    }

    // ── HUD (throttled) ──────────────────────────────────────────────
    frameN.current++;
    if (frameN.current % 4 === 0) {
      const hSpeed  = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      const speed   = hSpeed * 3.6;
      const heading = ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
      onHUD({ alt: pos.y, speed, heading, gap: Math.max(0, gap), onGround: s.onGround });
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

      {/* ── Spherical Null Hover Craft ──────────────────────────────────── */}
      <group ref={craftRef}>

        {/* Rolling sub-group — rotates as sphere rolls on terrain */}
        <group ref={rollGroupRef}>
          {/* Outer impact-resistant shell */}
          <mesh>
            <sphereGeometry args={[SPHERE_R, 48, 48]} />
            <meshPhongMaterial
              color="#0c1e3a" emissive="#081428" specular="#2858b0"
              shininess={90} transparent opacity={0.52}
            />
          </mesh>
          {/* EDS wireframe glow — brightens near ground and on impact */}
          <mesh ref={edsGlowRef}>
            <sphereGeometry args={[SPHERE_R * 1.02, 18, 18]} />
            <meshBasicMaterial color="#3888ff" transparent opacity={0.08} wireframe />
          </mesh>
        </group>

        {/* Primary gyroscopic ring — spins around X axis at GYRO_RPM */}
        <mesh ref={gyroRing1}>
          <torusGeometry args={[2.7, 0.18, 12, 64]} />
          <meshBasicMaterial color="#50c8ff" />
        </mesh>

        {/* Secondary gyroscopic ring — perpendicular, different rate */}
        <mesh ref={gyroRing2}>
          <torusGeometry args={[2.7, 0.13, 12, 64]} />
          <meshBasicMaterial color="#40a8e0" />
        </mesh>

        {/* Inner core */}
        <mesh>
          <sphereGeometry args={[0.95, 18, 18]} />
          <meshBasicMaterial color="#102050" />
        </mesh>

        {/* EDS equatorial coil glow ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[SPHERE_R * 0.93, 0.11, 8, 64]} />
          <meshBasicMaterial color="#50c8ff" transparent opacity={0.72} />
        </mesh>

        {/* EDS field light — illuminates terrain below */}
        <pointLight
          ref={edsLightRef}
          color="#2040ff" intensity={6}
          distance={SPHERE_R * 7}
          position={[0, -SPHERE_R * 0.65, 0]}
        />
      </group>
    </>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
const COMPASS = ['N','NE','E','SE','S','SW','W','NW'];

export default function NullHoverApp() {
  const isSuspended = useContext(WindowSuspendedContext);

  const [started, setStarted]     = useState(false);
  const [locked, setLocked]       = useState(false);
  const [isFS, setIsFS]           = useState(false);
  const [hud, setHud]             = useState<HUDData>({ alt: 35, speed: 0, heading: 0, gap: EDS_TARGET, onGround: false });
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
          camera={{ fov: 65, near: 0.5, far: 950 }}
          gl={{ antialias: true }}
          frameloop={isSuspended ? 'never' : 'always'}
        >
          <HoverScene keysRef={keysRef} onHUD={setHud} onLockChange={setLocked} />
        </Canvas>
      )}

      {/* ── Start screen ── */}
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="w-[360px] border border-white/10 p-8">
            <div className="text-[9px] tracking-[0.5em] text-white/30 uppercase mb-1">◊.NULL_HOVER · v2</div>
            <h1 className="text-2xl font-bold text-white leading-tight mb-1">Spherical EDS<br/>Levitation Craft</h1>
            <p className="text-[10px] text-white/30 mb-3 italic">"It doesn't fly. It falls — upward."</p>
            <div className="text-[8px] text-white/20 mb-5 leading-relaxed border-l border-white/10 pl-3">
              Gyroscopic core · Impact-resistant shell (e=0.36) · EDS over any terrain<br/>
              F_lev = 3μ₀m²/(128πh⁴) · PD-controlled at 10 kHz
            </div>

            <div className="border-t border-white/10 pt-4 mb-6 space-y-1.5">
              <div className="text-[8px] tracking-[0.4em] text-white/20 uppercase mb-2">Controls</div>
              {[
                ['W / S',      'Forward / Back'],
                ['A / D',      'Strafe Left / Right'],
                ['SPACE',      'Ascend (EDS boost)'],
                ['C / CTRL',   'Descend'],
                ['MOUSE',      'Steer · Click to lock'],
                ['ESC',        'Release mouse'],
              ].map(([key, desc]) => (
                <div key={key} className="flex justify-between text-[10px]">
                  <span className="font-bold text-white/80 w-24 shrink-0">{key}</span>
                  <span className="text-white/40">{desc}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStarted(true)}
              className="w-full py-3 bg-white text-black font-bold text-[10px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all"
            >
              ▶ ENGAGE EDS COILS
            </button>
          </div>
        </div>
      )}

      {/* ── HUD (when flying) ── */}
      {started && (
        <>
          {/* Top readout bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4 bg-black/35 backdrop-blur-sm px-5 py-2 pointer-events-none">
            {[
              ['ALT',     `${hud.alt.toFixed(1)} m`],
              ['SPD',     `${hud.speed.toFixed(0)} km/h`],
              ['HDG',     `${dir} ${hud.heading.toFixed(0)}°`],
              ['GYRO',    `${GYRO_RPM.toLocaleString()} rpm`],
              ['STATUS',  hud.onGround ? 'ROLLING' : `EDS ${hud.gap.toFixed(1)}m`],
            ].map(([lbl, val]) => (
              <div key={lbl} className="text-center min-w-[48px]">
                <div className="text-[7px] text-white/35 uppercase tracking-widest">{lbl}</div>
                <div className={`text-[11px] font-bold ${hud.onGround && lbl === 'STATUS' ? 'text-amber-400' : 'text-white'}`}>
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* Status bar */}
          <div className="absolute top-[52px] left-1/2 -translate-x-1/2 w-52 pointer-events-none">
            <div className="h-[2px] bg-white/10 rounded-full">
              <div
                className="h-full rounded-full bg-blue-400 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, (1 - hud.gap / EDS_MAX_GAP) * 100))}%` }}
              />
            </div>
            <div className="text-center text-[7px] text-white/20 tracking-widest mt-0.5 uppercase">
              {hud.onGround ? '⊕ SHELL CONTACT · IMPACT ABSORBED' : '◊ EDS FIELD ACTIVE'}
            </div>
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
              className="px-3 py-1.5 bg-black/40 text-white/55 text-[8px] uppercase tracking-widest hover:bg-black/60 hover:text-white transition-all border border-white/10"
            >
              {isFS ? '⊡ Exit FS' : '⊞ Fullscreen'}
            </button>
            <button
              onClick={() => { setStarted(false); setLocked(false); }}
              className="px-3 py-1.5 bg-black/40 text-white/55 text-[8px] uppercase tracking-widest hover:bg-black/60 hover:text-white transition-all border border-white/10"
            >
              ⊠ Land
            </button>
          </div>
        </>
      )}
    </div>
  );
}

