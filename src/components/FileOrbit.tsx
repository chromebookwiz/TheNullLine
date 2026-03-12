"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { FileText, File as FileIcon, ChevronRight, X, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dynamic from 'next/dynamic';

const PhotonicChip = dynamic(() => import('./three/PhotonicChip'), { 
  ssr: false,
  loading: () => <div className="w-40 h-40 rounded-full glass animate-pulse" />
});

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NullFile {
  name: string;
  type: 'txt' | 'docx' | 'pdf';
  path: string;
}

const FILES: NullFile[] = [
  ...Array(2).fill(null), // Empty space for better UX top
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

export default function FileOrbit({ onFileSelect }: { onFileSelect: (file: NullFile) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setRotation(prev => prev + e.deltaY * 0.1);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[600px] flex items-center justify-center cursor-ns-resize"
    >
      {/* Central Hub with 3D Model */}
      <div className="absolute w-[400px] h-[400px] flex items-center justify-center z-10 pointer-events-none">
        <div className="w-full h-full relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <PhotonicChip />
          </div>
          
          {/* Text Overlay for Hub */}
          <div className="z-20 text-center pointer-events-none mb-8">
            <div className="text-accent font-bold text-3xl tracking-[0.2em] [text-shadow:0_0_20px_rgba(125,65,255,0.8)]">k · k = 0</div>
            <div className="text-[10px] uppercase tracking-[0.5em] opacity-50 mt-2 font-light">Photonic Core</div>
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
          const opacity = Math.max(0.1, (y + radius) / (2 * radius));
          const scale = 0.8 + (y + radius) / (2 * radius) * 0.4;

          return (
            <motion.button
              key={i}
              initial={false}
              animate={{ 
                x: x,
                y: y * 0.4, // Elliptical orbit for better perspective
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
                "absolute w-12 h-12 rounded-full glass flex items-center justify-center transition-colors duration-300",
                hovered === i ? "border-accent text-accent bg-accent/10" : "text-foreground/60"
              )}
            >
              {file.type === 'pdf' ? <FileIcon size={20} /> : <FileText size={20} />}
              
              <AnimatePresence>
                {hovered === i && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap glass px-4 py-1.5 rounded-full text-xs font-semibold border border-accent/30 shadow-2xl z-[1001]"
                  >
                    {file.name}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Connection Rings */}
      <div className="absolute w-[520px] h-[220px] rounded-full border border-accent/10 pointer-events-none rotate-x-60" style={{ transform: 'rotateX(75deg)' }} />
      <div className="absolute w-[560px] h-[240px] rounded-full border border-white/5 pointer-events-none" style={{ transform: 'rotateX(75deg)' }} />
      
      {/* CC License Footer */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-widest opacity-30 whitespace-nowrap">
        Licensed under <span className="text-accent underline">CC BY 4.0</span>
      </div>
    </div>
  );
}
