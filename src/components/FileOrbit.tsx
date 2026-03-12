"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { FileText, File as FileIcon, ChevronRight, X, Info, Cpu, LayoutGrid } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NullFile {
  name: string;
  type: 'txt' | 'docx' | 'pdf' | 'app';
  path: string;
}

const FILES: NullFile[] = [
  { name: "Photonic Core", type: "app", path: "app://photonic-core" },
  { name: "Magi v1", type: "txt", path: "/docs/Magi v1.txt" },
  { name: "NullAegis v1", type: "txt", path: "/docs/NullAegis v1.txt" },
  { name: "NullArk v1", type: "txt", path: "/docs/NullArk v1.txt" },
  { name: "NullBilliards v1", type: "txt", path: "/docs/NullBilliards v1.txt" },
  { name: "NullBot Blueprint", type: "pdf", path: "/docs/NullBot_Blueprint_v1.pdf" },
  { name: "NullBridge v1", type: "txt", path: "/docs/NullBridge v1.txt" },
  { name: "NullChronicle v1", type: "txt", path: "/docs/NullChronicle v1.txt" },
  { name: "NullCortex v1", type: "txt", path: "/docs/NullCortex v1.txt" },
  { name: "NullDeck v1", type: "txt", path: "/docs/NullDeck v1.txt" },
  { name: "NullDisk v1", type: "txt", path: "/docs/NullDisk v1.txt" },
  { name: "NullEmber v1", type: "txt", path: "/docs/NullEmber v1.txt" },
  { name: "NullForge v1", type: "txt", path: "/docs/NullForge v1.txt" },
  { name: "NullHorizon v1", type: "docx", path: "/docs/NullHorizon_v1.docx" },
  { name: "NullHover v1", type: "txt", path: "/docs/NullHover v1.txt" },
  { name: "NullLoom v1", type: "txt", path: "/docs/NullLoom v1.txt" },
  { name: "NullMind v1", type: "txt", path: "/docs/NullMind v1.txt" },
  { name: "NullRoot v1", type: "txt", path: "/docs/NullRoot v1.txt" },
  { name: "NullShell v1", type: "txt", path: "/docs/NullShell v1.txt" },
  { name: "NullStuture v1", type: "txt", path: "/docs/NullStuture v1.txt" },
  { name: "NullThread v1", type: "txt", path: "/docs/NullThread v1.txt" },
  { name: "NullWellspring v1", type: "txt", path: "/docs/NullWellspring v1.txt" },
  { name: "Null Billiards 2", type: "pdf", path: "/docs/Null_Billiards-2.pdf" },
  { name: "Nullware v1", type: "txt", path: "/docs/Nullware v1.txt" },
  { name: "OrbitOS v1", type: "txt", path: "/docs/OrbitOS v1.txt" },
  { name: "The Null Line Project", type: "txt", path: "/docs/TheNullLineProject.txt" },
].filter(f => f !== null) as NullFile[];

export default function FileOrbit({ 
  onFileSelect, 
  onActivate 
}: { 
  onFileSelect: (file: NullFile) => void,
  onActivate: () => void
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find item closest to the bottom (max Y)
    const total = FILES.length;
    const angleOffset = (rotation * Math.PI) / 180;
    let maxYa = -Infinity;
    let bestIdx = 0;

    FILES.forEach((_, i) => {
      const angle = (i * 2 * Math.PI) / total + angleOffset;
      const y = Math.sin(angle);
      if (y > maxYa) {
        maxYa = y;
        bestIdx = i;
      }
    });

    if (bestIdx !== activeIndex) {
      setActiveIndex(bestIdx);
    }
  }, [rotation, activeIndex]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Direct rotation based on wheel delta
      setRotation(prev => prev - e.deltaY * 0.1); 
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[600px] flex items-center justify-center cursor-ns-resize"
    >
      {/* Central Hub - Esoteric Symbol */}
      <div className="absolute w-40 h-40 flex items-center justify-center z-10 pointer-events-none">
        <div className="w-full h-full relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-black/5 [box-shadow:0_0_60px_rgba(0,0,0,0.02)]" />
          
          <div className="z-20 text-center flex flex-col items-center justify-center pointer-events-auto">
             <motion.button
               whileHover={{ scale: 1.1 }}
               whileTap={{ scale: 0.9 }}
               onClick={(e) => {
                 e.stopPropagation();
                 onActivate();
               }}
               className="w-14 h-14 esoteric-glass rounded-full flex items-center justify-center text-black/60 hover:text-black transition-all shadow-[0_0_40px_rgba(0,0,0,0.05)] border border-black/20"
             >
               <LayoutGrid size={24} />
             </motion.button>
             
             <div className="mt-4 absolute top-20 flex flex-col items-center">
                <div className="w-px h-8 bg-black/10" />
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] tracking-[0.4em] font-light text-black/60 uppercase mt-2 whitespace-nowrap"
                >
                  ◊.{FILES[activeIndex].name.toUpperCase().replace(/\s/g, '_')}
                </motion.div>
             </div>
          </div>
        </div>
      </div>

      {/* Orbiting Files */}
      <div className="relative w-full h-full flex items-center justify-center">
        {FILES.map((file, i) => {
          const total = FILES.length;
          const angleOffset = (rotation * Math.PI) / 180;
          const angle = (i * 2 * Math.PI) / total + angleOffset;
          const radius = 260;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          
          // Calculate opacity based on position (faded at the back)
          const zIndex = Math.round(y + radius);
          const opacity = 0.2 + ((y + radius) / (2 * radius)) * 0.8;
          const scale = 0.9 + ((y + radius) / (2 * radius)) * 0.3;
          const isSelected = activeIndex === i;

          return (
            <motion.button
              key={i}
              initial={false}
              animate={{ 
                x: x,
                y: y, // Pure flat 2D circle
                scale: scale,
                opacity: opacity,
              }}
              style={{ zIndex }}
              whileHover={{ scale: 1.3, opacity: 1, zIndex: 1000 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onFileSelect(file)}
              className={cn(
                "absolute w-10 h-10 rounded-full esoteric-glass flex items-center justify-center transition-all duration-300",
                isSelected ? "border-black/60 text-black shadow-[0_0_30px_rgba(0,0,0,0.15)] scale-110" : 
                hovered === i ? "border-black/40 text-black" : "text-black/30 border-black/5"
              )}
            >
              {file.type === 'pdf' ? <FileIcon size={20} /> : file.type === 'app' ? <Cpu size={20} className="animate-pulse" /> : <FileText size={20} />}
              
              <AnimatePresence>
                {hovered === i && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap esoteric-glass px-3 py-1 rounded-full text-[9px] font-mono tracking-widest text-black/50 border border-black/10 z-[1001]"
                  >
                    ◊.{file.name.toUpperCase().replace(/\s/g, '_')}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Connection Rings - Monochrome - Flat 2D */}
      <div className="absolute w-[520px] h-[520px] rounded-full border border-black/5 pointer-events-none" />
      <div className="absolute w-[560px] h-[560px] rounded-full border border-black/5 pointer-events-none" />
    </div>
  );
}
