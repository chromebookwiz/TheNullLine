"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

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

// Generate 2D lattice site positions for a given grid type, in canvas coords
function getLatticePoints(type: string, cx: number, cy: number, scale: number): [number, number][] {
  const pts: [number, number][] = [];
  const s = scale;
  switch (type) {
    case 'fcc': {
      // 2D projection of FCC: square grid + face centres
      for (let ix = -3; ix <= 3; ix++) for (let iy = -3; iy <= 3; iy++) {
        pts.push([cx + ix * s, cy + iy * s]);
        pts.push([cx + ix * s + s / 2, cy + iy * s + s / 2]);
      }
      break;
    }
    case 'bcc': {
      for (let ix = -3; ix <= 3; ix++) for (let iy = -3; iy <= 3; iy++) {
        pts.push([cx + ix * s, cy + iy * s]);
        if (ix < 3 && iy < 3) pts.push([cx + ix * s + s / 2, cy + iy * s + s / 2]);
      }
      break;
    }
    case 'hex':
    case 'graph': {
      // Hexagonal / honeycomb
      const h = s * Math.sqrt(3) / 2;
      for (let ix = -4; ix <= 4; ix++) for (let iy = -4; iy <= 4; iy++) {
        const xoff = iy % 2 === 0 ? 0 : s / 2;
        pts.push([cx + ix * s + xoff, cy + iy * h]);
        if (type === 'graph') pts.push([cx + ix * s + xoff + s / 3, cy + iy * h + h / 3]);
      }
      break;
    }
    case 'dia': {
      // Diamond: two interpenetrating FCC, project as offset squares
      for (let ix = -3; ix <= 3; ix++) for (let iy = -3; iy <= 3; iy++) {
        pts.push([cx + ix * s, cy + iy * s]);
        pts.push([cx + ix * s + s / 4, cy + iy * s + s / 4]);
        pts.push([cx + ix * s + s / 2, cy + iy * s + s / 2]);
        pts.push([cx + ix * s + 3 * s / 4, cy + iy * s + 3 * s / 4]);
      }
      break;
    }
    case 'quasi': {
      // E₈ quasicrystal: pentagrid projection
      const angles = Array.from({ length: 5 }, (_, k) => k * Math.PI / 5);
      for (let r = 1; r <= 5; r++) {
        for (let k = 0; k < 10; k++) {
          const a = k * Math.PI / 5;
          pts.push([cx + r * s * Math.cos(a), cy + r * s * Math.sin(a)]);
          pts.push([cx + r * s * 0.618 * Math.cos(a + Math.PI / 10), cy + r * s * 0.618 * Math.sin(a + Math.PI / 10)]);
        }
      }
      pts.push([cx, cy]);
      break;
    }
    default: {
      for (let ix = -3; ix <= 3; ix++) for (let iy = -3; iy <= 3; iy++)
        pts.push([cx + ix * s, cy + iy * s]);
    }
  }
  // Filter to canvas bounds with generous margin and deduplicate
  const seen = new Set<string>();
  return pts.filter(([x, y]) => {
    const key = `${Math.round(x)},${Math.round(y)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return x > 20 && x < cx * 2 - 20 && y > 20 && y < cy * 2 - 20;
  });
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

export default function NullForgeApp() {
  const [modeIdx, setModeIdx] = useState(0);
  const [elemIdx, setElemIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(3); // atoms per frame batch
  const [placedCount, setPlacedCount] = useState(0);
  const [totalSites, setTotalSites] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    placed: [] as boolean[],
    sites: [] as [number, number][],
    beamPhase: 0,
    placedCount: 0,
    time: 0,
  });

  const mode = CRYSTAL_MODES[modeIdx];
  const elem = ELEMENTS[elemIdx];

  // Rebuild lattice when mode changes
  const rebuildLattice = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const sites = getLatticePoints(mode.gridType, cx, cy, 42);
    stateRef.current.sites = sites;
    stateRef.current.placed = new Array(sites.length).fill(false);
    stateRef.current.placedCount = 0;
    setPlacedCount(0);
    setTotalSites(sites.length);
    setRunning(false);
  }, [mode.gridType]);

  useEffect(() => { rebuildLattice(); }, [rebuildLattice]);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    let lastPlace = 0;

    const loop = (time: number) => {
      const s = stateRef.current;
      s.time = time;
      s.beamPhase = time * 0.002;

      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;

      // Background ADE orbit
      drawADEOrbit(ctx, cx, cy, Math.min(W, H) * 0.42, mode.q, mode.p, s.beamPhase * 0.3, `rgba(0,0,0,0.06)`);
      drawADEOrbit(ctx, cx, cy, Math.min(W, H) * 0.28, mode.q, mode.p, -s.beamPhase * 0.2, `rgba(0,0,0,0.04)`);

      // Place atoms each frame if running
      if (running && s.placedCount < s.sites.length) {
        if (time - lastPlace > 16) { // ~60fps
          const batch = speed;
          for (let b = 0; b < batch; b++) {
            const next = s.placed.findIndex(p => !p);
            if (next !== -1) { s.placed[next] = true; s.placedCount++; }
          }
          lastPlace = time;
          setPlacedCount(s.placedCount);
        }
      }

      // Draw bonds between adjacent placed atoms
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = `rgba(0,0,0,0.12)`;
      for (let i = 0; i < s.sites.length; i++) {
        if (!s.placed[i]) continue;
        for (let j = i + 1; j < s.sites.length; j++) {
          if (!s.placed[j]) continue;
          const dx = s.sites[i][0] - s.sites[j][0];
          const dy = s.sites[i][1] - s.sites[j][1];
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 50) {
            ctx.beginPath();
            ctx.moveTo(s.sites[i][0], s.sites[i][1]);
            ctx.lineTo(s.sites[j][0], s.sites[j][1]);
            ctx.stroke();
          }
        }
      }

      // Draw placed atoms
      for (let i = 0; i < s.sites.length; i++) {
        if (!s.placed[i]) {
          // Ghost site
          ctx.beginPath();
          ctx.arc(s.sites[i][0], s.sites[i][1], elem.radius * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.04)';
          ctx.fill();
          continue;
        }
        const [x, y] = s.sites[i];
        // Glow
        const grd = ctx.createRadialGradient(x, y, 0, x, y, elem.radius * 2.5);
        grd.addColorStop(0, elem.color + 'aa');
        grd.addColorStop(1, elem.color + '00');
        ctx.beginPath();
        ctx.arc(x, y, elem.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        // Atom body
        ctx.beginPath();
        ctx.arc(x, y, elem.radius, 0, Math.PI * 2);
        ctx.fillStyle = elem.color;
        ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.stroke();
      }

      // Draw incoming beam: next unplaced atom being delivered
      const next = s.placed.findIndex(p => !p);
      if (running && next !== -1) {
        const [tx, ty] = s.sites[next];
        const bx = cx + Math.cos(s.beamPhase * 2) * 30;
        const by = cy + Math.sin(s.beamPhase * 2) * 30;
        // Trap beam line
        ctx.beginPath();
        ctx.strokeStyle = `rgba(80,180,255,${0.3 + 0.2 * Math.sin(s.beamPhase * 8)})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.moveTo(bx, 0);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
        // Trap ring
        const ringR = elem.radius * (1.5 + 0.5 * Math.sin(s.beamPhase * 8));
        ctx.beginPath();
        ctx.arc(tx, ty, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(80,200,255,0.7)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, mode, elem]);

  const buildComplete = placedCount >= totalSites && totalSites > 0;
  const progress = totalSites > 0 ? placedCount / totalSites : 0;
  // Rough build time estimate: 1 μs per atom at 10⁶ atoms/s (from NullForge doc)
  const buildTimeSec = (totalSites / 1e6).toFixed(3);

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
          <div className="text-[9px] text-black/40">{totalSites.toLocaleString()} sites</div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex justify-between text-[8px] text-black/30 uppercase tracking-widest mb-1">
            <span>Fabrication Progress</span>
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
            <div className="mt-2 text-[9px] text-center tracking-[0.3em] uppercase text-black/40 font-bold">◊ BUILD COMPLETE</div>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="w-full md:w-[300px] flex flex-col border-t md:border-t-0 border-black/10 overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-black/5 bg-black text-white shrink-0">
          <div className="text-[10px] tracking-[0.3em] font-bold uppercase">◊.NULL_FORGE</div>
          <div className="text-[8px] text-white/30 mt-1 uppercase tracking-widest">Atomic Fabrication Bench</div>
        </div>

        {/* Crystal Type */}
        <div className="p-4 border-b border-black/5 shrink-0">
          <div className="text-[9px] tracking-[0.3em] text-black/30 uppercase mb-2 font-bold">Crystal Lattice</div>
          <div className="grid grid-cols-2 gap-1.5">
            {CRYSTAL_MODES.map((m, i) => (
              <button
                key={m.id}
                onClick={() => { setModeIdx(i); }}
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
            <span>Placement Rate</span>
            <span className="font-bold text-black">{(speed * 60 / 1000).toFixed(2)}M atoms/s</span>
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
            {running ? '⏸ PAUSE BUILD' : buildComplete ? '⏮ RUNNING' : '▶ START BUILD'}
          </button>
          <button
            onClick={rebuildLattice}
            className="w-full py-2 border border-black/10 text-black/40 text-[9px] tracking-[0.3em] uppercase hover:border-black/40 hover:text-black transition-all"
          >
            ↺ RESET LATTICE
          </button>
        </div>

        {/* Info */}
        <div className="p-4 mt-auto border-t border-black/5 bg-black/[0.01]">
          <div className="text-[8px] text-black/30 leading-relaxed uppercase space-y-1">
            <div>α = pπ/q → {mode.q} reflection orbit</div>
            <div>Est. build time: ~{buildTimeSec}s @ 10⁶ atoms/s</div>
            <div>Lattice: {mode.symbol}</div>
            <div>Sub-diffraction: plasmonic ODT @ 1064nm</div>
          </div>
        </div>
      </div>
    </div>
  );
}
