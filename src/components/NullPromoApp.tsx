"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, q: number, p: number, rot: number, color: string) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  for (let i = 0; i <= q; i++) {
    const a = (i * p * 2 * Math.PI) / q + rot;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

interface Product {
  id: string; name: string; tagline: string; badge: string; color: string; accent: string;
  q: number; p: number; price: string; availability: string; isPreorder: boolean;
  docSlug: string; ctaLabel: string; description: string; bullets: string[]; stat: string[][];
}

const PRODUCTS: Product[] = [
  {
    id: 'nulldeck',
    name: 'Null Cylinder',
    tagline: 'Your entire world. In your pocket. Projected around you.',
    badge: 'NullDeck',
    color: '#0a0a14',
    accent: '#50c8ff',
    q: 8, p: 3,
    price: '$1,299',
    availability: 'Pre-order · Ships Q4 2026',
    isPreorder: true,
    docSlug: 'NullDeck v1.txt',
    ctaLabel: '◆ Pre-order',
    description: 'A titanium cylinder the size of a shotgun shell. Twist the grip ring. Watch your world unfold in 360° of holographic light, floating in the space around you. 4,096 phase-controlled laser emitters. 120 Hz. No glasses. No headset. Just light.',
    bullets: [
      '360° × 60° holographic projection envelope',
      '4,096 individually phase-controlled VCSELs',
      'True 3D light field — walk around your content',
      '60 GHz radar gesture tracking, 3m range',
      'E₈ null sphere processor · 100 GHz photonic clock',
      '6 dock ecosystems — Lantern, Helm, Well, Hearth',
    ],
    stat: [['4,096', 'laser emitters'], ['120Hz', 'refresh'], ['52mm', 'tall'], ['95g', 'weight']],
  },
  {
    id: 'nullhover',
    name: 'Null Hover',
    tagline: "Gravity is a suggestion. We're politely declining.",
    badge: 'NullHover',
    color: '#0a140a',
    accent: '#50e090',
    q: 6, p: 1,
    price: '$340,000',
    availability: 'Pre-order · First delivery Q2 2027',
    isPreorder: true,
    docSlug: 'NullHover v1.txt',
    ctaLabel: '◆ Pre-order',
    description: 'A spherical electrodynamic craft wrapped around a gyroscopic core and superconducting coil set. No rails. No air cushion. No props. Over dry soil, seawater, concrete, or metal, the null sphere avionics retune field geometry in real time to keep the hull levitating and terrain-locked.',
    bullets: [
      'YBCO superconducting coil pack with gyroscopic stabilization core',
      'Terrain-following EDS envelope for lift, translation, and stability',
      'Works over: soil, pavement, seawater, ice, metal',
      'Quad E₈ null sphere avionics — <100ns control latency',
      '60 kWh Li-Si battery pack · 8hr LN₂ cryo endurance',
      '2-passenger capacity · 305 kg payload',
    ],
    stat: [['4m', 'diameter'], ['800kg', 'craft mass'], ['28MHz', 'EDS frequency'], ['10kHz', 'control loop']],
  },
  {
    id: 'nullaegis',
    name: 'Null Aegis',
    tagline: 'The Shell makes the room a computer. The Aegis makes you the room.',
    badge: 'NullAegis',
    color: '#080e14',
    accent: '#60a0ff',
    q: 11, p: 4,
    price: 'By Inquiry',
    availability: 'Research partnerships · 2028 est.',
    isPreorder: false,
    docSlug: 'NullAegis v1.txt',
    ctaLabel: '◆ Inquire',
    description: 'A 12 kg full-body wearable integrating every personal device in the Null ecosystem. 128 E₈ stacks distributed across the suit. Holographic display from visor and wrist projectors. Electromagnetic levitation from boots and back array. Micro-forge in the left forearm. The Null Shell, worn on your body.',
    bullets: [
      '128 E₈ null sphere stacks — full Orbit OS instance on-suit',
      'Full holographic envelope — visor + wrist projectors + body shell',
      'Electromagnetic levitation from boot + back coil arrays',
      'Null Suture repair fleet — self-healing suit surface',
      'Forearm micro-forge — prints tools from feedstock cartridges',
      '7-layer construction: comfort liner → thermal → structural → photonic → optical armour → EDS → shell',
    ],
    stat: [['128', 'E₈ stacks'], ['12kg', 'total mass'], ['4mm', 'avg thickness'], ['7', 'suit layers']],
  },
  {
    id: 'nullshell',
    name: 'Null Shell',
    tagline: "You don't put a computer in a room. You make the room the computer.",
    badge: 'NullShell',
    color: '#0e0e0a',
    accent: '#d0c050',
    q: 9, p: 4,
    price: 'Per-project',
    availability: 'Architecture firms · Inquiry only',
    isPreorder: false,
    docSlug: 'NullShell v1.txt',
    ctaLabel: '◆ Inquire',
    description: 'Programmable photonic architecture at building scale. Shell Panels — 500×500×30 mm slabs — replace conventional walls, floors, and ceilings. Each panel senses, computes, and reconfigures. Acoustics, optics, climate, and room geometry become software-defined. A building that knows who is inside it.',
    bullets: [
      '500×500 mm Shell Panels — drop-in wall, floor, and ceiling replacement',
      'Programmable acoustics: absorb, reflect, or focus sound per-zone',
      'Electrodynamic partitions: merge or divide rooms in under 500 ms',
      'Circadian photonic lighting — wavelength and colour matched to biology',
      'Presence-aware climate: heats and cools exactly where occupants are',
      'Null Hover parking lane — floor EDS at 28 MHz for hover docking',
    ],
    stat: [['500ms', 'room reconfig'], ['3ms', 'presence detect'], ['28MHz', 'hover lane'], ['E₈', 'ADE class']],
  },
  {
    id: 'nullforge',
    name: 'Null Forge',
    tagline: 'Build matter from nothing but light and patience.',
    badge: 'NullForge',
    color: '#140a0a',
    accent: '#e08050',
    q: 7, p: 3,
    price: '$4,200,000',
    availability: 'Research license · Contact sales',
    isPreorder: false,
    docSlug: 'NullForge v1.txt',
    ctaLabel: '◆ Contact Sales',
    description: 'An atomic fabrication bench the size of a shipping container. Feed it elements, give it a crystal structure, walk away. The SLM optical trap array places 10⁶ atoms per second into E₈-classified lattice positions. Software-defined matter at the scale of chemistry.',
    bullets: [
      '10⁶ simultaneous SLM optical trap sites',
      '10⁶ atoms/second placement rate',
      'FCC / BCC / HCP / Diamond / E₈ quasicrystal support',
      'Element palette: Tier 1–4 (C, Si, Au through amino acids)',
      'Zeeman slower → MOT → sub-Doppler cooling chain',
      'Covalent bonding laser (355 nm) + metallic spontaneous',
    ],
    stat: [['10⁶', 'atoms/sec'], ['10¹³', 'atom capacity'], ['100μm³', 'build volume'], ['E₈', 'ADE class']],
  },
  {
    id: 'nullmind',
    name: 'Null Mind',
    tagline: 'Cognition as geometry. Thought as a closed orbit.',
    badge: 'NullMind',
    color: '#08080e',
    accent: '#a080ff',
    q: 13, p: 5,
    price: '$499/mo',
    availability: 'API access · Beta open',
    isPreorder: false,
    docSlug: 'NullMind v1.txt',
    ctaLabel: '◆ Access Beta',
    description: 'A photonic neural network trained entirely on the ADE classification of cognition. Each layer is an orbit. Each inference is a round-trip on a null billiard. Converges in 3 picoseconds. No gradient descent. No backprop. Just light finding its closed path.',
    bullets: [
      'ADE-classified neural layers — E₈ at maximum depth',
      'Runs on null sphere substrate — 100 GHz inference',
      'Geometric memory: E₈ topological protection',
      'On-device voice model — 50,000 word vocabulary',
      'No cloud required for 99% of inference tasks',
      'Formally verifiable convergence via Riemann zeros',
    ],
    stat: [['3ps', 'inference'], ['50k', 'word vocab'], ['240', 'E₈ states'], ['1mW', 'optical power']],
  },
  {
    id: 'orbitos',
    name: 'Orbit OS',
    tagline: 'You do not use this operating system. You see it think.',
    badge: 'OrbitOS',
    color: '#080810',
    accent: '#b070ff',
    q: 7, p: 2,
    price: 'Bundled',
    availability: 'Ships with all Null Sphere devices',
    isPreorder: false,
    docSlug: 'OrbitOS v1.txt',
    ctaLabel: '◆ Inquire',
    description: 'The operating system of the Null sphere computer. Resources are geometry: processor time is photon orbital period, memory is WGM mode occupation, bandwidth is evanescent coupling rate. Orbit OS is a dynamic Apollonian sphere packing algorithm running on the very microspheres it manages. Display and computation are the same light.',
    bullets: [
      'Apollonian sphere packing — fractal memory hierarchy at every scale',
      'WGM mode addressing — 3 ps register access time',
      'E₈ topological memory protection — bit-level fault tolerance',
      'Holographic state display — the display IS the computation',
      'POSIX-compatible syscall layer for legacy software',
      'Bundled with NullDeck, NullMind, NullForge, and NullShell',
    ],
    stat: [['3ps', 'register access'], ['100GHz', 'clock'], ['E₈', 'error correction'], ['0', 'extra cost']],
  },
  {
    id: 'nullcortex',
    name: 'Null Cortex',
    tagline: 'A grain of light behind your ear, commanding a fleet in your blood.',
    badge: 'NullCortex',
    color: '#0a080e',
    accent: '#e060c0',
    q: 13, p: 6,
    price: 'Clinical Trial',
    availability: 'IRB review pending · Inquiry only',
    isPreorder: false,
    docSlug: 'NullCortex v1.txt',
    ctaLabel: '◆ Inquire',
    description: 'A 0.4 g photonic brain-computer interface implanted subdermally behind the ear. Commands a circulating fleet of 10⁸–10¹⁰ nanobots via near-infrared optical link. Closed-loop biological maintenance: immune surveillance, targeted drug delivery, cellular repair, and senescent cell clearance — continuously, for decades.',
    bullets: [
      '12×8×1.2 mm ceramic-sealed chip — outpatient implant, 20-minute procedure',
      '10⁸–10¹⁰ nanobot fleet, 500 nm–2 μm diameter units',
      'NIR optical + ultrasonic bidirectional fleet command link',
      'Senescent cell clearance — longevity extension [SPECULATIVE]',
      'Natural language health queries via Null Mind integration',
      'E₈ null sphere processor — 100 GHz fleet coordination',
    ],
    stat: [['0.4g', 'chip mass'], ['10¹⁰', 'nanobot fleet'], ['100GHz', 'coordination'], ['20min', 'implant time']],
  },
  {
    id: 'nullbilliards',
    name: 'Null Billiards',
    tagline: 'Fire a photon. Watch it become mass.',
    badge: 'NullBilliards',
    color: '#0c0c0c',
    accent: '#ffffff',
    q: 5, p: 2,
    price: 'Free',
    availability: 'Available now · Play in browser',
    isPreorder: false,
    docSlug: 'NullBilliards v1.txt',
    ctaLabel: '▶ Launch App',
    description: 'A meditative clicker built on the same mathematics that powers every null sphere processor. Fire photons. Collect bounces. Advance the Fibonacci manifold from triangle to pentagram to octagram. Watch q emerge from massless light. This is the physics, made playable.',
    bullets: [
      'Fibonacci manifold sequence: (3,1)→(5,2)→(8,3)→(13,5)→…',
      'Same drawStarPolygon math as the real E₈ processor',
      'ADE orbit visualization — real-time q/p rendering',
      'Clicker mechanics: upgrades, auto-bounce, energy',
      'α = pπ/q — the incidence angle that makes mass from light',
      'Unlock all 8 manifold levels to reach the E₈ singularity',
    ],
    stat: [['89', 'max q'], ['8', 'manifold levels'], ['∞', 'bounces'], ['0', 'cost']],
  },
];

function ProductCanvas({ q, p, accent }: { q: number; p: number; accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    let raf: number;
    const loop = (t: number) => {
      ctx.clearRect(0, 0, 80, 80);
      const rot = t * 0.0004;
      drawStar(ctx, 40, 40, 32, q, p, rot, accent + '80');
      drawStar(ctx, 40, 40, 20, q, p, -rot * 0.6, accent + '50');
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [q, p, accent]);
  return <canvas ref={ref} width={80} height={80} className="w-full h-full" />;
}

export default function NullPromoApp() {
  const [selected, setSelected] = useState(0);
  const product = PRODUCTS[selected];

  return (
    <div className="w-full h-full flex flex-col bg-black font-mono select-none overflow-hidden text-white">
      {/* Tab bar */}
      <div className="flex border-b border-white/5 shrink-0 overflow-x-auto">
        {PRODUCTS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setSelected(i)}
            className={`px-3 py-2.5 shrink-0 text-[8px] font-bold uppercase tracking-[0.2em] border-r border-white/5 transition-all ${selected === i ? 'bg-white text-black' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
          >
            {p.badge}
          </button>
        ))}
      </div>

      {/* Main content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="flex-1 overflow-y-auto flex flex-col"
        >
          {/* Hero */}
          <div className="relative px-8 pt-10 pb-8 border-b border-white/5 shrink-0" style={{ background: `linear-gradient(135deg, ${product.color} 0%, #000 100%)` }}>
            {/* Background ADE orbit */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-32 h-32 opacity-20 pointer-events-none">
              <ProductCanvas q={product.q} p={product.p} accent={product.accent} />
            </div>
            <div className="text-[8px] tracking-[0.5em] uppercase mb-3 font-bold" style={{ color: product.accent + 'aa' }}>
              ◊.THE_NULL_LINE · {product.badge.toUpperCase()}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-none mb-2">{product.name}</h1>
            <p className="text-sm text-white/50 max-w-lg leading-relaxed italic mb-5">&ldquo;{product.tagline}&rdquo;</p>
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-2xl font-bold">{product.price}</span>
              <span className="text-[9px] text-white/30 uppercase tracking-widest border border-white/10 px-2 py-1">{product.availability}</span>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 border-b border-white/5 shrink-0">
            {product.stat.map(([val, lbl]) => (
              <div key={lbl} className="p-4 border-r border-white/5 last:border-r-0">
                <div className="text-xl font-bold" style={{ color: product.accent }}>{val}</div>
                <div className="text-[8px] text-white/30 uppercase tracking-wider mt-0.5">{lbl}</div>
              </div>
            ))}
          </div>

          {/* Description + bullets */}
          <div className="flex-1 p-6 md:p-8 grid md:grid-cols-2 gap-8">
            <div>
              <div className="text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: product.accent + '88' }}>About</div>
              <p className="text-[13px] text-white/60 leading-relaxed">{product.description}</p>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: product.accent + '88' }}>Features</div>
              <ul className="space-y-2">
                {product.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-white/50 leading-snug">
                    <span style={{ color: product.accent }} className="shrink-0 mt-0.5">◆</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA footer */}
          <div className="px-6 pb-8 shrink-0">
            <div className="flex flex-wrap gap-3 mb-5">
              {product.isPreorder ? (
                <span className="px-6 py-3 font-bold text-[10px] tracking-[0.3em] uppercase bg-white/[0.04] text-white/15 border border-white/5 line-through cursor-not-allowed">
                  ◆ Pre-order — Closed
                </span>
              ) : (
                <a
                  href={product.price === 'Free' ? '/' : 'mailto:nathanoll@proton.me'}
                  className="px-6 py-3 font-bold text-[10px] tracking-[0.3em] uppercase transition-all text-black inline-block hover:opacity-90"
                  style={{ backgroundColor: product.accent }}
                >
                  {product.ctaLabel}
                </a>
              )}
              <a
                href={`/docs/${encodeURIComponent(product.docSlug)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border border-white/10 font-bold text-[10px] tracking-[0.3em] uppercase text-white/40 hover:text-white hover:border-white/30 transition-all inline-block"
              >
                ◇ Read Spec Sheet
              </a>
            </div>
            <p className="text-[8px] text-white/20 uppercase tracking-widest">
              Inquiries:{' '}
              <a href="mailto:nathanoll@proton.me" className="hover:text-white/50 transition-colors underline underline-offset-2">
                nathanoll@proton.me
              </a>
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
