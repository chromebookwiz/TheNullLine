"use client";

import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { motion } from 'framer-motion';
import { WindowSuspendedContext } from './DraggableWindow';

// ADE classification maps directly to crystal system (from NullForge doc)
const CRYSTAL_MODES = [
  { id: 'fcc',   name: 'FCC Cubic',      ade: 'E₇', q: 7,  p: 3, gridType: 'fcc',  symbol: 'Fe / Au / Al', color: '#c0a060' },
  { id: 'bcc',   name: 'BCC Cubic',      ade: 'E₇', q: 7,  p: 3, gridType: 'bcc',  symbol: 'Fe / W / Cr',  color: '#8090c0' },
  { id: 'hex',   name: 'Hexagonal',      ade: 'D₆', q: 6,  p: 1, gridType: 'hex',  symbol: 'Ti / Mg / Zn', color: '#60a090' },
  { id: 'dia',   name: 'Diamond Cubic',  ade: 'E₇', q: 7,  p: 3, gridType: 'dia',  symbol: 'Si / C / Ge',  color: '#a0c0ff' },
  { id: 'graph', name: 'Graphene',       ade: 'D₆', q: 6,  p: 1, gridType: 'graph',symbol: 'C',            color: '#606060' },
  { id: 'quasi', name: 'E₈ Quasicrystal',ade: 'E₈', q: 8,  p: 3, gridType: 'quasi',symbol: 'Al-Mn / C₆₀',  color: '#c060c0' },
];

// Tier 1 elements (full name, symbol, color from NullForge)
const ELEMENTS = [
  { symbol: 'C',  name: 'Carbon',   color: '#444444', radius: 7 },
  { symbol: 'Si', name: 'Silicon',  color: '#4488cc', radius: 8 },
  { symbol: 'O',  name: 'Oxygen',   color: '#cc4444', radius: 6 },
  { symbol: 'N',  name: 'Nitrogen', color: '#44aadd', radius: 6 },
  { symbol: 'H',  name: 'Hydrogen', color: '#cccccc', radius: 4 },
  { symbol: 'Au', name: 'Gold',     color: '#d4aa20', radius: 9 },
  { symbol: 'Al', name: 'Aluminium',color: '#99aacc', radius: 8 },
  { symbol: 'Fe', name: 'Iron',     color: '#996644', radius: 8 },
  { symbol: 'Ti', name: 'Titanium', color: '#669988', radius: 8 },
];

// Fibonacci sphere lattice for shell assembly
function fibSpherePoints(n: number): Array<{ x: number; y: number; z: number }> {
  const GA = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GA * i;
    return { x: r * Math.cos(theta), y, z: r * Math.sin(theta) };
  });
}

// Orthographic project with Y-rotation and slight perspective
function project(p: { x: number; y: number; z: number }, cx: number, cy: number, R: number, rot: number) {
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const rx = p.x * cos - p.z * sin;
  const rz = p.x * sin + p.z * cos;
  const fov = 1 + rz * 0.18;
  return { x: cx + rx * R * fov, y: cy - p.y * R * fov, depth: rz };
}

// Quadratic bezier at t
function bezierAt(t: number, x0: number, y0: number, cpX: number, cpY: number, x1: number, y1: number) {
  const s = 1 - t;
  return { x: s * s * x0 + 2 * s * t * cpX + t * t * x1, y: s * s * y0 + 2 * s * t * cpY + t * t * y1 };
}

interface FlyingAtom {
  id: number;
  fromX: number; fromY: number;
  tx: number; ty: number;
  cpX: number; cpY: number;
  siteIdx: number;
  progress: number;
  speed: number;
  rejected: boolean;
  sortPulse: number;
  sortBeamIdx: number;
  beamAngles: number[];
  ejecting: boolean;
  ejectX: number; ejectY: number;
  ejectVX: number; ejectVY: number;
  ejectFade: number;
}

const SHELL_N = 120;
const MAX_FLYING = 3;

interface ShellLayout {
  sites3d: Array<{ x: number; y: number; z: number }>;
  bonds: Array<[number, number]>;
}

function drawADEOrbit(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, q: number, p: number, rot: number, color: string) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  for (let i = 0; i <= q; i++) {
    const angle = (i * p * 2 * Math.PI) / q + rot;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// Deduplicate and sample a point list to exactly n points
function dedupeAndSample(pts: { x: number; y: number; z: number }[], n: number) {
  const seen = new Set<string>();
  const deduped = pts.filter(p => {
    const k = `${Math.round(p.x * 9)},${Math.round(p.y * 9)},${Math.round(p.z * 9)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // Pad if too few
  while (deduped.length < n) {
    const base = deduped[Math.floor(Math.random() * deduped.length)];
    deduped.push({
      x: base.x + (Math.random() - 0.5) * 0.06,
      y: base.y + (Math.random() - 0.5) * 0.06,
      z: base.z + (Math.random() - 0.5) * 0.06,
    });
  }
  return deduped.slice(0, n);
}

function buildBondPairs(sites: Array<{ x: number; y: number; z: number }>, neighbors: number) {
  const bonds = new Set<string>();
  for (let i = 0; i < sites.length; i++) {
    const distances = sites
      .map((site, idx) => ({
        idx,
        d2: idx === i
          ? Number.POSITIVE_INFINITY
          : (sites[i].x - site.x) ** 2 + (sites[i].y - site.y) ** 2 + (sites[i].z - site.z) ** 2,
      }))
      .sort((a, b) => a.d2 - b.d2);

    const cutoff = distances[Math.max(0, neighbors - 1)]?.d2 ?? Number.POSITIVE_INFINITY;
    for (const entry of distances.slice(0, neighbors + 1)) {
      if (entry.d2 > cutoff * 1.2) {
        continue;
      }
      const pair = i < entry.idx ? `${i}:${entry.idx}` : `${entry.idx}:${i}`;
      bonds.add(pair);
    }
  }

  return Array.from(bonds, (pair) => {
    const [a, b] = pair.split(':').map(Number);
    return [a, b] as [number, number];
  });
}

// Crystal-structure-specific sphere point distributions
function getShellPoints(gridType: string, n: number): Array<{ x: number; y: number; z: number }> {
  switch (gridType) {
    case 'fcc':
      return fibSpherePoints(n);

    case 'bcc': {
      const pts: { x: number; y: number; z: number }[] = [];
      for (let ix = -3; ix <= 3; ix++)
        for (let iy = -3; iy <= 3; iy++)
          for (let iz = -3; iz <= 3; iz++) {
            const r2 = ix*ix + iy*iy + iz*iz;
            if (r2 <= 13) pts.push({ x: ix / 3.6, y: iy / 3.6, z: iz / 3.6 });
            const bx = ix + 0.5, by = iy + 0.5, bz = iz + 0.5;
            if (bx*bx + by*by + bz*bz <= 13) pts.push({ x: bx / 3.6, y: by / 3.6, z: bz / 3.6 });
          }
      return dedupeAndSample(pts, n);
    }

    case 'hex': {
      const pts: { x: number; y: number; z: number }[] = [];
      const h = Math.sqrt(3) / 2;
      for (let iy = -4; iy <= 4; iy++)
        for (let ix = -5; ix <= 5; ix++)
          for (let iz = -5; iz <= 5; iz++) {
            const xoff = iy % 2 === 0 ? 0 : 0.5;
            const px = (ix + xoff) / 3.8;
            const py = iy * h * 0.816 / 3.8;
            const pz = iz / 3.8;
            if (px*px + py*py + pz*pz <= 1.0) pts.push({ x: px, y: py, z: pz });
          }
      return dedupeAndSample(pts, n);
    }

    case 'dia': {
      // Two interpenetrating FCC sublattices offset by (0.25, 0.25, 0.25)
      const half = Math.ceil(n / 2);
      const a = fibSpherePoints(half);
      const offset = 0.15;
      const b = fibSpherePoints(n - half).map(p => ({
        x: p.x * 0.88 + offset,
        y: p.y * 0.88 + offset,
        z: p.z * 0.88 + offset,
      }));
      return [...a, ...b];
    }

    case 'graph': {
      // Graphene: flat hexagonal sheet
      const pts: { x: number; y: number; z: number }[] = [];
      const h = Math.sqrt(3) / 2;
      for (let ix = -8; ix <= 8; ix++)
        for (let iz = -8; iz <= 8; iz++) {
          const xoff = iz % 2 === 0 ? 0 : 0.5;
          const px = (ix + xoff) / 5.5;
          const py = (Math.random() - 0.5) * 0.015;
          const pz = iz * h / 5.5;
          if (px*px + pz*pz <= 0.98) {
            pts.push({ x: px, y: py, z: pz });
            const px2 = px + 0.165, pz2 = pz + 0.095;
            if (px2*px2 + pz2*pz2 <= 0.98) pts.push({ x: px2, y: py, z: pz2 });
          }
        }
      return dedupeAndSample(pts, n);
    }

    case 'quasi': {
      // Icosahedral quasicrystal shells (Penrose / E₈-inspired)
      const phi = (1 + Math.sqrt(5)) / 2;
      const r = 1 / Math.sqrt(1 + phi * phi);
      const ico = [
        [0, r, r*phi], [0, -r, r*phi], [0, r, -r*phi], [0, -r, -r*phi],
        [r, r*phi, 0], [-r, r*phi, 0], [r, -r*phi, 0], [-r, -r*phi, 0],
        [r*phi, 0, r], [-r*phi, 0, r], [r*phi, 0, -r], [-r*phi, 0, -r],
      ];
      const pts: { x: number; y: number; z: number }[] = [];
      for (let shell = 1; shell <= 5; shell++) {
        const scale = shell * 0.22;
        for (const [x, y, z] of ico) {
          pts.push({ x: x * scale, y: y * scale, z: z * scale });
          pts.push({ x: x * scale * 0.62, y: y * scale * phi * 0.38, z: z * scale * 0.62 });
        }
      }
      while (pts.length < n + 5) {
        const v = ico[Math.floor(Math.random() * ico.length)];
        const s = 0.1 + Math.random() * 0.9;
        pts.push({ x: v[0]*s, y: v[1]*s, z: v[2]*s });
      }
      return pts.slice(0, n);
    }

    default:
      return fibSpherePoints(n);
  }
}

function getShellLayout(gridType: string, n: number): ShellLayout {
  const sites3d = getShellPoints(gridType, n);
  const neighborCount = gridType === 'graph' ? 3 : gridType === 'dia' ? 4 : 5;
  return {
    sites3d,
    bonds: buildBondPairs(sites3d, neighborCount),
  };
}

export default function NullForgeApp() {
  const isSuspended = useContext(WindowSuspendedContext);
  const [modeIdx, setModeIdx] = useState(0);
  const [elemIdx, setElemIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [placedCount, setPlacedCount] = useState(0);
  const shellLayout = useMemo(() => getShellLayout(CRYSTAL_MODES[modeIdx].gridType, SHELL_N), [modeIdx]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    placed: boolean[];
    sites3d: { x: number; y: number; z: number }[];
    bonds: Array<[number, number]>;
    beamPhase: number;
    rotAngle: number;
    placedCount: number;
    flying: FlyingAtom[];
    nextId: number;
  }>({
    placed: new Array(SHELL_N).fill(false),
    sites3d: shellLayout.sites3d,
    bonds: shellLayout.bonds,
    beamPhase: 0,
    rotAngle: 0,
    placedCount: 0,
    flying: [],
    nextId: 0,
  });

  const mode = CRYSTAL_MODES[modeIdx];
  const elem = ELEMENTS[elemIdx];

  const resetBuildState = useCallback((nextShellLayout: ShellLayout) => {
    const s = stateRef.current;
    s.sites3d = nextShellLayout.sites3d;
    s.bonds = nextShellLayout.bonds;
    s.placed = new Array(SHELL_N).fill(false);
    s.placedCount = 0;
    s.flying = [];
    s.rotAngle = 0;
    setPlacedCount(0);
    setRunning(false);
  }, []);

  const rebuildLattice = useCallback(() => {
    resetBuildState(shellLayout);
  }, [resetBuildState, shellLayout]);

  // Main canvas animation loop
  useEffect(() => {
    if (isSuspended) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;

    const loop = (rawTime: number) => {
      raf = requestAnimationFrame(loop);
      const s = stateRef.current;
      s.beamPhase = rawTime * 0.001;
      if (running) s.rotAngle += 0.0025;

      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;
      const shellR = Math.min(W, H) * 0.33;
      const outerR = Math.min(W, H) * 0.50;

      ctx.clearRect(0, 0, W, H);

      // Project all sphere sites
      const projected = s.sites3d.map(p => project(p, cx, cy, shellR, s.rotAngle));

      // ADE orbit overlay (faint background)
      drawADEOrbit(ctx, cx, cy, shellR * 1.05, mode.q, mode.p, s.beamPhase * 0.3, 'rgba(0,0,0,0.04)');

      // Sphere outline
      ctx.beginPath();
      ctx.arc(cx, cy, shellR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Equator ellipse for depth cue
      ctx.beginPath();
      ctx.ellipse(cx, cy, shellR, shellR * 0.14, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Back-hemisphere sites
      for (let i = 0; i < SHELL_N; i++) {
        if (projected[i].depth >= 0) continue;
        const { x, y } = projected[i];
        if (s.placed[i]) {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = elem.color + '44';
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.04)';
          ctx.fill();
        }
      }

      // Advance flying atoms
      const toRemove = new Set<number>();
      for (let fi = 0; fi < s.flying.length; fi++) {
        const fa = s.flying[fi];
        if (fa.ejecting) {
          fa.ejectX += fa.ejectVX * 2.5;
          fa.ejectY += fa.ejectVY * 2.5;
          fa.ejectFade -= 0.04;
          if (fa.ejectFade <= 0) toRemove.add(fi);
        } else {
          fa.progress = Math.min(1, fa.progress + fa.speed * 0.016);
          fa.sortPulse = Math.min(1, fa.sortPulse + fa.speed * 1.8 * 0.016);
          if (fa.rejected && fa.sortPulse >= 0.92) {
            fa.ejecting = true;
            const pos = bezierAt(fa.progress, fa.fromX, fa.fromY, fa.cpX, fa.cpY, fa.tx, fa.ty);
            fa.ejectX = pos.x;
            fa.ejectY = pos.y;
            fa.ejectFade = 1;
          }
          if (fa.progress >= 1 && !fa.rejected) {
            if (!s.placed[fa.siteIdx]) {
              s.placed[fa.siteIdx] = true;
              s.placedCount++;
              setPlacedCount(s.placedCount);
            }
            toRemove.add(fi);
          }
        }
      }

      // Draw ODT beams and flying atoms
      for (let fi = 0; fi < s.flying.length; fi++) {
        if (toRemove.has(fi)) continue;
        const fa = s.flying[fi];
        if (fa.ejecting) {
          if (fa.ejectFade > 0) {
            ctx.globalAlpha = fa.ejectFade;
            ctx.beginPath();
            ctx.arc(fa.ejectX, fa.ejectY, elem.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ff5544';
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = `bold ${Math.max(7, elem.radius * 0.85)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✕', fa.ejectX, fa.ejectY);
            ctx.globalAlpha = 1;
          }
          continue;
        }
        const pos = bezierAt(fa.progress, fa.fromX, fa.fromY, fa.cpX, fa.cpY, fa.tx, fa.ty);
        const ax = pos.x, ay = pos.y;

        // 6 convergent ODT beams
        for (let b = 0; b < 6; b++) {
          const ang = fa.beamAngles[b];
          const srcX = cx + outerR * Math.cos(ang);
          const srcY = cy + outerR * Math.sin(ang);
          const alpha = 0.12 + 0.05 * Math.sin(s.beamPhase * 3 + b * 1.05);
          const grd = ctx.createLinearGradient(srcX, srcY, ax, ay);
          grd.addColorStop(0, 'rgba(80,200,255,0)');
          grd.addColorStop(0.55, `rgba(80,200,255,${alpha})`);
          grd.addColorStop(1, `rgba(130,230,255,${alpha * 2.8})`);
          ctx.beginPath();
          ctx.moveTo(srcX, srcY);
          ctx.lineTo(ax, ay);
          ctx.strokeStyle = grd;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Sort photon pulse
          if (b === fa.sortBeamIdx) {
            const pp = fa.sortPulse;
            const pxs = srcX + (ax - srcX) * pp;
            const pys = srcY + (ay - srcY) * pp;
            ctx.beginPath();
            ctx.arc(pxs, pys, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = fa.rejected ? 'rgba(255,80,60,0.95)' : 'rgba(200,255,240,0.95)';
            ctx.fill();
          }
        }
        // Convergence glow
        const glowA = 0.22 + 0.1 * Math.sin(s.beamPhase * 5);
        const grd2 = ctx.createRadialGradient(ax, ay, 0, ax, ay, 20);
        grd2.addColorStop(0, `rgba(80,200,255,${glowA})`);
        grd2.addColorStop(1, 'rgba(80,200,255,0)');
        ctx.beginPath();
        ctx.arc(ax, ay, 20, 0, Math.PI * 2);
        ctx.fillStyle = grd2;
        ctx.fill();
        // Atom glow
        const r = elem.radius;
        const atomGrd = ctx.createRadialGradient(ax - r * 0.3, ay - r * 0.3, 0, ax, ay, r * 1.8);
        atomGrd.addColorStop(0, '#ffffff');
        atomGrd.addColorStop(0.35, elem.color);
        atomGrd.addColorStop(1, elem.color + '00');
        ctx.beginPath();
        ctx.arc(ax, ay, r * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = atomGrd;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ax, ay, r, 0, Math.PI * 2);
        ctx.fillStyle = elem.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(7, r * 0.9)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(elem.symbol, ax, ay);
      }

      // Bonds between physically adjacent placed sites
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = elem.color + '35';
      for (const [i, j] of s.bonds) {
        if (!s.placed[i] || !s.placed[j] || projected[i].depth < 0 || projected[j].depth < 0) {
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(projected[i].x, projected[i].y);
        ctx.lineTo(projected[j].x, projected[j].y);
        ctx.stroke();
      }

      // Front-hemisphere placed atoms
      for (let i = 0; i < SHELL_N; i++) {
        if (!s.placed[i] || projected[i].depth < 0) continue;
        const { x, y, depth } = projected[i];
        const brightness = 0.45 + 0.55 * ((depth + 1) / 2);
        const grd = ctx.createRadialGradient(x, y, 0, x, y, elem.radius * 2);
        grd.addColorStop(0, elem.color + 'bb');
        grd.addColorStop(1, elem.color + '00');
        ctx.beginPath();
        ctx.arc(x, y, elem.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 3 * brightness, 0, Math.PI * 2);
        ctx.fillStyle = elem.color;
        ctx.fill();
      }
      // Ghost sites (front)
      for (let i = 0; i < SHELL_N; i++) {
        if (s.placed[i] || projected[i].depth < 0) continue;
        ctx.beginPath();
        ctx.arc(projected[i].x, projected[i].y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fill();
      }

      // Spawn new flying atoms
      const maxFlying = Math.min(9, MAX_FLYING + Math.floor(speed / 3));
      if (running && s.flying.length < maxFlying) {
        const active = new Set(s.flying.map(f => f.siteIdx));
        const nextIdx = s.placed.findIndex((placed, i) => !placed && !active.has(i));
        if (nextIdx !== -1) {
          const tgt = projected[nextIdx];
          const srcAngle = Math.random() * Math.PI * 2;
          const srcR = outerR * (0.85 + Math.random() * 0.15);
          const fromX = cx + srcR * Math.cos(srcAngle);
          const fromY = cy + srcR * Math.sin(srcAngle);
          const midX = (fromX + tgt.x) / 2;
          const midY = (fromY + tgt.y) / 2;
          const inF = 0.35 + Math.random() * 0.3;
          const cpX = midX + (cx - midX) * inF;
          const cpY = midY + (cy - midY) * inF;
          const rejected = Math.random() < 0.13;
          const beamAngles = Array.from({ length: 6 }, (_, b) =>
            srcAngle + b * (Math.PI / 3) + (Math.random() * 0.15 - 0.075)
          );
          const baseSpeed = (0.3 + Math.random() * 0.2) * (0.5 + speed * 0.07);
          s.flying.push({
            id: s.nextId++,
            fromX, fromY, tx: tgt.x, ty: tgt.y, cpX, cpY,
            siteIdx: nextIdx, progress: 0, speed: baseSpeed,
            rejected, sortPulse: 0,
            sortBeamIdx: Math.floor(Math.random() * 6),
            beamAngles,
            ejecting: false,
            ejectX: 0, ejectY: 0,
            ejectVX: (Math.random() - 0.5) * 4,
            ejectVY: -2 - Math.random() * 2,
            ejectFade: 1,
          });
        }
      }

      // Remove completed atoms (reverse order)
      const indices = [...toRemove].sort((a, b) => b - a);
      for (const i of indices) s.flying.splice(i, 1);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, mode, elem, isSuspended]);

  const buildComplete = placedCount >= SHELL_N;
  const progress = placedCount / SHELL_N;
  // 10⁶ atoms/s — 120 sites → 120 μs
  const buildTimeStr = SHELL_N < 1000
    ? `${SHELL_N} μs`
    : `${(SHELL_N / 1000).toFixed(1)} ms`;

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-white font-mono select-none overflow-hidden">
      {/* Left: Canvas */}
      <div className="flex-1 relative flex items-center justify-center bg-[#faf9f6] border-r border-black/5 min-h-0">
        <canvas ref={canvasRef} width={500} height={500} className="w-full h-full max-w-[500px] max-h-[500px]" />

        {/* Overlay stats */}
        <div className="absolute top-4 left-4 space-y-0.5">
          <div className="text-[9px] tracking-[0.4em] text-black/30 uppercase font-bold">ADE Class</div>
          <div className="text-lg font-bold text-black">{mode.ade}</div>
          <div className="text-[9px] text-black/40 uppercase">{mode.name}</div>
        </div>
        <div className="absolute top-4 right-4 text-right space-y-0.5">
          <div className="text-[9px] tracking-[0.4em] text-black/30 uppercase font-bold">Atoms Placed</div>
          <div className="text-lg font-bold text-black">{placedCount.toLocaleString()}</div>
          <div className="text-[9px] text-black/40">{SHELL_N} sites</div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex justify-between text-[8px] text-black/30 uppercase tracking-widest mb-1">
            <span>Shell Assembly</span>
            <span>{(progress * 100).toFixed(1)}%</span>
          </div>
          <div className="h-[2px] bg-black/5 rounded-full">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: mode.color }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          {buildComplete && (
            <div className="mt-2 text-[9px] text-center tracking-[0.3em] uppercase text-black/40 font-bold">◊ SHELL COMPLETE</div>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="w-full md:w-[300px] flex flex-col border-t md:border-t-0 border-black/10 overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-black/5 bg-black text-white shrink-0">
          <div className="text-[10px] tracking-[0.3em] font-bold uppercase">◊.NULL_FORGE</div>
          <div className="text-[8px] text-white/30 mt-1 uppercase tracking-widest">Atomic Shell Fabrication</div>
        </div>

        {/* Crystal Type */}
        <div className="p-4 border-b border-black/5 shrink-0">
          <div className="text-[9px] tracking-[0.3em] text-black/30 uppercase mb-2 font-bold">Crystal Structure</div>
          <div className="grid grid-cols-2 gap-1.5">
            {CRYSTAL_MODES.map((m, i) => (
              <button
                key={m.id}
                onClick={() => {
                  setModeIdx(i);
                  resetBuildState(getShellLayout(CRYSTAL_MODES[i].gridType, SHELL_N));
                }}
                className={`px-2 py-2 text-left border transition-all ${modeIdx === i ? 'border-black bg-black text-white' : 'border-black/10 hover:border-black/30'}`}
              >
                <div className="text-[9px] font-bold uppercase tracking-wide truncate">{m.name}</div>
                <div className="text-[8px] opacity-50">{m.ade} · {m.symbol}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Element Palette */}
        <div className="p-4 border-b border-black/5 shrink-0">
          <div className="text-[9px] tracking-[0.3em] text-black/30 uppercase mb-2 font-bold">Element Feedstock</div>
          <div className="grid grid-cols-3 gap-1.5">
            {ELEMENTS.map((e, i) => (
              <button
                key={e.symbol}
                onClick={() => setElemIdx(i)}
                className={`py-2 flex flex-col items-center border transition-all ${elemIdx === i ? 'border-black' : 'border-black/10 hover:border-black/30'}`}
              >
                <div
                  className="w-5 h-5 rounded-full mb-1 border-2"
                  style={{ backgroundColor: e.color, borderColor: elemIdx === i ? '#000' : 'transparent' }}
                />
                <div className="text-[8px] font-bold">{e.symbol}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Speed */}
        <div className="p-4 border-b border-black/5 shrink-0">
          <div className="flex justify-between text-[9px] text-black/30 uppercase tracking-widest mb-2">
            <span>ODT Pull Rate</span>
            <span className="font-bold text-black">{(speed * 0.35 * 60).toFixed(0)} atoms/s</span>
          </div>
          <input
            type="range" min={1} max={20} value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="w-full accent-black"
          />
        </div>

        {/* Controls */}
        <div className="p-4 space-y-2 shrink-0">
          <button
            onClick={() => setRunning(r => !r)}
            className={`w-full py-3 border font-bold text-[10px] tracking-[0.3em] uppercase transition-all ${running ? 'border-black bg-black text-white' : 'border-black hover:bg-black hover:text-white'}`}
          >
            {running ? '⏸ PAUSE BUILD' : buildComplete ? '◊ COMPLETE' : '▶ START BUILD'}
          </button>
          <button
            onClick={rebuildLattice}
            className="w-full py-2 border border-black/10 text-black/40 text-[9px] tracking-[0.3em] uppercase hover:border-black/40 hover:text-black transition-all"
          >
            ↺ RESET SHELL
          </button>
        </div>

        {/* Info */}
        <div className="p-4 mt-auto border-t border-black/5 bg-black/[0.01]">
          <div className="text-[8px] text-black/30 leading-relaxed uppercase space-y-1">
            <div>ODT convergent beams × 6 @ 1064 nm</div>
            <div>Sort photon verifies atomic species</div>
            <div>α = pπ/q → {mode.q}-fold orbital symmetry</div>
            <div>Est. build time: ~{buildTimeStr} @ 10⁶ atoms/s</div>
            <div>Lattice: {mode.symbol}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
