"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ADE star polygon — same math as the rest of the system
function drawStarPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  q: number, p: number, rot: number,
  lineWidth: number, color: string
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  for (let i = 0; i <= q; i++) {
    const angle = (i * p * 2 * Math.PI) / q + rot;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

const HOLOGRAPHIC_MODES = [
  { id: 'orrery',  label: 'Orrery',      desc: 'Orbital system view', q: 8, p: 3 },
  { id: 'messages',label: 'Messages',    desc: 'Orbital message ring', q: 5, p: 2 },
  { id: 'nav',     label: 'Navigation',  desc: '3D map projection',   q: 6, p: 1 },
  { id: 'model',   label: '3D Model',    desc: 'Holographic object',  q: 13, p: 5 },
  { id: 'music',   label: 'Music',       desc: 'Soundwave visualiser', q: 21, p: 8 },
];

// Simulated "content nodes" that orbit the cylinder holographically
function getOrbitalNodes(mode: string, time: number): { x: number; y: number; r: number; color: string; label: string; orbit: number }[] {
  const nodes: { x: number; y: number; r: number; color: string; label: string; orbit: number }[] = [];
  if (mode === 'orrery') {
    const planets = [
      { r: 8, color: '#e0825a', label: 'Mercury', orbit: 90,  speed: 1.2 },
      { r: 10, color: '#e0c45a', label: 'Venus',  orbit: 140, speed: 0.9 },
      { r: 11, color: '#5a9de0', label: 'Earth',  orbit: 190, speed: 0.7 },
      { r: 9,  color: '#e05a5a', label: 'Mars',   orbit: 240, speed: 0.5 },
    ];
    planets.forEach((p, i) => {
      const a = time * p.speed * 0.0003 + i * 1.3;
      nodes.push({ x: Math.cos(a) * p.orbit, y: Math.sin(a) * p.orbit * 0.4, r: p.r, color: p.color, label: p.label, orbit: p.orbit });
    });
  } else if (mode === 'messages') {
    const msgs = ['Maya', 'Work', 'News', 'Null OS', 'Nathan'];
    msgs.forEach((m, i) => {
      const a = (i / msgs.length) * Math.PI * 2 + time * 0.0002;
      nodes.push({ x: Math.cos(a) * 160, y: Math.sin(a) * 60, r: 14, color: '#222', label: m, orbit: 160 });
    });
  } else if (mode === 'nav') {
    [0, 1, 2, 3].forEach(i => {
      const a = i * Math.PI / 2 + time * 0.0001;
      nodes.push({ x: Math.cos(a) * 130, y: Math.sin(a) * 50, r: 6, color: '#5ae0b0', label: '', orbit: 130 });
    });
  } else if (mode === 'model') {
    // Vertices of a rotating tetrahedron projected to 2D
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + time * 0.0004;
      const R = 100 + Math.sin(time * 0.001 + i) * 40;
      nodes.push({ x: Math.cos(a) * R, y: Math.sin(a) * R * 0.5, r: 7, color: '#a080ff', label: '', orbit: R });
    }
  } else if (mode === 'music') {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const amp = 80 + Math.sin(time * 0.002 * (i + 1)) * 60;
      nodes.push({ x: Math.cos(a) * amp, y: Math.sin(a) * amp * 0.4, r: 4 + Math.abs(Math.sin(time * 0.002 * (i + 1))) * 6, color: `hsl(${i * 30},70%,60%)`, label: '', orbit: amp });
    }
  }
  return nodes;
}

export default function NullDeckApp() {
  const [modeIdx, setModeIdx] = useState(0);
  const [projecting, setProjecting] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(modeIdx);
  const projRef = useRef(projecting);
  modeRef.current = modeIdx;
  projRef.current = projecting;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;

    const draw = (time: number) => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;

      const mode = HOLOGRAPHIC_MODES[modeRef.current];
      const isOn = projRef.current;

      // ── Holographic interference rings (ADE pattern) ──────────────────
      if (isOn) {
        for (let ring = 1; ring <= 4; ring++) {
          const r = ring * 58;
          const alpha = 0.05 - ring * 0.008;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(80,200,255,${alpha})`;
          ctx.lineWidth = ring === 1 ? 1.5 : 0.8;
          ctx.setLineDash([ring * 4, ring * 3]);
          ctx.ellipse(cx, cy, r, r * 0.38, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // ADE orbit overlay at mode's q/p
        drawStarPolygon(ctx, cx, cy, 130, mode.q, mode.p, time * 0.00015, 0.5, 'rgba(80,200,255,0.08)');
        drawStarPolygon(ctx, cx, cy, 80,  mode.q, mode.p, -time * 0.0001, 0.3, 'rgba(80,200,255,0.06)');
      }

      // ── The Null Cylinder (physical device) ───────────────────────────
      // Front ellipse cap (top)
      const cylW = 38, cylH = 90;
      const capRy = 12;

      // Body gradient
      const bodyGrd = ctx.createLinearGradient(cx - cylW, cy - cylH / 2, cx + cylW, cy - cylH / 2);
      bodyGrd.addColorStop(0, '#1a1a1a');
      bodyGrd.addColorStop(0.35, '#3a3a3a');
      bodyGrd.addColorStop(0.65, '#2a2a2a');
      bodyGrd.addColorStop(1, '#111');
      ctx.fillStyle = bodyGrd;
      ctx.beginPath();
      ctx.rect(cx - cylW, cy - cylH / 2, cylW * 2, cylH);
      ctx.fill();

      // Top cap
      ctx.beginPath();
      ctx.fillStyle = '#2a2a2a';
      ctx.ellipse(cx, cy - cylH / 2, cylW, capRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.stroke();

      // AMOLED display on top cap
      const displayGrd = ctx.createRadialGradient(cx, cy - cylH / 2, 0, cx, cy - cylH / 2, 20);
      displayGrd.addColorStop(0, isOn ? 'rgba(80,200,255,0.9)' : 'rgba(20,20,20,1)');
      displayGrd.addColorStop(0.7, isOn ? 'rgba(20,80,160,0.5)' : 'rgba(15,15,15,1)');
      displayGrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.ellipse(cx, cy - cylH / 2, 20, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = displayGrd;
      ctx.fill();

      // Projector band (middle 30mm of cylinder, bright ring)
      if (isOn) {
        const bandGrd = ctx.createLinearGradient(cx - cylW, 0, cx + cylW, 0);
        bandGrd.addColorStop(0, 'rgba(80,200,255,0.0)');
        bandGrd.addColorStop(0.3, 'rgba(80,200,255,0.25)');
        bandGrd.addColorStop(0.7, 'rgba(80,200,255,0.25)');
        bandGrd.addColorStop(1, 'rgba(80,200,255,0.0)');
        ctx.fillStyle = bandGrd;
        ctx.fillRect(cx - cylW, cy - 16, cylW * 2, 32);

        // Laser emission points (4096 simplified as dots on rim)
        for (let i = 0; i < 24; i++) {
          const fy = cy - 12 + (i / 24) * 24;
          const flicker = 0.4 + 0.6 * Math.sin(time * 0.01 * (i + 1));
          ctx.beginPath();
          ctx.arc(cx - cylW + 1, fy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(80,200,255,${flicker})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + cylW - 1, fy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(80,200,255,${flicker})`;
          ctx.fill();
        }
      }

      // Bottom cap
      ctx.beginPath();
      ctx.fillStyle = '#1a1a1a';
      ctx.ellipse(cx, cy + cylH / 2, cylW, capRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Grip ring (pop-out ring at bottom)
      ctx.beginPath();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 4;
      ctx.ellipse(cx, cy + cylH / 2 + 8, 14, 5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // ── Holographic content nodes ─────────────────────────────────────
      if (isOn) {
        const nodes = getOrbitalNodes(mode.id, time);
        nodes.forEach(node => {
          const nx = cx + node.x;
          const ny = cy + node.y;
          // Glow
          const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, node.r * 3);
          grd.addColorStop(0, node.color + 'cc');
          grd.addColorStop(1, node.color + '00');
          ctx.beginPath();
          ctx.arc(nx, ny, node.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
          // Node
          ctx.beginPath();
          ctx.arc(nx, ny, node.r, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();
          if (node.label) {
            ctx.font = `bold 9px monospace`;
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.textAlign = 'center';
            ctx.fillText(node.label, nx, ny + node.r + 10);
          }
          // Connect to cylinder with faint beam
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(80,200,255,0.06)';
          ctx.lineWidth = 0.8;
          ctx.moveTo(cx + (node.x > 0 ? cylW : -cylW), cy);
          ctx.lineTo(nx, ny);
          ctx.stroke();
        });
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const mode = HOLOGRAPHIC_MODES[modeIdx];

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#070b12] font-mono select-none overflow-hidden text-white">
      {/* Canvas */}
      <div className="flex-1 relative flex items-center justify-center min-h-0">
        <canvas ref={canvasRef} width={600} height={520} className="w-full h-full max-w-[600px] max-h-[520px]" />

        {/* Overlay info */}
        <div className="absolute top-4 left-4 space-y-0.5">
          <div className="text-[9px] tracking-[0.4em] text-white/20 uppercase font-bold">Null.Cylinder</div>
          <div className="text-lg font-bold text-white">{mode.label}</div>
          <div className="text-[9px] text-white/30 uppercase">{mode.desc}</div>
        </div>
        <div className="absolute top-4 right-4 text-right">
          <div className="text-[9px] tracking-[0.4em] text-white/20 uppercase font-bold">Projection</div>
          <div className={`text-sm font-bold mt-0.5 ${projecting ? 'text-cyan-400' : 'text-white/20'}`}>
            {projecting ? '● ACTIVE' : '○ STANDBY'}
          </div>
          <div className="text-[8px] text-white/20 mt-1">4,096 VCSELs · 120Hz</div>
        </div>

        {/* VR-style corner brackets */}
        {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-5 h-5 border-white/10`}
            style={{ borderTopWidth: i < 2 ? 1 : 0, borderBottomWidth: i >= 2 ? 1 : 0, borderLeftWidth: i % 2 === 0 ? 1 : 0, borderRightWidth: i % 2 === 1 ? 1 : 0 }} />
        ))}
      </div>

      {/* Controls */}
      <div className="w-full md:w-[280px] flex flex-col border-l border-white/5 overflow-y-auto bg-[#080c14]">
        {/* Header */}
        <div className="p-5 border-b border-white/5 shrink-0">
          <div className="text-[10px] tracking-[0.3em] font-bold uppercase text-white">◊.NULL_CYLINDER</div>
          <div className="text-[8px] text-white/20 mt-1 uppercase tracking-widest">Holographic Personal Computer</div>
          <div className="flex gap-2 mt-3 text-[8px] text-white/30">
            <span className="border border-white/10 px-1.5 py-0.5">52mm × 28mm</span>
            <span className="border border-white/10 px-1.5 py-0.5">95g</span>
            <span className="border border-white/10 px-1.5 py-0.5">Ti-6Al-4V</span>
          </div>
        </div>

        {/* Hologram mode selector */}
        <div className="p-4 border-b border-white/5 shrink-0">
          <div className="text-[9px] tracking-[0.3em] text-white/20 uppercase mb-2 font-bold">Holographic Mode</div>
          <div className="space-y-1.5">
            {HOLOGRAPHIC_MODES.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setModeIdx(i)}
                className={`w-full px-3 py-2.5 text-left border transition-all ${modeIdx === i ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300' : 'border-white/5 hover:border-white/20 text-white/40'}`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase tracking-wide">{m.label}</span>
                  <span className="text-[7px] opacity-50">D{m.q}/{m.p}</span>
                </div>
                <div className="text-[8px] opacity-50 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Projection toggle */}
        <div className="p-4 border-b border-white/5 shrink-0">
          <button
            onClick={() => setProjecting(p => !p)}
            className={`w-full py-3 border font-bold text-[10px] tracking-[0.3em] uppercase transition-all ${projecting ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' : 'border-white/10 text-white/30 hover:border-white/30 hover:text-white/60'}`}
          >
            {projecting ? '◉ PROJECTION ON' : '○ PROJECTION OFF'}
          </button>
        </div>

        {/* Tech specs */}
        <div className="p-4 mt-auto border-t border-white/5">
          <div className="space-y-1.5 text-[8px] text-white/20 uppercase leading-relaxed">
            <div className="flex justify-between"><span>Emitters</span><span className="text-white/40">4,096 VCSELs</span></div>
            <div className="flex justify-between"><span>FoV</span><span className="text-white/40">360° × 60°</span></div>
            <div className="flex justify-between"><span>Resolution</span><span className="text-white/40">0.05° angular</span></div>
            <div className="flex justify-between"><span>Depth planes</span><span className="text-white/40">64 discrete</span></div>
            <div className="flex justify-between"><span>Refresh</span><span className="text-white/40">120 Hz</span></div>
            <div className="flex justify-between"><span>Processor</span><span className="text-white/40">E₈ Null Sphere</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
