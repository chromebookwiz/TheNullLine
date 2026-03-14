"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Cpu, Atom } from 'lucide-react';

// NullBilliards manifold sequence: (q, p) pairs from Fibonacci
// α = pπ/q — photon closes after q reflections when p/q is rational
const MANIFOLD_SEQUENCE = [
  { q: 3,  p: 1,  name: "Triangle",            speedMult: 1.0,  dir:  1 },
  { q: 5,  p: 2,  name: "Pentagram",           speedMult: 0.8,  dir: -1 },
  { q: 8,  p: 3,  name: "Octagram",            speedMult: 0.6,  dir:  1 },
  { q: 13, p: 5,  name: "Tridecagram",         speedMult: 0.4,  dir: -1 },
  { q: 21, p: 8,  name: "Icosikaimonogram",    speedMult: 0.3,  dir:  1 },
  { q: 34, p: 13, name: "Tetracontadigon",     speedMult: 0.2,  dir: -1 },
  { q: 55, p: 21, name: "Pentacontapentagram", speedMult: 0.15, dir:  1 },
  { q: 89, p: 34, name: "Enneacontaenneagram", speedMult: 0.1,  dir: -1 },
];

const UPGRADES = [
  { id: 'photon_coupling',    name: 'Coupling',    description: '+1 click', baseCost: 10,   bounceBonus: 1,  autoBonus: 0, icon: <Zap size={14} /> },
  { id: 'billiard_resonance', name: 'Resonance',   description: '+5 click', baseCost: 100,  bounceBonus: 5,  autoBonus: 0, icon: <TrendingUp size={14} /> },
  { id: 'manifold_refinement',name: 'Refinement',  description: '+20 click', baseCost: 500,  bounceBonus: 20, autoBonus: 0, icon: <Cpu size={14} /> },
  { id: 'null_localization',  name: 'Localization',description: '+1 auto',  baseCost: 250,  bounceBonus: 0,  autoBonus: 1, icon: <Atom size={14} /> },
];

const NODE_FILL_COST = 4;
const LINK_FILL_COST = 8;
const RING_TICKS_TARGET = 144;

// Exact same drawStarPolygon as GeometricBackground
function drawStarPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  q: number, p: number, rotation: number,
  lineWidth: number, color: string
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  for (let i = 0; i <= q; i++) {
    const angle = (i * p * 2 * Math.PI) / q + rotation;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// ── Phase-specific canvas renderers ──────────────────────────────────────────
type GamePhase = 'manifold' | 'hypercube' | 'metalattice' | 'ring_tick' | 'circles_square';

function drawHypercube(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  nodes: boolean[],
  time: number
) {
  const cx = W / 2, cy = H / 2;
  const scale = Math.min(W, H) * 0.088;
  const rot = time * 0.00007;

  const pts2d: { x: number; y: number; depth: number; filled: boolean }[] = [];
  let idx = 0;
  for (let iy = 0; iy < 4; iy++) {
    for (let ix = 0; ix < 5; ix++) {
      for (let iz = 0; iz < 5; iz++) {
        const x = (ix - 2) / 2.6;
        const y = (iy - 1.5) / 2.0;
        const z = (iz - 2) / 2.6;
        const rx = x * Math.cos(rot) + z * Math.sin(rot);
        const rz = -x * Math.sin(rot) + z * Math.cos(rot);
        const iso = Math.PI / 6;
        const px = cx + (rx - rz) * Math.cos(iso) * scale;
        const py = cy + ((rx + rz) * Math.sin(iso) - y) * scale;
        pts2d.push({ x: px, y: py, depth: rz, filled: nodes[idx] });
        idx++;
      }
    }
  }
  pts2d.sort((a, b) => a.depth - b.depth);

  for (const pt of pts2d) {
    if (pt.filled) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.fill();
    }
  }
}

function drawMetalattice(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  nodes: boolean[]
) {
  const cx = W / 2, cy = H / 2;
  const cellSize = Math.min(W, H) * 0.082;
  const s = cellSize * 0.28;
  const startX = cx - 4.5 * cellSize;
  const startY = cy - 4.5 * cellSize;

  let idx = 0;
  for (let gy = 0; gy < 10; gy++) {
    for (let gx = 0; gx < 10; gx++) {
      const px = startX + gx * cellSize + cellSize / 2;
      const py = startY + gy * cellSize + cellSize / 2;
      const filled = nodes[idx];

      if (filled) {
        ctx.fillStyle = 'rgba(0,0,0,0.88)';
        ctx.fillRect(px - s, py - s * 0.6, s * 2, s * 1.2);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.moveTo(px - s, py - s * 0.6);
        ctx.lineTo(px,     py - s * 0.6 - s * 0.55);
        ctx.lineTo(px + s, py - s * 0.6);
        ctx.lineTo(px,     py - s * 0.6 + s * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.moveTo(px + s, py - s * 0.6);
        ctx.lineTo(px + s, py + s * 0.6);
        ctx.lineTo(px,     py + s * 0.6 + s * 0.3);
        ctx.lineTo(px,     py - s * 0.6 + s * 0.3);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(px - s, py - s * 0.6, s * 2, s * 1.2);
      }
      idx++;
    }
  }
}

function drawRingTick(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  ticks: number,
  ringsComplete: number,
  time: number
) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.36;
  const dotR = 3.5;
  const N = 100; // cubes rearranged as circle

  // Background ring track
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // Draw 100 cube-dots arranged on the circle
  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    const x = cx + R * Math.cos(angle);
    const y = cy + R * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
  }

  // Tick arc progress across the active ring cycle.
  const tickFrac = ticks / RING_TICKS_TARGET;
  if (tickFrac > 0) {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 3;
    ctx.arc(cx, cy, R + 12, -Math.PI / 2, -Math.PI / 2 + tickFrac * Math.PI * 2);
    ctx.stroke();

    const tickStep = Math.max(12, Math.round(RING_TICKS_TARGET / 12));
    for (let t = 0; t < RING_TICKS_TARGET; t += tickStep) {
      const a = (t / RING_TICKS_TARGET) * Math.PI * 2 - Math.PI / 2;
      const inner = R + 8, outer = R + 16;
      ctx.beginPath();
      ctx.strokeStyle = t <= ticks ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.moveTo(cx + inner * Math.cos(a), cy + inner * Math.sin(a));
      ctx.lineTo(cx + outer * Math.cos(a), cy + outer * Math.sin(a));
      ctx.stroke();
    }
  }

  // Center label: tick count
  ctx.font = `bold ${Math.min(W, H) * 0.065}px monospace`;
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${ticks}`, cx, cy - 10);
  ctx.font = `${Math.min(W, H) * 0.025}px monospace`;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillText(`/ ${RING_TICKS_TARGET} TICKS`, cx, cy + 22);

  // Completed rings count (lower center)
  if (ringsComplete > 0) {
    ctx.font = `bold ${Math.min(W, H) * 0.022}px monospace`;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillText(`◎ × ${ringsComplete}`, cx, cy + 55);
  }

  // Slow-rotating ADE overlay
  drawStarPolygon(ctx, cx, cy, R * 0.5, 8, 3, time * 0.00005, 0.4, 'rgba(0,0,0,0.04)');
}

function drawCirclesSquare(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  ringsComplete: number
) {
  const n = Math.floor(Math.sqrt(ringsComplete));
  if (n < 2) return;
  const cx = W / 2, cy = H / 2;
  const spacing = Math.min(W, H) / (n + 2);
  const circR = spacing * 0.35;

  ctx.font = `bold ${Math.min(W, H) * 0.028}px monospace`;
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${n}×${n} CIRCLE SQUARE`, cx, cy - (n / 2) * spacing - spacing * 0.7);

  for (let gy = 0; gy < n; gy++) {
    for (let gx = 0; gx < n; gx++) {
      const px = cx + (gx - (n - 1) / 2) * spacing;
      const py = cy + (gy - (n - 1) / 2) * spacing;
      // Outer ring
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1.5;
      ctx.arc(px, py, circR, 0, Math.PI * 2);
      ctx.stroke();
      // Inner dot
      ctx.beginPath();
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.arc(px, py, circR * 0.28, 0, Math.PI * 2);
      ctx.fill();
      // Tick arc (fully completed)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2.5;
      ctx.arc(px, py, circR + 4, -Math.PI / 2, 3 * Math.PI / 2);
      ctx.stroke();
    }
  }

  ctx.font = `${Math.min(W, H) * 0.022}px monospace`;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillText('CLICK TO CONTINUE', cx, cy + (n / 2) * spacing + spacing * 0.65);
}

export default function ShapeClicker() {
  const [level, setLevel]               = useState(0);
  const [bounces, setBounces]           = useState(0);
  const [energy, setEnergy]             = useState(0);
  const [bouncesPerClick, setBouncesPerClick] = useState(1);
  const [autoBounceRate, setAutoBounceRate]   = useState(0);
  const [purchased, setPurchased]       = useState<Record<string, number>>({});
  const [pulse, setPulse]               = useState(false);
  const [phase, setPhase]               = useState<GamePhase>('manifold');
  const [cubeCount, setCubeCount]       = useState(0);
  const [metaCount, setMetaCount]       = useState(0);
  const [ringTicks, setRingTicks]       = useState(0);
  const [ringsComplete, setRingsComplete] = useState(0);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const miniRef      = useRef<HTMLCanvasElement>(null);
  const phaseRef     = useRef<GamePhase>('manifold');
  const cubeNodesRef = useRef<boolean[]>(new Array(100).fill(false));
  const cubeCountRef = useRef(0);
  const metaNodesRef = useRef<boolean[]>(new Array(100).fill(false));
  const metaCountRef = useRef(0);
  const ringTicksRef    = useRef(0);
  const ringsCompleteRef = useRef(0);

  // Refs so canvas loop always sees fresh state without restarting
  const levelRef         = useRef(level);
  const bouncesRef       = useRef(bounces);

  const current = MANIFOLD_SEQUENCE[Math.min(level, MANIFOLD_SEQUENCE.length - 1)];
  const next    = MANIFOLD_SEQUENCE[Math.min(level + 1, MANIFOLD_SEQUENCE.length - 1)];

  useEffect(() => {
    levelRef.current = level;
    bouncesRef.current = bounces;
    phaseRef.current = phase;
  }, [level, bounces, phase]);

  // Reset metalattice nodes for a fresh cycle
  const resetCube = () => {
    cubeNodesRef.current = new Array(100).fill(false);
    cubeCountRef.current = 0;
    setCubeCount(0);
  };

  const resetMeta = () => {
    metaNodesRef.current = new Array(100).fill(false);
    metaCountRef.current = 0;
    setMetaCount(0);
  };

  const resetRing = () => {
    ringTicksRef.current = 0;
    setRingTicks(0);
  };

  // --- Advance logic ---
  const advance = useCallback((count: number) => {
    setEnergy(e => e + count);

    if (phaseRef.current === 'manifold') {
      const needed = MANIFOLD_SEQUENCE[Math.min(levelRef.current, MANIFOLD_SEQUENCE.length - 1)].q;
      const newB   = bouncesRef.current + count;
      if (newB >= needed && levelRef.current < MANIFOLD_SEQUENCE.length - 1) {
        setLevel(l => l + 1);
        setBounces(newB - needed);
      } else if (newB >= needed) {
        setPhase('hypercube');
        phaseRef.current = 'hypercube';
        setBounces(0);
      } else {
        setBounces(newB);
      }

    } else if (phaseRef.current === 'hypercube') {
      const newB = bouncesRef.current + count;
      const fillCount = Math.floor(newB / NODE_FILL_COST);
      const rem = newB % NODE_FILL_COST;
      if (fillCount > 0 && cubeCountRef.current < 100) {
        const end = Math.min(100, cubeCountRef.current + fillCount);
        for (let i = cubeCountRef.current; i < end; i++) cubeNodesRef.current[i] = true;
        cubeCountRef.current = end;
        setCubeCount(end);
        if (end >= 100) {
          setPhase('metalattice');
          phaseRef.current = 'metalattice';
          setBounces(0);
          return;
        }
      }
      setBounces(rem);

    } else if (phaseRef.current === 'metalattice') {
      const newB = bouncesRef.current + count;
      const fillCount = Math.floor(newB / LINK_FILL_COST);
      const rem = newB % LINK_FILL_COST;
      if (fillCount > 0 && metaCountRef.current < 100) {
        const end = Math.min(100, metaCountRef.current + fillCount);
        for (let i = metaCountRef.current; i < end; i++) metaNodesRef.current[i] = true;
        metaCountRef.current = end;
        setMetaCount(end);
        if (end >= 100) {
          resetRing();
          setPhase('ring_tick');
          phaseRef.current = 'ring_tick';
          resetMeta();
          setBounces(0);
          return;
        }
      }
      setBounces(rem);

    } else if (phaseRef.current === 'ring_tick') {
      const newTicks = ringTicksRef.current + count;
      if (newTicks >= RING_TICKS_TARGET) {
        const completed = ringsCompleteRef.current + 1;
        ringsCompleteRef.current = completed;
        setRingsComplete(completed);
        resetRing();
        const sqrtC = Math.sqrt(completed);
        if (Number.isInteger(sqrtC) && sqrtC >= 2) {
          setPhase('circles_square');
          phaseRef.current = 'circles_square';
        } else {
          resetCube();
          resetMeta();
          setPhase('hypercube');
          phaseRef.current = 'hypercube';
        }
      } else {
        ringTicksRef.current = newTicks;
        setRingTicks(newTicks);
      }

    } else if (phaseRef.current === 'circles_square') {
      resetCube();
      resetMeta();
      resetRing();
      setPhase('hypercube');
      phaseRef.current = 'hypercube';
      setBounces(0);
    }
  }, []);

  // Auto-bounce via interval — uses ref to avoid stale closure
  const advanceRef = useRef(advance);

  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  useEffect(() => {
    if (autoBounceRate <= 0) return;
    const id = setInterval(() => advanceRef.current(autoBounceRate), 1000);
    return () => clearInterval(id);
  }, [autoBounceRate]);

  // --- Main canvas ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;

    const loop = (time: number) => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const ph = phaseRef.current;

      if (ph === 'hypercube') {
        drawHypercube(ctx, width, height, cubeNodesRef.current, time);
        const r = Math.min(width, height) * 0.45;
        const cx = width / 2, cy = height / 2;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.14)';
        ctx.lineWidth = 2.5;
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (cubeCountRef.current / 100) * Math.PI * 2);
        ctx.stroke();

      } else if (ph === 'metalattice') {
        drawMetalattice(ctx, width, height, metaNodesRef.current);
        const r = Math.min(width, height) * 0.47;
        const cx = width / 2, cy = height / 2;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.14)';
        ctx.lineWidth = 2.5;
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (metaCountRef.current / 100) * Math.PI * 2);
        ctx.stroke();

      } else if (ph === 'ring_tick') {
        drawRingTick(ctx, width, height, ringTicksRef.current, ringsCompleteRef.current, time);

      } else if (ph === 'circles_square') {
        drawCirclesSquare(ctx, width, height, ringsCompleteRef.current);

      } else {
        // manifold
        const cx = width / 2, cy = height / 2;
        const r  = Math.min(width, height) * 0.35;
        const { q, p, speedMult, dir } = MANIFOLD_SEQUENCE[Math.min(levelRef.current, MANIFOLD_SEQUENCE.length - 1)];
        const nextM = MANIFOLD_SEQUENCE[Math.min(levelRef.current + 1, MANIFOLD_SEQUENCE.length - 1)];
        const speed = time * 0.0001;
        const rot   = speed * speedMult * dir;

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        if (levelRef.current < MANIFOLD_SEQUENCE.length - 1) {
          drawStarPolygon(ctx, cx, cy, r, nextM.q, nextM.p, -rot * 0.6, 0.5, 'rgba(0,0,0,0.07)');
        }
        drawStarPolygon(ctx, cx, cy, r, q, p, rot, 1.8, 'rgba(0,0,0,0.9)');

        const needed   = MANIFOLD_SEQUENCE[Math.min(levelRef.current, MANIFOLD_SEQUENCE.length - 1)].q;
        const progress = bouncesRef.current / needed;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.20)';
        ctx.lineWidth = 2.5;
        ctx.arc(cx, cy, r + 10, -Math.PI / 2, -Math.PI / 2 + progress * 2 * Math.PI);
        ctx.stroke();
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // intentionally empty — uses refs for live state

  // --- Mini preview canvas ---
  useEffect(() => {
    const canvas = miniRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 60, 60);
    const { q, p } = current;
    drawStarPolygon(ctx, 30, 30, 22, q, p, -Math.PI / 2, 1.5, '#222');
  }, [current]);

  const handleClick = () => {
    advance(bouncesPerClick);
    setPulse(true);
    setTimeout(() => setPulse(false), 120);
  };

  const buyUpgrade = (up: typeof UPGRADES[0]) => {
    const count = purchased[up.id] || 0;
    const cost  = Math.floor(up.baseCost * Math.pow(1.5, count));
    if (energy < cost) return;
    setEnergy(e => e - cost);
    setPurchased(p => ({ ...p, [up.id]: count + 1 }));
    if (up.bounceBonus > 0) setBouncesPerClick(b => b + up.bounceBonus);
    if (up.autoBonus > 0)   setAutoBounceRate(r => r + up.autoBonus);
  };

  const needed = current.q;

  const statusLabel = () => {
    if (phase === 'manifold') return current.name;
    if (phase === 'hypercube') return 'Node Fill';
    if (phase === 'metalattice') return 'Link Pass';
    if (phase === 'ring_tick') return 'Ring Closure';
    return 'Square';
  };

  const statusValue = () => {
    if (phase === 'manifold') return `${bounces}/${needed}`;
    if (phase === 'hypercube') return `${cubeCount}/100`;
    if (phase === 'metalattice') return `${metaCount}/100`;
    if (phase === 'ring_tick') return `${ringTicks}/${RING_TICKS_TARGET}`;
    return `${Math.floor(Math.sqrt(ringsComplete))}²`;
  };

  const phaseLabel = () => {
    if (phase === 'manifold') return next.name;
    if (phase === 'hypercube') return 'Link Pass';
    if (phase === 'metalattice') return 'Ring';
    if (phase === 'ring_tick') return `◎ ${ringsComplete}`;
    if (phase === 'circles_square') return 'Reset';
    return '';
  };

  const phaseHint = () => {
    if (phase === 'manifold') return `Close q=${needed}`;
    if (phase === 'hypercube') return `1 node / ${NODE_FILL_COST}`;
    if (phase === 'metalattice') return `1 link / ${LINK_FILL_COST}`;
    if (phase === 'ring_tick') return `Finish ${RING_TICKS_TARGET}`;
    return 'Click to loop';
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-white font-mono select-none overflow-hidden">
      {/* Left Panel */}
      <div className="flex-1 relative flex flex-col items-center justify-center border-r border-black/5 bg-black/[0.01]">
        <div className="absolute top-3 left-3">
          <canvas ref={miniRef} width={60} height={60} className="w-10 h-10 opacity-80" />
        </div>

        <div className="absolute top-8 left-8 space-y-0.5">
          {phase === 'manifold' && (
            <>
              <div className="text-[10px] tracking-[0.4em] text-black/30 font-bold uppercase">Orbit</div>
              <div className="text-2xl font-bold tracking-tighter text-black">q={current.q} p={current.p}</div>
              <div className="text-[9px] text-black/30 uppercase tracking-widest">{current.name}</div>
            </>
          )}
          {phase === 'hypercube' && (
            <>
              <div className="text-[10px] tracking-[0.4em] text-black/30 font-bold uppercase">Nodes</div>
              <div className="text-2xl font-bold tracking-tighter text-black">100</div>
              <div className="text-[9px] text-black/30 uppercase tracking-widest">Fill the shell</div>
            </>
          )}
          {phase === 'metalattice' && (
            <>
              <div className="text-[10px] tracking-[0.4em] text-black/30 font-bold uppercase">Links</div>
              <div className="text-2xl font-bold tracking-tighter text-black">100</div>
              <div className="text-[9px] text-black/30 uppercase tracking-widest">Lock the ring</div>
            </>
          )}
          {phase === 'ring_tick' && (
            <>
              <div className="text-[10px] tracking-[0.4em] text-black/30 font-bold uppercase">Ring</div>
              <div className="text-2xl font-bold tracking-tighter text-black">◎</div>
              <div className="text-[9px] text-black/30 uppercase tracking-widest">Close the cycle</div>
            </>
          )}
          {phase === 'circles_square' && (
            <>
              <div className="text-[10px] tracking-[0.4em] text-black/30 font-bold uppercase">Square</div>
              <div className="text-2xl font-bold tracking-tighter text-black">{Math.floor(Math.sqrt(ringsComplete))}²</div>
              <div className="text-[9px] text-black/30 uppercase tracking-widest">Milestone</div>
            </>
          )}
        </div>

        <div className="absolute top-8 right-8 text-right space-y-0.5">
          <div className="text-[10px] tracking-[0.4em] text-black/30 font-bold uppercase">Energy</div>
          <div className="text-xl font-bold tracking-tighter text-black">{energy.toLocaleString()} eV</div>
          <div className="text-[9px] text-black/30 uppercase tracking-widest">{statusLabel()}</div>
        </div>

        <motion.div
          onClick={handleClick}
          animate={pulse ? { scale: 1.04 } : { scale: 1 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.1 }}
          className="relative cursor-pointer"
        >
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            className="w-[300px] h-[300px] md:w-[450px] md:h-[450px]"
          />
        </motion.div>

        <div className="absolute bottom-16 w-[200px] space-y-1">
          {phase === 'manifold' && (
            <>
              <div className="flex justify-between text-[8px] text-black/30 uppercase tracking-widest">
                <span>Orbit</span><span>{statusValue()}</span>
              </div>
              <div className="h-[2px] bg-black/5 rounded-full overflow-hidden">
                <div className="h-full bg-black/60 transition-all duration-100" style={{ width: `${Math.min((bounces / needed) * 100, 100)}%` }} />
              </div>
            </>
          )}
          {phase === 'hypercube' && (
            <>
              <div className="flex justify-between text-[8px] text-black/30 uppercase tracking-widest">
                <span>Nodes</span><span>{statusValue()}</span>
              </div>
              <div className="h-[2px] bg-black/5 rounded-full overflow-hidden">
                <div className="h-full bg-black/60 transition-all duration-100" style={{ width: `${cubeCount}%` }} />
              </div>
            </>
          )}
          {phase === 'metalattice' && (
            <>
              <div className="flex justify-between text-[8px] text-black/30 uppercase tracking-widest">
                <span>Links</span><span>{statusValue()}</span>
              </div>
              <div className="h-[2px] bg-black/5 rounded-full overflow-hidden">
                <div className="h-full bg-black/60 transition-all duration-100" style={{ width: `${metaCount}%` }} />
              </div>
            </>
          )}
          {phase === 'ring_tick' && (
            <>
              <div className="flex justify-between text-[8px] text-black/30 uppercase tracking-widest">
                <span>Ring</span><span>{statusValue()}</span>
              </div>
              <div className="h-[2px] bg-black/5 rounded-full overflow-hidden">
                <div className="h-full bg-black/60 transition-all duration-100" style={{ width: `${(ringTicks / RING_TICKS_TARGET) * 100}%` }} />
              </div>
            </>
          )}
          {phase === 'circles_square' && (
            <>
              <div className="flex justify-between text-[8px] text-black/30 uppercase tracking-widest">
                <span>Square</span><span>{statusValue()}</span>
              </div>
              <div className="h-[2px] bg-black/60 rounded-full overflow-hidden" />
            </>
          )}
        </div>

        <div className="absolute bottom-6 text-center">
          <div className="text-[9px] tracking-[0.3em] text-black/20 uppercase">Rate</div>
          <div className="text-[11px] font-bold text-black/60">+{bouncesPerClick} · {autoBounceRate}/s</div>
        </div>
      </div>

      {/* Right Panel: Upgrades */}
      <div className="w-full md:w-[350px] flex flex-col border-t md:border-t-0 border-black/10">
        <div className="p-6 border-b border-black/5 bg-black text-white flex items-center justify-between">
          <span className="text-[10px] tracking-[0.3em] font-bold uppercase">◊.UPGRADES</span>
          <div className="text-[9px] opacity-40 uppercase tracking-widest">Next: {phaseLabel()}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {UPGRADES.map((up) => {
            const count     = purchased[up.id] || 0;
            const cost      = Math.floor(up.baseCost * Math.pow(1.5, count));
            const canAfford = energy >= cost;
            return (
              <button
                key={up.id}
                onClick={() => buyUpgrade(up)}
                disabled={!canAfford}
                className={`w-full p-4 border text-left transition-all flex items-center gap-4 group ${
                  canAfford ? 'border-black hover:bg-black hover:text-white' : 'border-black/5 text-black/30 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`p-2 rounded-lg ${canAfford ? 'bg-black/5 group-hover:bg-white/10' : 'bg-black/[0.02]'}`}>
                  {up.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase">{up.name}</span>
                    <span className="text-[9px] opacity-40 font-bold">LVL_{count}</span>
                  </div>
                  <p className="text-[9px] opacity-60 uppercase tracking-tight">{up.description}</p>
                </div>
                <div className="text-[10px] font-bold tracking-tighter">{cost} eV</div>
              </button>
            );
          })}
        </div>

        <div className="p-6 bg-black/[0.02] border-t border-black/5">
          <div className="flex items-center justify-between text-[9px] text-black/30 leading-relaxed uppercase">
            <span>{phaseHint()}</span>
            <span>◎ {ringsComplete}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
