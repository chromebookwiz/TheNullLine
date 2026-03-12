"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp, Cpu, Atom, ChevronRight } from 'lucide-react';

interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  multiplier: number;
  type: 'click' | 'auto';
  icon: React.ReactNode;
}

const UPGRADES: Upgrade[] = [
  { id: 'p_coupling', name: 'Photon Coupling', description: '+1 Edge per click', cost: 10, multiplier: 1, type: 'click', icon: <Zap size={14} /> },
  { id: 'b_resonance', name: 'Billiard Resonance', description: '+5 Edges per click', cost: 100, multiplier: 5, type: 'click', icon: <TrendingUp size={14} /> },
  { id: 'm_refinement', name: 'Manifold Refinement', description: '+20 Edges per click', cost: 500, multiplier: 20, type: 'click', icon: <Cpu size={14} /> },
  { id: 'n_localization', name: 'Null Localization', description: '+50 Edges per click', cost: 2000, multiplier: 50, type: 'click', icon: <Atom size={14} /> },
];

export default function ShapeClicker() {
  const [q, setQ] = useState(3);
  const [energy, setEnergy] = useState(0);
  const [edgesPerClick, setEdgesPerClick] = useState(1);
  const [purchased, setPurchased] = useState<Record<string, number>>({});
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Geometric rendering logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.35;

      // Draw active manifold
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0, 0, 0, 1.0)";
      ctx.lineWidth = 1.5;

      // We use a "fractional q" for smooth morphing if we wanted, 
      // but for a clicker, the discrete "snap" is often more satisfying.
      const displayQ = Math.max(3, Math.floor(q));

      for (let i = 0; i <= displayQ; i++) {
        const angle = (i * 2 * Math.PI) / displayQ - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner star resonance (p=2 logic)
      if (displayQ > 4) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= displayQ; i++) {
          const angle = (i * 2 * 2 * Math.PI) / displayQ - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [q]);

  const handleManualClick = () => {
    const gain = Math.min(100 - (q % 100), edgesPerClick); // Cap at local manifold limit or target
    setQ(prev => prev + edgesPerClick);
    setEnergy(prev => prev + edgesPerClick);
  };

  const buyUpgrade = (upgrade: Upgrade) => {
    if (energy >= upgrade.cost) {
      setEnergy(prev => prev - upgrade.cost);
      setEdgesPerClick(prev => Math.min(100, prev + upgrade.multiplier));
      setPurchased(prev => ({ ...prev, [upgrade.id]: (prev[upgrade.id] || 0) + 1 }));
    }
  };


  // Mini shape preview renderer
  const miniShapeRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = miniShapeRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 60, 60);
    const cx = 30, cy = 30, r = 22;
    const sides = Math.max(3, Math.floor(q));
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [q]);

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-white font-mono select-none overflow-hidden">
      {/* Left Panel: The Manifold */}
      <div className="flex-1 relative flex flex-col items-center justify-center border-r border-black/5 bg-black/[0.01]">
        {/* Mini shape preview */}
        <div className="absolute top-3 left-3">
          <canvas ref={miniShapeRef} width={60} height={60} className="w-10 h-10 opacity-80" />
        </div>

        <div className="absolute top-8 left-8 space-y-1">
          <div className="text-[10px] tracking-[0.4em] text-black/30 font-bold uppercase">Manifold_State</div>
          <div className="text-2xl font-bold tracking-tighter text-black">Q = {q.toLocaleString()}</div>
        </div>

        <div className="absolute top-8 right-8 text-right space-y-1">
          <div className="text-[10px] tracking-[0.4em] text-black/30 font-bold uppercase">Potential_Energy</div>
          <div className="text-xl font-bold tracking-tighter text-black">{energy.toLocaleString()} eV</div>
        </div>

        <motion.div 
          onClick={handleManualClick}
          whileTap={{ scale: 0.95 }}
          className="relative cursor-pointer group"
        >
          <canvas 
            ref={canvasRef} 
            width={500} 
            height={500} 
            className="w-[300px] h-[300px] md:w-[450px] md:h-[450px]"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="px-4 py-2 bg-black text-white text-[10px] tracking-[0.3em] font-bold uppercase backdrop-blur-md">◊.EVOLVE_MANIFOLD</div>
          </div>
        </motion.div>

        <div className="absolute bottom-8 text-center">
            <div className="text-[9px] tracking-[0.3em] text-black/20 uppercase mb-2">Evolution Rate</div>
            <div className="text-[11px] font-bold text-black/60">+{edgesPerClick} EDGES / CLICK</div>
        </div>
      </div>

      {/* Right Panel: Upgrades */}
      <div className="w-full md:w-[350px] flex flex-col border-t md:border-t-0 border-black/10">
        <div className="p-6 border-b border-black/5 bg-black text-white flex items-center justify-between">
            <span className="text-[10px] tracking-[0.3em] font-bold uppercase">◊.UPGRADE_PATH</span>
            <div className="px-2 py-0.5 border border-white/20 rounded text-[9px] opacity-40">MAX:100_Epc</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {UPGRADES.map((up) => {
            const count = purchased[up.id] || 0;
            const currentCost = Math.floor(up.cost * Math.pow(1.5, count));
            const canAfford = energy >= currentCost;
            const isCapped = edgesPerClick >= 100;

            return (
              <button
                key={up.id}
                onClick={() => buyUpgrade({ ...up, cost: currentCost })}
                disabled={!canAfford || isCapped}
                className={`w-full p-4 border text-left transition-all flex items-center gap-4 group relative overflow-hidden ${
                  canAfford && !isCapped ? 'border-black hover:bg-black hover:text-white' : 'border-black/5 text-black/30 bg-transparent opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`p-2 rounded-lg ${canAfford && !isCapped ? 'bg-black/5 group-hover:bg-white/10' : 'bg-black/[0.02]'}`}>
                  {up.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase">{up.name}</span>
                    <span className="text-[9px] opacity-40 font-bold">LVL_{count}</span>
                  </div>
                  <p className="text-[9px] opacity-60 uppercase tracking-tight">{up.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold tracking-tighter">{currentCost} eV</div>
                </div>

                {isCapped && count > 0 && (
                   <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <span className="text-[9px] font-bold tracking-[0.3em] text-black uppercase">◊.LIMIT_REACHED</span>
                   </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6 bg-black/[0.02] border-t border-black/5">
            <div className="text-[9px] text-black/30 leading-relaxed uppercase">
                Increasing edge density localizes null momentum. At 100 EPC the manifold enters a state of persistent superconducting resonance.
            </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
