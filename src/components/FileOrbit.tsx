"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
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
  const rotationRaw = useMotionValue(0);
  const rotationSmooth = useSpring(rotationRaw, { stiffness: 60, damping: 20 });
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync active index with smooth rotation
  // Selection logic: Bottommost icon = (Latest rotation + item index angle) % 2PI should be close to PI/2
  useEffect(() => {
    return rotationSmooth.on("change", (latest) => {
      const total = FILES.length;
      const angleOffset = (latest * Math.PI) / 180;
      let maxYa = -Infinity;
      let bestIdx = 0;

      FILES.forEach((_, i) => {
        // We want to find which item is currently at the "bottom" (Y is max)
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
    });
  }, [rotationSmooth, activeIndex]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // User requested: Scroll Up -> Rotate Right (Clockwise/Positive), Scroll Down -> Rotate Left (Counter-Clockwise/Negative)
      // Standard wheel delta: Up is negative, Down is positive.
      const direction = e.deltaY < 0 ? 1 : -1;
      rotationRaw.set(rotationRaw.get() + direction * 15); 
    };

    let touchY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaY = touchY - e.touches[0].clientY;
      rotationRaw.set(rotationRaw.get() + (deltaY > 0 ? -10 : 10));
      touchY = e.touches[0].clientY;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: true });
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: true });
    }
    
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[700px] flex items-center justify-center cursor-ns-resize"
    >
      {/* Central Hub */}
      <div className="absolute w-48 h-48 flex items-center justify-center z-10 pointer-events-none">
        <div className="w-full h-full relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-black/[0.03] [box-shadow:0_0_80px_rgba(0,0,0,0.01)]" />
          
          <div className="z-20 text-center flex flex-col items-center justify-center pointer-events-auto">
             <motion.button
               whileHover={{ scale: 1.1 }}
               whileTap={{ scale: 0.9 }}
               onClick={(e) => {
                 e.stopPropagation();
                 onActivate();
               }}
               className="w-16 h-16 esoteric-glass rounded-full flex items-center justify-center text-black/60 hover:text-black transition-all shadow-[0_0_40px_rgba(0,0,0,0.05)] border border-black/10"
             >
               <LayoutGrid size={28} />
             </motion.button>
             
             <div className="mt-6 absolute top-24 flex flex-col items-center">
                <div className="w-px h-10 bg-black/10" />
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs tracking-[0.5em] font-bold text-black uppercase mt-3 whitespace-nowrap"
                >
                  ◊.{FILES[activeIndex].name.toUpperCase().replace(/\s/g, '_')}
                </motion.div>
             </div>
          </div>
        </div>
      </div>

      {/* The Wheel */}
      <div className="relative w-full h-full flex items-center justify-center">
        {FILES.map((file, i) => (
          <OrbitItem 
            key={i}
            index={i}
            total={FILES.length}
            file={file}
            rotation={rotationSmooth}
            activeIndex={activeIndex}
            onSelect={onFileSelect}
            hovered={hovered}
            setHovered={setHovered}
          />
        ))}
      </div>

      {/* Visual Connection Rings */}
      <div className="absolute w-[520px] h-[520px] rounded-full border border-black/[0.03] pointer-events-none" />
      <div className="absolute w-[540px] h-[540px] rounded-full border border-black/[0.05] pointer-events-none" />
    </div>
  );
}

function OrbitItem({ 
  index, total, file, rotation, activeIndex, onSelect, hovered, setHovered 
}: { 
  index: number, total: number, file: NullFile, rotation: any, activeIndex: number, 
  onSelect: (file: NullFile) => void, hovered: number | null, setHovered: (idx: number | null) => void 
}) {
  const isSelected = activeIndex === index;
  const radius = 260; // Locked Radius
  
  // Precise Radial Mapping using a SHARED rotation spring
  const x = useTransform(rotation, (rot: number) => {
    const angle = (index * 2 * Math.PI) / total + (rot * Math.PI) / 180;
    return radius * Math.cos(angle);
  });

  const y = useTransform(rotation, (rot: number) => {
    const angle = (index * 2 * Math.PI) / total + (rot * Math.PI) / 180;
    return radius * Math.sin(angle);
  });

  return (
    <motion.button
      style={{ x, y, zIndex: isSelected || hovered === index ? 100 : 10 }}
      animate={{ 
        scale: isSelected ? 1.25 : (hovered === index ? 1.4 : 1),
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      onClick={() => onSelect(file)}
      className={cn(
        "absolute w-12 h-12 rounded-full esoteric-glass flex items-center justify-center transition-all duration-300",
        isSelected ? "border-black/60 text-black shadow-[0_0_30px_rgba(0,0,0,0.1)] ring-1 ring-black/10" : 
        "text-black/30 border-black/5"
      )}
    >
      {file.type === 'pdf' ? <FileIcon size={22} /> : file.type === 'app' ? <Cpu size={22} className="animate-pulse" /> : <FileText size={22} />}
      
      <AnimatePresence>
        {(hovered === index || isSelected) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap esoteric-glass px-4 py-1.5 rounded-full text-[9px] font-mono tracking-widest text-black shadow-sm border border-black/10 z-[1001]"
          >
            ◊.{file.name.toUpperCase().replace(/\s/g, '_')}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
