"use client";

import React, { useState, useEffect, useRef } from 'react';

function drawStarPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  q: number, p: number, rot: number,
  lw: number, color: string
) {
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = lw;
  for (let i = 0; i <= q; i++) {
    const a = (i * p * 2 * Math.PI) / q + rot;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    else          ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.stroke();
}

const MODES = [
  { id: 'orrery',   label: 'Orrery',      desc: 'Keplerian solar system',    q: 8,  p: 3 },
  { id: 'messages', label: 'Messages',    desc: 'Orbital contact ring',      q: 5,  p: 2 },
  { id: 'nav',      label: 'Navigation',  desc: '3D bearing sphere',         q: 6,  p: 1 },
  { id: 'model',    label: '3D Model',    desc: 'Icosahedral wireframe',     q: 13, p: 5 },
  { id: 'music',    label: 'Music',       desc: 'Harmonic orbit spectrum',   q: 21, p: 8 },
];

// Kepler's 3rd law: ω ∝ a^{-3/2}  (Earth = 1)
const K_SCALE = 0.00026;
const PLANETS = [
  { label: 'Mercury', a: 0.387, e: 0.206, color: '#d4916a', r: 5,  orbitR: 68 },
  { label: 'Venus',   a: 0.723, e: 0.007, color: '#e8c96a', r: 7,  orbitR: 96 },
  { label: 'Earth',   a: 1.000, e: 0.017, color: '#6aaee8', r: 8,  orbitR: 128 },
  { label: 'Mars',    a: 1.524, e: 0.093, color: '#e87a6a', r: 6,  orbitR: 168 },
];

// Icosahedron geometry
function icosaVerts(): [number,number,number][] {
  const φ = (1 + Math.sqrt(5)) / 2;
  const raw: [number,number,number][] = [
    [0,1,φ],[0,-1,φ],[0,1,-φ],[0,-1,-φ],[1,φ,0],[-1,φ,0],
    [1,-φ,0],[-1,-φ,0],[φ,0,1],[-φ,0,1],[φ,0,-1],[-φ,0,-1],
  ];
  return raw.map(([a,b,c])=>{ const l=Math.hypot(a,b,c); return [a/l,b/l,c/l]; });
}
const ICOSA_V = icosaVerts();
function icosaEdges(): [number,number][] {
  const edges:[number,number][]=[]; const D2 = 1.15;
  for(let i=0;i<12;i++) for(let j=i+1;j<12;j++){
    const [ax,ay,az]=ICOSA_V[i],[bx,by,bz]=ICOSA_V[j];
    if((ax-bx)**2+(ay-by)**2+(az-bz)**2 < D2) edges.push([i,j]);
  } return edges;
}
const ICOSA_E = icosaEdges();

function rotY(v:[number,number,number],θ:number):[number,number,number]{
  const[x,y,z]=v;return[x*Math.cos(θ)+z*Math.sin(θ),y,-x*Math.sin(θ)+z*Math.cos(θ)];
}
function rotX(v:[number,number,number],θ:number):[number,number,number]{
  const[x,y,z]=v;return[x,y*Math.cos(θ)-z*Math.sin(θ),y*Math.sin(θ)+z*Math.cos(θ)];
}

// ────────────────────────────────────────────────────────────────────────────
export default function NullDeckApp() {
  const [modeIdx, setModeIdx]       = useState(0);
  const [projecting, setProjecting] = useState(true);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const wrapRef      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;

    const resize = () => {
      const { width: cw, height: ch } = wrap.getBoundingClientRect();
      const W = Math.max(360, Math.floor(cw));
      const H = Math.max(320, Math.floor(ch));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap); resize();

    const draw = (time: number) => {
      const W = canvas.clientWidth, H = canvas.clientHeight;
      ctx.clearRect(0, 0, W, H);

      // ── Constants ──────────────────────────────────────────────────────────
      // Cylinder is centred at (cx, cy). Holographic content orbits it in 360°.
      // Orbits are rendered as perspective-tilted ellipses (we look ~30° above
      // the horizontal plane), so semi-minor = orbitR * TILT_Y.
      const cx = W * 0.60, cy = H * 0.50;
      const TILT_Y    = 0.42;   // perspective foreshortening of the orbit plane
      const CYL_W     = 44;     // cylinder half-width
      const CYL_H     = 130;    // cylinder half-height
      const CAP_RY    = Math.round(CYL_W * 0.40);
      const isOn      = projecting;
      const mode      = MODES[modeIdx];

      // ── Holographic projection field ──────────────────────────────────────
      if (isOn) {
        // Ambient glow surrounding the device
        const grd = ctx.createRadialGradient(cx, cy, CYL_W, cx, cy, 230);
        grd.addColorStop(0,   'rgba(50,175,255,0.10)');
        grd.addColorStop(0.4, 'rgba(30,120,255,0.05)');
        grd.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(cx, cy, 230, 0, Math.PI*2);
        ctx.fillStyle = grd; ctx.fill();

        // Concentric interference rings (orbit-plane ellipses)
        for (let i = 1; i <= 4; i++) {
          const r = 55 + i * 38;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(60,185,255,${0.07 - i*0.01})`;
          ctx.lineWidth = i === 1 ? 1.0 : 0.6;
          ctx.setLineDash([i*6, i*5]);
          ctx.ellipse(cx, cy, r, r * TILT_Y, 0, 0, Math.PI*2);
          ctx.stroke(); ctx.setLineDash([]);
        }

        // ADE star overlay on the orbital plane
        drawStarPolygon(ctx, cx, cy, 165, mode.q, mode.p,
          time * 0.00012, 0.5, 'rgba(55,180,255,0.07)');

        // VCSEL emission beams — radiate outward in 360° from the emitter band
        const N_BEAMS = 12;
        for (let i = 0; i < N_BEAMS; i++) {
          const a   = (i / N_BEAMS) * Math.PI * 2 + time * 0.00008;
          // Beam origin: on the cylinder surface
          const ox  = cx + CYL_W * Math.cos(a);
          const oy  = cy + CAP_RY * Math.sin(a) * 0.5;
          // Beam end: at the holographic field radius
          const bR  = 190 + 15 * Math.sin(time * 0.0012 + i);
          const ex  = cx + bR * Math.cos(a);
          const ey  = cy + bR * TILT_Y * Math.sin(a);
          const alpha = 0.06 + 0.04 * Math.sin(time * 0.009 * (i+1));
          ctx.beginPath();
          ctx.strokeStyle = `rgba(60,200,255,${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
        }
      }

      // ── Holographic content (orbits AROUND the cylinder) ──────────────────
      // Helper: draw one orbital planet/node at angle `ang` on orbit radius `R`
      const orbitPos = (ang: number, R: number) => ({
        px: cx + R * Math.cos(ang),
        py: cy + R * TILT_Y * Math.sin(ang),
        depth: Math.sin(ang),      // positive = front, negative = back
      });

      // Draw ONE pass of content nodes — called twice (back then front) so
      // the cylinder body naturally occludes back-of-orbit objects.
      const drawNodes = (front: boolean) => {
        if (!isOn) return;

        if (mode.id === 'orrery') {
          // Orbital paths
          PLANETS.forEach(pl => {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,255,255,${front ? 0 : 0.07})`;
            ctx.lineWidth = 0.6;
            ctx.ellipse(cx, cy, pl.orbitR, pl.orbitR * TILT_Y, 0, 0, Math.PI*2);
            ctx.stroke();
          });
          if (!front) {
            // Sun glow (at device centre, drawn once)
            const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
            sg.addColorStop(0, 'rgba(255,230,120,0.9)');
            sg.addColorStop(0.6, 'rgba(255,150,30,0.4)');
            sg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI*2);
            ctx.fillStyle = sg; ctx.fill();
            ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI*2);
            ctx.fillStyle = '#ffe87a'; ctx.fill();
          }
          PLANETS.forEach((pl, i) => {
            const omega = Math.pow(pl.a, -1.5) * K_SCALE;
            const ang   = omega * time + i * 1.6;
            const { px, py, depth } = orbitPos(ang, pl.orbitR);
            if (front ? depth < 0 : depth >= 0) return; // depth-split pass
            const alpha = front ? 1.0 : 0.35;
            const grd = ctx.createRadialGradient(px, py, 0, px, py, pl.r * 3);
            grd.addColorStop(0, pl.color + `${Math.round(alpha*204).toString(16).padStart(2,'0')}`);
            grd.addColorStop(1, pl.color + '00');
            ctx.beginPath(); ctx.arc(px, py, pl.r * 3, 0, Math.PI*2);
            ctx.fillStyle = grd; ctx.fill();
            ctx.beginPath(); ctx.arc(px, py, pl.r, 0, Math.PI*2);
            ctx.fillStyle = pl.color; ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;
            if (front) {
              ctx.font = '8px monospace'; ctx.fillStyle = `rgba(255,255,255,0.7)`;
              ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
              ctx.fillText(pl.label, px, py - pl.r - 3);
            }
          });

        } else if (mode.id === 'messages') {
          const names = ['Maya', 'Work', 'NullOS', 'Nathan', 'Kai'];
          const R = 148;
          if (!front) {
            ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.6;
            ctx.ellipse(cx, cy, R, R * TILT_Y, 0, 0, Math.PI*2); ctx.stroke();
          }
          names.forEach((nm, i) => {
            const ang   = (i / names.length) * Math.PI * 2 + time * 0.0002;
            const { px, py, depth } = orbitPos(ang, R);
            if (front ? depth < 0 : depth >= 0) return;
            const alpha = front ? 1.0 : 0.3;
            const grd = ctx.createRadialGradient(px, py, 0, px, py, 22);
            grd.addColorStop(0, `rgba(80,200,255,${alpha*0.4})`);
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath(); ctx.arc(px, py, 22, 0, Math.PI*2); ctx.fillStyle = grd; ctx.fill();
            ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI*2);
            ctx.strokeStyle = `rgba(100,210,255,${alpha})`; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.font = '9px monospace'; ctx.fillStyle = `rgba(200,240,255,${alpha})`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(nm[0], px, py); ctx.textBaseline = 'alphabetic';
            if (front) { ctx.font = '8px monospace'; ctx.fillStyle = `rgba(160,220,255,0.7)`; ctx.fillText(nm, px, py + 17); }
          });

        } else if (mode.id === 'nav') {
          if (!front) {
            [100, 150, 195].forEach(r => {
              ctx.beginPath(); ctx.strokeStyle = 'rgba(80,220,180,0.07)'; ctx.lineWidth = 0.6;
              ctx.ellipse(cx, cy, r, r * TILT_Y, 0, 0, Math.PI*2); ctx.stroke();
            });
          }
          const dirs = [['N',180],['NE',130],['E',170],['SE',130],['S',180],['SW',130],['W',170],['NW',130]] as [string,number][];
          dirs.forEach(([d, R], i) => {
            const ang = (i / 8) * Math.PI * 2 - Math.PI / 2 + time * 0.00004;
            const { px, py, depth } = orbitPos(ang, R);
            if (front ? depth < 0 : depth >= 0) return;
            const alpha = front ? 1 : 0.25;
            ctx.font = 'bold 10px monospace';
            ctx.fillStyle = d === 'N' ? `rgba(120,255,200,${alpha})` : `rgba(100,230,180,${alpha*0.65})`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(d, px, py);
          });
          // Waypoint
          const wa = time * 0.00018;
          const { px: wpx, py: wpy, depth: wd } = orbitPos(wa, 145);
          if ((front && wd >= 0) || (!front && wd < 0)) {
            const wa2 = front ? 1.0 : 0.3;
            ctx.beginPath(); ctx.moveTo(wpx, wpy - 9); ctx.lineTo(wpx + 6, wpy + 4); ctx.lineTo(wpx - 6, wpy + 4); ctx.closePath();
            ctx.fillStyle = `rgba(255,200,80,${wa2})`; ctx.fill();
          }

        } else if (mode.id === 'model') {
          // Icosahedron floating near the device, rotating
          const offX = cx + (front ? 1 : -1) * 0;
          const offY = cy;
          const scale  = Math.min(W, H) * 0.115;
          const rotYa  = time * 0.00032;
          const rotXa  = 0.42 + Math.sin(time * 0.00012) * 0.18;
          const proj = ICOSA_V.map(v => {
            const [rx, ry, rz] = rotX(rotY(v, rotYa), rotXa);
            return { sx: offX + rx * scale, sy: offY + ry * scale * 0.6, depth: rz };
          });
          if (!front) {
            // Back edges
            [...ICOSA_E].filter(([i,j]) => (proj[i].depth + proj[j].depth) < 0)
              .forEach(([i,j]) => {
                ctx.beginPath(); ctx.strokeStyle = 'rgba(160,110,255,0.15)'; ctx.lineWidth = 0.6;
                ctx.moveTo(proj[i].sx, proj[i].sy); ctx.lineTo(proj[j].sx, proj[j].sy); ctx.stroke();
              });
          } else {
            // Front edges
            [...ICOSA_E].filter(([i,j]) => (proj[i].depth + proj[j].depth) >= 0)
              .sort(([ai,aj],[bi,bj]) => (proj[ai].depth+proj[aj].depth) - (proj[bi].depth+proj[bj].depth))
              .forEach(([i,j]) => {
                const d = (proj[i].depth + proj[j].depth) / 2;
                const a = (d + 1) / 2;
                ctx.beginPath(); ctx.strokeStyle = `rgba(180,130,255,${0.2+a*0.6})`; ctx.lineWidth = 0.8 + a * 0.8;
                ctx.moveTo(proj[i].sx, proj[i].sy); ctx.lineTo(proj[j].sx, proj[j].sy); ctx.stroke();
              });
            proj.forEach(({ sx, sy, depth }) => {
              const a = (depth + 1) / 2;
              ctx.beginPath(); ctx.arc(sx, sy, 2.5 + a * 2, 0, Math.PI*2);
              ctx.fillStyle = `rgba(210,170,255,${0.5 + a * 0.5})`; ctx.fill();
            });
          }

        } else if (mode.id === 'music') {
          const omega0 = 0.00016;
          const A0 = 162;
          const waveR = 88;
          const harmonics = 12;

          if (!front) {
            ctx.beginPath();
            for (let k = 0; k <= 240; k++) {
              const a = (k / 240) * Math.PI * 2;
              let r = waveR;
              for (let n = 1; n <= 8; n++) r += (A0/(n*5.8)) * Math.sin(n*a + n*omega0*time*3);
              const px = cx + r * Math.cos(a), py = cy + r * TILT_Y * Math.sin(a);
              if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.strokeStyle = 'rgba(100,225,180,0.28)'; ctx.lineWidth = 1.0; ctx.stroke();

            for (let n = 1; n <= 6; n++) {
              const spectrumX = cx - 210 + n * 20;
              const barHeight = 18 + (A0 / n) * 0.42 * (0.55 + 0.45 * Math.sin(time * omega0 * (n + 2)));
              ctx.fillStyle = `hsla(${(n * 34) % 360}, 75%, 65%, 0.28)`;
              ctx.fillRect(spectrumX, cy + 116 - barHeight, 10, barHeight);
            }
          }

          for (let n = 1; n <= harmonics; n++) {
            const ang = n * omega0 * time;
            const R   = waveR + (A0/n)*0.52 * Math.sin(ang * 1.5);
            const { px, py, depth } = orbitPos(ang, R);
            if (front ? depth < 0 : depth >= 0) continue;

            const hue = (n * 30) % 360;
            const nR = 3.5 + (A0/n)*0.02;
            const a = front ? 1.0 : 0.28;

            if (front) {
              ctx.beginPath();
              ctx.strokeStyle = `hsla(${hue}, 80%, 66%, 0.18)`;
              ctx.lineWidth = 0.7;
              ctx.moveTo(cx, cy);
              ctx.lineTo(px, py);
              ctx.stroke();
            }

            const grd = ctx.createRadialGradient(px, py, 0, px, py, nR * 3);
            grd.addColorStop(0, `hsla(${hue},80%,65%,${a*0.7})`);
            grd.addColorStop(1, `hsla(${hue},80%,65%,0)`);
            ctx.beginPath(); ctx.arc(px, py, nR * 3, 0, Math.PI*2); ctx.fillStyle = grd; ctx.fill();
            ctx.beginPath(); ctx.arc(px, py, nR, 0, Math.PI*2);
            ctx.fillStyle = `hsl(${hue},80%,68%)`; ctx.globalAlpha = a; ctx.fill(); ctx.globalAlpha = 1;

            if (front && n <= 6) {
              ctx.font = '8px monospace';
              ctx.fillStyle = 'rgba(255,255,255,0.45)';
              ctx.textAlign = 'center';
              ctx.fillText(`${n}x`, px, py - nR - 6);
            }
          }
        }
      };

      // ── Render back pass (behind cylinder) ───────────────────────────────
      drawNodes(false);

      // ── Cylinder device ───────────────────────────────────────────────────
      // Back bottom cap
      ctx.beginPath(); ctx.ellipse(cx, cy + CYL_H, CYL_W, CAP_RY, 0, 0, Math.PI*2);
      ctx.fillStyle = '#181818'; ctx.fill();
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1; ctx.stroke();

      // Body gradient (cylindrical shading)
      const bGrd = ctx.createLinearGradient(cx - CYL_W, 0, cx + CYL_W, 0);
      bGrd.addColorStop(0, '#0e0e0e'); bGrd.addColorStop(0.18,'#404040');
      bGrd.addColorStop(0.38,'#525252'); bGrd.addColorStop(0.5,'#3c3c3c');
      bGrd.addColorStop(0.72,'#4a4a4a'); bGrd.addColorStop(0.88,'#383838');
      bGrd.addColorStop(1,'#0c0c0c');
      ctx.fillStyle = bGrd; ctx.fillRect(cx - CYL_W, cy - CYL_H, CYL_W*2, CYL_H*2);
      ctx.strokeStyle = '#272727'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx-CYL_W, cy-CYL_H); ctx.lineTo(cx-CYL_W, cy+CYL_H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+CYL_W, cy-CYL_H); ctx.lineTo(cx+CYL_W, cy+CYL_H); ctx.stroke();

      // VCSEL emitter band
      if (isOn) {
        const bTop = cy - 28, bH = 56, COLS = 18, ROWS = 8;
        const bGlow = ctx.createLinearGradient(cx - CYL_W, 0, cx + CYL_W, 0);
        bGlow.addColorStop(0,'rgba(50,175,255,0)'); bGlow.addColorStop(0.25,'rgba(50,175,255,0.22)');
        bGlow.addColorStop(0.75,'rgba(50,175,255,0.22)'); bGlow.addColorStop(1,'rgba(50,175,255,0)');
        ctx.fillStyle = bGlow; ctx.fillRect(cx - CYL_W, bTop, CYL_W*2, bH);
        for (let row = 0; row < ROWS; row++) {
          const ey = bTop + row * (bH / (ROWS-1));
          for (let col = 0; col < COLS; col++) {
            const t = (col / (COLS-1)) * 2 - 1;
            const cos = Math.sqrt(1 - t * t);
            const flick = 0.35 + 0.65 * Math.sin(time * 0.009 * (row*17+col*7));
            ctx.beginPath(); ctx.arc(cx + CYL_W * t, ey, 1.2*cos+0.3, 0, Math.PI*2);
            ctx.fillStyle = `rgba(60,200,255,${cos*flick*0.82})`; ctx.fill();
          }
        }
        ctx.strokeStyle = 'rgba(70,190,255,0.18)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(cx-CYL_W, bTop); ctx.lineTo(cx+CYL_W, bTop); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-CYL_W, bTop+bH); ctx.lineTo(cx+CYL_W, bTop+bH); ctx.stroke();
      }

      // Ring details
      [0.28,0.48,0.52,0.72].forEach(f=>{
        const ly = cy - CYL_H + f * CYL_H*2;
        ctx.strokeStyle='rgba(80,80,80,0.5)'; ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.moveTo(cx-CYL_W, ly); ctx.lineTo(cx+CYL_W, ly); ctx.stroke();
      });

      // Top cap
      ctx.beginPath(); ctx.ellipse(cx, cy - CYL_H, CYL_W, CAP_RY, 0, 0, Math.PI*2);
      ctx.fillStyle = '#242424'; ctx.fill();
      ctx.strokeStyle = '#3c3c3c'; ctx.lineWidth = 1; ctx.stroke();

      // Display on top cap
      if (isOn) {
        const pulse = 0.75 + 0.25 * Math.sin(time * 0.0015);
        const dGrd = ctx.createRadialGradient(cx, cy-CYL_H, 0, cx, cy-CYL_H, 22);
        dGrd.addColorStop(0, `rgba(100,220,255,${0.92*pulse})`);
        dGrd.addColorStop(0.5, `rgba(40,140,220,${0.52*pulse})`);
        dGrd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.ellipse(cx, cy-CYL_H, 24, CAP_RY*0.72, 0, 0, Math.PI*2);
        ctx.fillStyle = dGrd; ctx.fill();
        ctx.strokeStyle = 'rgba(160,230,255,0.3)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(cx-10, cy-CYL_H); ctx.lineTo(cx+10, cy-CYL_H);
        ctx.moveTo(cx, cy-CYL_H-5); ctx.lineTo(cx, cy-CYL_H+5); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx, cy-CYL_H, CYL_W-5, CAP_RY-2, 0, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(70,200,255,${0.22*pulse})`; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.ellipse(cx, cy-CYL_H, 18, CAP_RY*0.6, 0, 0, Math.PI*2);
        ctx.fillStyle = '#111'; ctx.fill();
      }

      // Power button dot
      ctx.beginPath(); ctx.arc(cx + CYL_W*0.55, cy - CYL_H, 3, 0, Math.PI*2);
      ctx.fillStyle = isOn ? 'rgba(80,220,255,0.85)' : '#252525'; ctx.fill();

      // Bottom grip ring
      ctx.beginPath(); ctx.ellipse(cx, cy+CYL_H+CAP_RY*0.5, CYL_W*0.7, CAP_RY*0.44, 0, 0, Math.PI*2);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 4; ctx.stroke();

      // ── Render front pass (in front of cylinder) ──────────────────────────
      drawNodes(true);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [modeIdx, projecting]);

  const mode = MODES[modeIdx];

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#060a11] font-mono select-none overflow-hidden text-white">
      {/* Canvas area */}
      <div ref={wrapRef} className="flex-1 relative min-h-[360px] md:min-h-0">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* HUD — top-left */}
        <div className="absolute top-4 left-4 space-y-0.5 pointer-events-none">
          <div className="text-[9px] tracking-[0.4em] text-white/20 uppercase font-bold">Null.Cylinder</div>
          <div className="text-lg font-bold text-white leading-tight">{mode.label}</div>
          <div className="text-[9px] text-white/30 uppercase">{mode.desc}</div>
        </div>

        {/* HUD — top-right */}
        <div className="absolute top-4 right-4 text-right pointer-events-none">
          <div className="text-[9px] tracking-[0.3em] text-white/20 uppercase font-bold">Projection</div>
          <div className={`text-sm font-bold mt-0.5 ${projecting ? 'text-cyan-400' : 'text-white/15'}`}>
            {projecting ? '● ACTIVE' : '○ STANDBY'}
          </div>
          <div className="text-[8px] text-white/20 mt-1">4,096 VCSELs · 120 Hz</div>
          {projecting && (
            <div className="text-[8px] text-cyan-400/40 mt-0.5 uppercase tracking-widest">D{mode.q}/{mode.p}</div>
          )}
        </div>

        {/* Corner brackets */}
        {(['top-2 left-2','top-2 right-2','bottom-2 left-2','bottom-2 right-2'] as const).map((pos,i)=>(
          <div key={i} className={`absolute ${pos} w-5 h-5`} style={{
            borderTopWidth: i<2 ? 1 : 0, borderBottomWidth: i>=2 ? 1 : 0,
            borderLeftWidth: i%2===0 ? 1 : 0, borderRightWidth: i%2===1 ? 1 : 0,
            borderColor:'rgba(255,255,255,0.08)'
          }}/>
        ))}
      </div>

      {/* Controls panel */}
      <div className="w-full md:w-[260px] flex flex-col border-l border-white/5 bg-[#070b13] overflow-y-auto">
        <div className="p-5 border-b border-white/5 shrink-0">
          <div className="text-[10px] tracking-[0.3em] font-bold uppercase text-white">◊.NULL_CYLINDER</div>
          <div className="text-[8px] text-white/20 mt-1 uppercase tracking-widest">Holographic Personal Computer</div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {['52mm × 28mm','95g','Ti-6Al-4V'].map(s=>(
              <span key={s} className="text-[8px] text-white/30 border border-white/10 px-1.5 py-0.5">{s}</span>
            ))}
          </div>
        </div>

        <div className="p-4 border-b border-white/5 shrink-0">
          <div className="text-[9px] tracking-[0.3em] text-white/20 uppercase mb-2 font-bold">Mode</div>
          <div className="space-y-1.5">
            {MODES.map((m,i)=>(
              <button key={m.id} onClick={()=>setModeIdx(i)}
                className={`w-full px-3 py-2.5 text-left border transition-all ${
                  modeIdx===i ? 'border-cyan-500/50 bg-cyan-500/8 text-cyan-300' : 'border-white/5 hover:border-white/15 text-white/35'
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

        <div className="p-4 border-b border-white/5 shrink-0">
          <button onClick={()=>setProjecting(p=>!p)}
            className={`w-full py-3 border font-bold text-[10px] tracking-[0.3em] uppercase transition-all ${
              projecting ? 'border-cyan-500/45 bg-cyan-500/8 text-cyan-300' : 'border-white/10 text-white/25 hover:border-white/25 hover:text-white/50'
            }`}>
            {projecting ? '◉ PROJECTION ON' : '○ PROJECTION OFF'}
          </button>
        </div>

        <div className="p-4 mt-auto">
          <div className="text-[9px] tracking-[0.25em] text-white/15 uppercase mb-2 font-bold">Specifications</div>
          <div className="space-y-1.5 text-[8px] text-white/20 uppercase">
            {([['Emitters','4,096 VCSELs'],['Array','64×64 bands'],['FoV','360°×60°'],
               ['Resolution','0.05° angular'],['Depth','64 planes'],['Refresh','120 Hz'],
               ['Processor','E₈ Null Sphere'],['OS','NullOS 1.0']] as [string,string][]).map(([k,v])=>(
              <div key={k} className="flex justify-between">
                <span>{k}</span><span className="text-white/40">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
