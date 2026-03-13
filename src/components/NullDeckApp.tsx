"use client";

import React, { useState, useEffect, useRef } from 'react';

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
  { id: 'orrery',   label: 'Orrery',      desc: 'Keplerian orbital system', q: 8,  p: 3 },
  { id: 'messages', label: 'Messages',    desc: 'Orbital contact ring',     q: 5,  p: 2 },
  { id: 'nav',      label: 'Navigation',  desc: '3D bearing map',          q: 6,  p: 1 },
  { id: 'model',    label: '3D Model',    desc: 'Icosahedral wireframe',    q: 13, p: 5 },
  { id: 'music',    label: 'Music',       desc: 'Harmonic wave visualiser', q: 21, p: 8 },
];

// ── Kepler helpers ──────────────────────────────────────────────────────────
// Kepler's Third Law: T² ∝ a³  →  ω ∝ a^{-3/2}
// Use Earth as the baseline (a=1 AU, ω=1).
// DISPLAY_SCALE: arbitrary speed factor so orbits are visually obvious.
const DISPLAY_SCALE = 0.00028; // Earth completes one orbit in ~22 s on screen

const PLANETS = [
  { label: 'Mercury', a: 0.387, color: '#d4916a', dotR: 5 },
  { label: 'Venus',   a: 0.723, color: '#e8c96a', dotR: 7 },
  { label: 'Earth',   a: 1.000, color: '#6aaee8', dotR: 8 },
  { label: 'Mars',    a: 1.524, color: '#e87a6a', dotR: 6 },
];

// Orbital screen radii (compressed for visibility but keeping correct relative spacing)
const ORBIT_SCALE = 62;  // px per AU
PLANETS.forEach((pl: any) => { pl.screenR = pl.a * ORBIT_SCALE + 28; });

// Icosahedron vertices (12 vertices) for 3D model mode
function icosaVerts(): [number, number, number][] {
  const φ = (1 + Math.sqrt(5)) / 2;
  const verts: [number, number, number][] = [];
  for (const [a, b, c] of [[0, 1, φ], [0, -1, φ], [0, 1, -φ], [0, -1, -φ],
    [1, φ, 0], [-1, φ, 0], [1, -φ, 0], [-1, -φ, 0],
    [φ, 0, 1], [-φ, 0, 1], [φ, 0, -1], [-φ, 0, -1]]) {
    const len = Math.hypot(a, b, c);
    verts.push([a / len, b / len, c / len]);
  }
  return verts;
}
const ICOSA_VERTS = icosaVerts();
// Icosahedron edges (pairs that are adjacent at distance ≈ 2/φ normalized)
function icosaEdges(): [number, number][] {
  const edges: [number, number][] = [];
  const DIST2 = 4 / ((1 + Math.sqrt(5)) / 2 + 1) ** 2; // (edge_len/radius)^2 ≈ 1.10
  for (let i = 0; i < 12; i++)
    for (let j = i + 1; j < 12; j++) {
      const [ax, ay, az] = ICOSA_VERTS[i];
      const [bx, by, bz] = ICOSA_VERTS[j];
      if ((ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2 < DIST2 + 0.05)
        edges.push([i, j]);
    }
  return edges;
}
const ICOSA_EDGES = icosaEdges();

// ── 3D rotation matrices ────────────────────────────────────────────────────
function rotateY(v: [number, number, number], θ: number): [number, number, number] {
  const [x, y, z] = v;
  return [x * Math.cos(θ) + z * Math.sin(θ), y, -x * Math.sin(θ) + z * Math.cos(θ)];
}
function rotateX(v: [number, number, number], θ: number): [number, number, number] {
  const [x, y, z] = v;
  return [x, y * Math.cos(θ) - z * Math.sin(θ), y * Math.sin(θ) + z * Math.cos(θ)];
}

export default function NullDeckApp() {
  const [modeIdx, setModeIdx]     = useState(0);
  const [projecting, setProjecting] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef   = useRef(0);
  const projRef   = useRef(true);
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

      const modeData = HOLOGRAPHIC_MODES[modeRef.current];
      const isOn     = projRef.current;

      // ── Layout constants ─────────────────────────────────────────────────
      // Cylinder sits on the right; holographic field occupies the left 65%.
      const cylCx = W * 0.795;
      const cylCy = H * 0.5;
      const cylW  = 42;          // cylinder cross-section half-width
      const cylH  = 128;          // cylinder half-height
      const capRy = Math.round(cylW * 0.40); // perspective tilt of caps

      const holoCx = W * 0.37;   // centre of holographic projection zone
      const holoCy = H * 0.50;

      // ── Holographic projection field ─────────────────────────────────────
      if (isOn) {
        // Soft outer glow (large oval)
        const fieldGrd = ctx.createRadialGradient(holoCx, holoCy, 20, holoCx, holoCy, W * 0.42);
        fieldGrd.addColorStop(0,   'rgba(60,190,255,0.07)');
        fieldGrd.addColorStop(0.5, 'rgba(40,140,255,0.03)');
        fieldGrd.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.ellipse(holoCx, holoCy, W * 0.42, H * 0.42, 0, 0, Math.PI * 2);
        ctx.fillStyle = fieldGrd;
        ctx.fill();

        // Interference rings (ADE orbit for this mode)
        for (let ring = 1; ring <= 5; ring++) {
          const r  = ring * 46;
          const ry = r * 0.44;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(70,190,255,${0.055 - ring * 0.007})`;
          ctx.lineWidth   = ring === 1 ? 1.2 : 0.7;
          ctx.setLineDash([ring * 5, ring * 4]);
          ctx.ellipse(holoCx, holoCy, r, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // ADE star overlay
        drawStarPolygon(ctx, holoCx, holoCy, 145, modeData.q, modeData.p,
           time * 0.00014, 0.6, 'rgba(60,190,255,0.07)');
        drawStarPolygon(ctx, holoCx, holoCy,  88, modeData.q, modeData.p,
           -time * 0.00009, 0.4, 'rgba(60,190,255,0.05)');

        // Emission cone from cylinder to field
        const coneY = cylH * 0.35;
        ctx.beginPath();
        ctx.moveTo(cylCx - cylW, cylCy - coneY);
        ctx.lineTo(holoCx - 100, holoCy - 80);
        ctx.lineTo(holoCx + 100, holoCy + 80);
        ctx.lineTo(cylCx - cylW, cylCy + coneY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(60,190,255,0.018)';
        ctx.fill();
      }

      // ── Holographic content ───────────────────────────────────────────────
      if (isOn) {
        const mId = modeData.id;

        if (mId === 'orrery') {
          // Draw orbital paths first
          for (const pl of PLANETS as any[]) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,255,255,0.06)`;
            ctx.lineWidth = 0.7;
            ctx.ellipse(holoCx, holoCy, pl.screenR, pl.screenR * 0.44, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Central star
          const starGrd = ctx.createRadialGradient(holoCx, holoCy, 0, holoCx, holoCy, 22);
          starGrd.addColorStop(0, 'rgba(255,230,120,0.9)');
          starGrd.addColorStop(0.5, 'rgba(255,180,60,0.5)');
          starGrd.addColorStop(1, 'rgba(255,130,30,0)');
          ctx.beginPath(); ctx.arc(holoCx, holoCy, 22, 0, Math.PI * 2);
          ctx.fillStyle = starGrd; ctx.fill();
          ctx.beginPath(); ctx.arc(holoCx, holoCy, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffe46a'; ctx.fill();

          // Draw planets with Keplerian angular velocities: ω ∝ a^{-3/2}
          for (const pl of PLANETS as any[]) {
            const omega = Math.pow(pl.a, -1.5) * DISPLAY_SCALE;
            const phase0 = PLANETS.indexOf(pl) * 1.4; // spread initial phases
            const ang = omega * time + phase0;
            // Project 3D orbit to 2D view plane (tilt ~65°)
            const px = holoCx + pl.screenR * Math.cos(ang);
            const py = holoCy + pl.screenR * 0.44 * Math.sin(ang);

            // Glow
            const grd = ctx.createRadialGradient(px, py, 0, px, py, pl.dotR * 3.5);
            grd.addColorStop(0, pl.color + 'cc'); grd.addColorStop(1, pl.color + '00');
            ctx.beginPath(); ctx.arc(px, py, pl.dotR * 3.5, 0, Math.PI * 2);
            ctx.fillStyle = grd; ctx.fill();
            // Body
            ctx.beginPath(); ctx.arc(px, py, pl.dotR, 0, Math.PI * 2);
            ctx.fillStyle = pl.color; ctx.fill();
            // Label
            ctx.font = 'bold 8px monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.textAlign = 'center';
            ctx.fillText(pl.label, px, py - pl.dotR - 4);
          }

        } else if (mId === 'messages') {
          const contacts = ['Maya', 'Work', 'NullOS', 'Nathan', 'Kai'];
          const ringR = 150;
          // Ring path
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255,255,255,0.06)';
          ctx.lineWidth = 0.7;
          ctx.ellipse(holoCx, holoCy, ringR, ringR * 0.44, 0, 0, Math.PI * 2);
          ctx.stroke();
          contacts.forEach((name, i) => {
            const ang = (i / contacts.length) * Math.PI * 2 + time * 0.00022;
            const px  = holoCx + ringR * Math.cos(ang);
            const py  = holoCy + ringR * 0.44 * Math.sin(ang);
            const depth = Math.sin(ang); // -1=back, +1=front
            const alpha = (depth + 1) / 2 * 0.7 + 0.3;
            // Card glow
            const grd = ctx.createRadialGradient(px, py, 0, px, py, 22);
            grd.addColorStop(0, `rgba(80,200,255,${alpha * 0.5})`);
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath(); ctx.arc(px, py, 22, 0, Math.PI * 2);
            ctx.fillStyle = grd; ctx.fill();
            // Avatar circle
            ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(100,210,255,${alpha * 0.9})`;
            ctx.lineWidth = 1.5; ctx.stroke();
            // Initial
            ctx.font = `bold 9px monospace`;
            ctx.fillStyle = `rgba(200,240,255,${alpha})`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(name[0], px, py);
            ctx.textBaseline = 'alphabetic';
            // Name label
            ctx.font = '8px monospace';
            ctx.fillStyle = `rgba(180,230,255,${alpha * 0.7})`;
            ctx.fillText(name, px, py + 18);
          });

        } else if (mId === 'nav') {
          const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
          const radii = [165, 110, 165, 110, 165, 110, 165, 110];
          // Compass rings
          [180, 120, 70].forEach((r, ri) => {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(80,220,180,${0.08 - ri * 0.02})`;
            ctx.lineWidth = 0.8;
            ctx.ellipse(holoCx, holoCy, r, r * 0.44, 0, 0, Math.PI * 2);
            ctx.stroke();
          });
          // Cross-hairs
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(80,220,180,0.12)';
          ctx.lineWidth = 0.5;
          ctx.moveTo(holoCx - 185, holoCy); ctx.lineTo(holoCx + 185, holoCy);
          ctx.moveTo(holoCx, holoCy - 110); ctx.lineTo(holoCx, holoCy + 110);
          ctx.stroke();
          // Direction markers
          ctx.font = 'bold 10px monospace';
          dirs.forEach((d, i) => {
            const ang = (i / 8) * Math.PI * 2 - Math.PI / 2 + time * 0.00004;
            const r   = radii[i];
            const px  = holoCx + r * Math.cos(ang);
            const py  = holoCy + r * 0.44 * Math.sin(ang) + 3;
            ctx.fillStyle = d === 'N' ? '#80ffcc' : 'rgba(130,230,200,0.65)';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(d, px, py);
          });
          // Waypoint
          const wpAng = time * 0.00018;
          const wpX = holoCx + 130 * Math.cos(wpAng);
          const wpY = holoCy + 130 * 0.44 * Math.sin(wpAng);
          ctx.beginPath();
          ctx.moveTo(wpX, wpY - 10); ctx.lineTo(wpX + 7, wpY + 4); ctx.lineTo(wpX - 7, wpY + 4);
          ctx.closePath();
          ctx.fillStyle = 'rgba(255,200,80,0.9)'; ctx.fill();
          ctx.font = '8px monospace';
          ctx.fillStyle = 'rgba(255,220,120,0.7)';
          ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          ctx.fillText('WP-01', wpX, wpY - 14);

        } else if (mId === 'model') {
          // Rotating icosahedron with proper projection
          const rotY = time * 0.00035;
          const rotX = 0.42 + Math.sin(time * 0.00012) * 0.18;
          const scale = 118;
          // Project + depth-sort edges
          const proj = ICOSA_VERTS.map(v => {
            const [rx, ry, rz] = rotateX(rotateY(v, rotY), rotX);
            return { sx: holoCx + rx * scale, sy: holoCy + ry * scale * 0.58, depth: rz };
          });
          // Back edges first
          [...ICOSA_EDGES]
            .sort((a, b) => Math.min(proj[a[0]].depth, proj[a[1]].depth) - Math.min(proj[b[0]].depth, proj[b[1]].depth))
            .forEach(([i, j]) => {
              const d = (proj[i].depth + proj[j].depth) / 2;
              const alpha = (d + 1) / 2;
              ctx.beginPath();
              ctx.strokeStyle = `rgba(160,110,255,${0.2 + alpha * 0.5})`;
              ctx.lineWidth = 0.8 + alpha * 0.8;
              ctx.moveTo(proj[i].sx, proj[i].sy);
              ctx.lineTo(proj[j].sx, proj[j].sy);
              ctx.stroke();
            });
          // Vertices
          proj.forEach(({ sx, sy, depth }) => {
            const alpha = (depth + 1) / 2;
            ctx.beginPath(); ctx.arc(sx, sy, 2.5 + alpha * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200,160,255,${0.5 + alpha * 0.5})`; ctx.fill();
          });
          // Orbit ring
          drawStarPolygon(ctx, holoCx, holoCy, 165, 13, 5, time * 0.00008, 0.5, 'rgba(180,120,255,0.07)');

        } else if (mId === 'music') {
          // Harmonic series: nodes orbit at ω_n = n * ω_0 with amplitude ∝ 1/n
          const N = 12;
          const omega0 = 0.00018;
          const A0     = 140;
          // Waveform ring
          const waveR = 100;
          ctx.beginPath();
          for (let k = 0; k <= 200; k++) {
            const a = (k / 200) * Math.PI * 2;
            let r = waveR;
            for (let n = 1; n <= 8; n++) {
              r += (A0 / (n * 5.5)) * Math.sin(n * a + n * omega0 * time * 3);
            }
            const px = holoCx + r * Math.cos(a);
            const py = holoCy + r * 0.44 * Math.sin(a);
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = 'rgba(100,220,180,0.35)';
          ctx.lineWidth = 1.2; ctx.stroke();
          // Harmonic nodes (orbiting at integer multiples of ω_0)
          for (let n = 1; n <= N; n++) {
            const omega = n * omega0;
            const amp   = A0 / n;
            const ang   = omega * time;
            const r     = waveR + amp * 0.6 * Math.sin(ang * 1.5);
            const px    = holoCx + r * Math.cos(ang);
            const py    = holoCy + r * 0.44 * Math.sin(ang);
            const hue   = (n * 30) % 360;
            const nodeR = 3.5 + (A0 / n) * 0.025;
            const grd = ctx.createRadialGradient(px, py, 0, px, py, nodeR * 3);
            grd.addColorStop(0, `hsla(${hue},80%,65%,0.7)`);
            grd.addColorStop(1, `hsla(${hue},80%,65%,0)`);
            ctx.beginPath(); ctx.arc(px, py, nodeR * 3, 0, Math.PI * 2);
            ctx.fillStyle = grd; ctx.fill();
            ctx.beginPath(); ctx.arc(px, py, nodeR, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${hue},80%,68%)`; ctx.fill();
          }
        }
      }

      // ── Draw the Null Cylinder device ────────────────────────────────────
      // Render order: back bottom cap → body → VCSEL band → front top cap → display

      // Back (bottom) cap — drawn first so body covers the back half
      ctx.beginPath();
      ctx.ellipse(cylCx, cylCy + cylH, cylW, capRy, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#181818';
      ctx.fill();
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1; ctx.stroke();

      // Body (rectangle clipped between cap centers)
      const bodyGrd = ctx.createLinearGradient(cylCx - cylW, 0, cylCx + cylW, 0);
      bodyGrd.addColorStop(0,    '#0e0e0e');
      bodyGrd.addColorStop(0.18, '#404040');
      bodyGrd.addColorStop(0.38, '#525252');
      bodyGrd.addColorStop(0.50, '#3c3c3c');
      bodyGrd.addColorStop(0.72, '#4a4a4a');
      bodyGrd.addColorStop(0.88, '#383838');
      bodyGrd.addColorStop(1,    '#0c0c0c');
      ctx.fillStyle = bodyGrd;
      ctx.fillRect(cylCx - cylW, cylCy - cylH, cylW * 2, cylH * 2);

      // Subtle vertical edge lines (body outline)
      ctx.strokeStyle = '#272727'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cylCx - cylW, cylCy - cylH);
      ctx.lineTo(cylCx - cylW, cylCy + cylH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cylCx + cylW, cylCy - cylH);
      ctx.lineTo(cylCx + cylW, cylCy + cylH);
      ctx.stroke();

      // VCSEL emitter band (middle third of cylinder height)
      if (isOn) {
        const bandTop    = cylCy - 28;
        const bandRows   = 8;     // rows of emitters visible
        const bandHeight = 56;
        const rowSpacing = bandHeight / (bandRows - 1);

        // Band glow
        const bandGrd = ctx.createLinearGradient(cylCx - cylW, 0, cylCx + cylW, 0);
        bandGrd.addColorStop(0,   'rgba(50,180,255,0)');
        bandGrd.addColorStop(0.2, 'rgba(50,180,255,0.2)');
        bandGrd.addColorStop(0.5, 'rgba(50,180,255,0.12)');
        bandGrd.addColorStop(0.8, 'rgba(50,180,255,0.2)');
        bandGrd.addColorStop(1,   'rgba(50,180,255,0)');
        ctx.fillStyle = bandGrd;
        ctx.fillRect(cylCx - cylW, bandTop, cylW * 2, bandHeight);

        // Emitter dots using cylindrical projection: x = cylCx + cylW*sin(θ)
        // Only front half: θ ∈ [-π/2, π/2], so sin(θ) ∈ [-1, 1]
        const COLS = 16;
        for (let row = 0; row < bandRows; row++) {
          const ey = bandTop + row * rowSpacing;
          for (let col = 0; col < COLS; col++) {
            const t = (col / (COLS - 1)) * 2 - 1;       // -1 to +1
            const ex = cylCx + cylW * t;
            // Phong-style brightness: cos(asin(t)) = sqrt(1-t²)
            const cosTheta = Math.sqrt(1 - t * t);
            const flicker  = 0.35 + 0.65 * Math.sin(time * 0.008 * (row * 17 + col * 7));
            const alpha    = cosTheta * flicker * 0.85;
            ctx.beginPath();
            ctx.arc(ex, ey, 1.3 * cosTheta + 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(60,200,255,${alpha})`;
            ctx.fill();
          }
        }

        // Horizontal band separator lines
        ctx.strokeStyle = 'rgba(70,190,255,0.18)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(cylCx - cylW, bandTop); ctx.lineTo(cylCx + cylW, bandTop); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cylCx - cylW, bandTop + bandHeight); ctx.lineTo(cylCx + cylW, bandTop + bandHeight); ctx.stroke();
      }

      // Engraved ring details (decorative lines, like a real machined Ti device)
      [0.28, 0.48, 0.52, 0.72].forEach(frac => {
        const ly = cylCy - cylH + frac * cylH * 2;
        ctx.strokeStyle = 'rgba(80,80,80,0.55)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(cylCx - cylW, ly); ctx.lineTo(cylCx + cylW, ly); ctx.stroke();
      });

      // Front top cap (drawn last to cover the body top edge)
      ctx.beginPath();
      ctx.ellipse(cylCx, cylCy - cylH, cylW, capRy, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#242424'; ctx.fill();
      ctx.strokeStyle = '#3c3c3c'; ctx.lineWidth = 1; ctx.stroke();

      // AMOLED display on top cap
      if (isOn) {
        const displayPulse = 0.75 + 0.25 * Math.sin(time * 0.0015);
        const dispGrd = ctx.createRadialGradient(cylCx, cylCy - cylH, 0, cylCx, cylCy - cylH, 22);
        dispGrd.addColorStop(0,   `rgba(100,220,255,${0.95 * displayPulse})`);
        dispGrd.addColorStop(0.5, `rgba(40,140,220,${0.55 * displayPulse})`);
        dispGrd.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.ellipse(cylCx, cylCy - cylH, 24, capRy * 0.72, 0, 0, Math.PI * 2);
        ctx.fillStyle = dispGrd; ctx.fill();
        // Small crosshair UI on display cap
        ctx.strokeStyle = 'rgba(160,230,255,0.35)'; ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cylCx - 10, cylCy - cylH); ctx.lineTo(cylCx + 10, cylCy - cylH);
        ctx.moveTo(cylCx, cylCy - cylH - 5);  ctx.lineTo(cylCx, cylCy - cylH + 5);
        ctx.stroke();
        // Outer ring on top cap
        ctx.beginPath();
        ctx.ellipse(cylCx, cylCy - cylH, cylW - 5, capRy - 2, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(70,200,255,${0.25 * displayPulse})`; ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Off-state: very dim display
        ctx.beginPath();
        ctx.ellipse(cylCx, cylCy - cylH, 18, capRy * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#111'; ctx.fill();
      }

      // Button/sensor dot on top cap
      ctx.beginPath(); ctx.arc(cylCx + cylW * 0.55, cylCy - cylH, 3, 0, Math.PI * 2);
      ctx.fillStyle = isOn ? 'rgba(80,220,255,0.8)' : '#252525'; ctx.fill();

      // Grip ring at bottom
      ctx.beginPath();
      ctx.ellipse(cylCx, cylCy + cylH + capRy * 0.5, cylW * 0.72, capRy * 0.45, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 4; ctx.stroke();

      // ── When off: show sleep indicator ───────────────────────────────────
      if (!isOn) {
        const breathe = (Math.sin(time * 0.001) + 1) / 2;
        ctx.beginPath(); ctx.arc(cylCx, cylCy, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(60,180,255,${0.1 + breathe * 0.25})`; ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const mode = HOLOGRAPHIC_MODES[modeIdx];

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#060a11] font-mono select-none overflow-hidden text-white">
      {/* Canvas */}
      <div className="flex-1 relative flex items-center justify-center min-h-0">
        <canvas ref={canvasRef} width={680} height={520}
          className="w-full h-full max-w-[680px] max-h-[520px]" />

        {/* HUD overlays */}
        <div className="absolute top-4 left-4 space-y-0.5 pointer-events-none">
          <div className="text-[9px] tracking-[0.4em] text-white/20 uppercase font-bold">Null.Cylinder</div>
          <div className="text-lg font-bold text-white leading-tight">{mode.label}</div>
          <div className="text-[9px] text-white/30 uppercase">{mode.desc}</div>
        </div>

        <div className="absolute top-4 right-4 text-right pointer-events-none">
          <div className="text-[9px] tracking-[0.3em] text-white/20 uppercase font-bold">Projection</div>
          <div className={`text-sm font-bold mt-0.5 ${projecting ? 'text-cyan-400' : 'text-white/15'}`}>
            {projecting ? '● ACTIVE' : '○ STANDBY'}
          </div>
          <div className="text-[8px] text-white/20 mt-1">4,096 VCSELs · 120 Hz</div>
          {projecting && (
            <div className="text-[8px] text-cyan-400/40 mt-0.5 uppercase tracking-widest">
              D{mode.q}/{mode.p}
            </div>
          )}
        </div>

        {/* Corner brackets */}
        {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-5 h-5 border-white/8`}
            style={{
              borderTopWidth:    i < 2  ? 1 : 0,
              borderBottomWidth: i >= 2 ? 1 : 0,
              borderLeftWidth:   i % 2 === 0 ? 1 : 0,
              borderRightWidth:  i % 2 === 1 ? 1 : 0,
            }} />
        ))}
      </div>

      {/* Controls panel */}
      <div className="w-full md:w-[270px] flex flex-col border-l border-white/5 bg-[#070b13] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-white/5 shrink-0">
          <div className="text-[10px] tracking-[0.3em] font-bold uppercase text-white">◊.NULL_CYLINDER</div>
          <div className="text-[8px] text-white/20 mt-1 uppercase tracking-widest">Holographic Personal Computer</div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {['52mm × 28mm', '95g', 'Ti-6Al-4V'].map(s => (
              <span key={s} className="text-[8px] text-white/30 border border-white/10 px-1.5 py-0.5">{s}</span>
            ))}
          </div>
        </div>

        {/* Mode selector */}
        <div className="p-4 border-b border-white/5 shrink-0">
          <div className="text-[9px] tracking-[0.3em] text-white/20 uppercase mb-2 font-bold">Mode</div>
          <div className="space-y-1.5">
            {HOLOGRAPHIC_MODES.map((m, i) => (
              <button key={m.id} onClick={() => setModeIdx(i)}
                className={`w-full px-3 py-2.5 text-left border transition-all ${
                  modeIdx === i
                    ? 'border-cyan-500/50 bg-cyan-500/8 text-cyan-300'
                    : 'border-white/5 hover:border-white/15 text-white/35'
                }`}>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase tracking-wide">{m.label}</span>
                  <span className="text-[7px] opacity-40">{m.q}/{m.p}</span>
                </div>
                <div className="text-[8px] opacity-40 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Projection toggle */}
        <div className="p-4 border-b border-white/5 shrink-0">
          <button onClick={() => setProjecting(p => !p)}
            className={`w-full py-3 border font-bold text-[10px] tracking-[0.3em] uppercase transition-all ${
              projecting
                ? 'border-cyan-500/45 bg-cyan-500/8 text-cyan-300'
                : 'border-white/10 text-white/25 hover:border-white/25 hover:text-white/50'
            }`}>
            {projecting ? '◉ PROJECTION ON' : '○ PROJECTION OFF'}
          </button>
        </div>

        {/* Tech specs */}
        <div className="p-4 mt-auto">
          <div className="text-[9px] tracking-[0.25em] text-white/15 uppercase mb-2 font-bold">Specifications</div>
          <div className="space-y-1.5 text-[8px] text-white/20 uppercase">
            {[
              ['Emitters',    '4,096 VCSELs'],
              ['Array',       '64 × 64 bands'],
              ['FoV',         '360° × 60°'],
              ['Resolution',  '0.05° angular'],
              ['Depth planes','64 discrete'],
              ['Refresh',     '120 Hz'],
              ['Processor',   'E₈ Null Sphere'],
              ['OS',          'NullOS 1.0'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k}</span>
                <span className="text-white/40">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
