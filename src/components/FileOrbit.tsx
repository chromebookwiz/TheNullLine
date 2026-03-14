"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { FileText, File as FileIcon, ChevronRight, Cpu, LayoutGrid } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { NOLLTECH_WRITINGS } from './nolltechWritings';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type FileType = 'txt' | 'docx' | 'pdf' | 'app' | 'folder';

export interface NullFile {
  name: string;
  type: FileType;
  path: string;
  children?: NullFile[];
}

const FILES: NullFile[] = [
  { name: "Files", type: "app", path: "app://files", children: [
    { name: "NollTech", type: "folder", path: "/nolltech", children: NOLLTECH_WRITINGS },
  ] },
  { name: "Clicker", type: "app", path: "app://clicker" },
  { name: "Null Billiard Computer", type: "app", path: "app://simulation" },
  { name: "NullForge", type: "app", path: "app://forge" },
  { name: "NullDeck", type: "app", path: "app://deck" },
  { name: "NullHover", type: "app", path: "app://hover" },
  { name: "Showcase", type: "app", path: "app://promo" },
  { name: "Community", type: "app", path: "app://community" },
];

const normalizeIndex = (index: number, total: number) => {
  if (total === 0) {
    return 0;
  }

  return ((index % total) + total) % total;
};

const getClosestWrappedIndex = (currentIndex: number, targetIndex: number, total: number) => {
  if (total === 0) {
    return 0;
  }

  const normalizedTarget = normalizeIndex(targetIndex, total);
  const cycleBase = Math.floor(currentIndex / total) * total;
  const candidates = [
    cycleBase + normalizedTarget - total,
    cycleBase + normalizedTarget,
    cycleBase + normalizedTarget + total,
  ];

  return candidates.reduce((closest, candidate) => {
    if (Math.abs(candidate - currentIndex) < Math.abs(closest - currentIndex)) {
      return candidate;
    }

    return closest;
  }, candidates[0]);
};


const FileOrbitComponent = ({ 
  onFileSelect, 
}: { 
  onFileSelect: (file: NullFile) => void,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentFolder, setCurrentFolder] = useState<NullFile | null>(null);
  const [wheelSize, setWheelSize] = useState(520);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelCooldownRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const touchYRef = useRef<number | null>(null);

  // Determine which files to show (root or folder)
  const files = currentFolder?.children || FILES;
  const total = files.length;
  const activeIndex = normalizeIndex(selectedIndex, total);
  const activeFile = files[activeIndex];
  const radius = wheelSize / 2;

  const itemPositions = useMemo(
    () => files.map((file, i) => {
      const itemAngle = (i * 360) / total;

      return {
        file,
        index: i,
        left: radius * Math.cos((itemAngle * Math.PI) / 180),
        top: radius * Math.sin((itemAngle * Math.PI) / 180),
      };
    }),
    [files, radius, total]
  );

  // Motion Values for the rotation
  const rotationRaw = useMotionValue(90); // 90 is the bottom
  // Very stiff spring = near-instant gyroscope response, slight smoothing for scroll/touch
  const rotationSmooth = useSpring(rotationRaw, { stiffness: 800, damping: 40, mass: 0.5 });

  useEffect(() => {
    const angle = total > 0 ? (selectedIndex * 360) / total : 0;
    rotationRaw.set(90 - angle);
  }, [selectedIndex, total, rotationRaw]);

  useEffect(() => {
    const updateWheelSize = () => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const { width, height } = container.getBoundingClientRect();
      const nextSize = Math.max(300, Math.min(520, Math.min(width * 0.82, height * 0.82)));
      setWheelSize(Math.round(nextSize));
    };

    updateWheelSize();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWheelSize);
      return () => window.removeEventListener('resize', updateWheelSize);
    }

    const observer = new ResizeObserver(updateWheelSize);
    observer.observe(container);
    window.addEventListener('resize', updateWheelSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWheelSize);
    };
  }, []);

  const stepSelection = useCallback((delta: number) => {
    if (total === 0) {
      return;
    }

    setSelectedIndex((prev) => prev + delta);
  }, [total]);

  const activateFile = useCallback((file: NullFile) => {
    if (file.type === 'folder') {
      setCurrentFolder(file);
      setSelectedIndex(0);
      setHovered(null);
      return;
    }

    onFileSelect(file);
  }, [onFileSelect]);

  const goBack = useCallback(() => {
    setCurrentFolder(null);
    setSelectedIndex(0);
    setHovered(null);
  }, []);

  const queueStep = useCallback((delta: number) => {
    if (wheelCooldownRef.current !== null) {
      return;
    }

    stepSelection(delta);
    wheelCooldownRef.current = window.setTimeout(() => {
      wheelCooldownRef.current = null;
    }, 120);
  }, [stepSelection]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelDeltaRef.current += e.deltaY;

      if (Math.abs(wheelDeltaRef.current) >= 24) {
        queueStep(wheelDeltaRef.current > 0 ? 1 : -1);
        wheelDeltaRef.current = 0;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchYRef.current = e.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchYRef.current === null) {
        return;
      }

      const currentY = e.touches[0]?.clientY;
      if (typeof currentY !== 'number') {
        return;
      }

      const deltaY = touchYRef.current - currentY;
      if (Math.abs(deltaY) > 30) {
        e.preventDefault();
        queueStep(deltaY > 0 ? 1 : -1);
        touchYRef.current = currentY;
      }
    };

    const handleTouchEnd = () => {
      touchYRef.current = null;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
      container.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    }
    
    return () => {
      if (wheelCooldownRef.current !== null) {
        window.clearTimeout(wheelCooldownRef.current);
      }

      if (container) {
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
      }
    };
  }, [queueStep]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      stepSelection(1);
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      stepSelection(-1);
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      setSelectedIndex((prev) => getClosestWrappedIndex(prev, 0, total));
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      setSelectedIndex((prev) => getClosestWrappedIndex(prev, Math.max(total - 1, 0), total));
      return;
    }

    if ((e.key === 'Enter' || e.key === ' ') && activeFile) {
      e.preventDefault();
      activateFile(activeFile);
      return;
    }

    if (e.key === 'Escape' && currentFolder) {
      e.preventDefault();
      goBack();
    }
  }, [activeFile, activateFile, currentFolder, goBack, stepSelection, total]);

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Orbital file selector"
      className="relative flex h-[clamp(420px,78vh,700px)] w-full items-center justify-center overflow-hidden outline-none"
      style={{ isolation: 'isolate' }}
    >
      {/* Central Hub - Always on top of the wheel but below windows */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
        <div className="relative flex flex-col items-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              if (activeFile) {
                activateFile(activeFile);
              }
            }}
            className="w-24 h-24 bg-[#FAF9F6]/90 backdrop-blur-xl rounded-full flex items-center justify-center text-black/60 hover:text-black transition-all shadow-[0_0_50px_rgba(0,0,0,0.1)] border border-black/10 pointer-events-auto group"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFile?.type + activeFile?.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                {activeFile?.type === 'app' ? (
                  <LayoutGrid size={36} strokeWidth={1} className="group-hover:rotate-90 transition-transform duration-500" />
                ) : activeFile?.type === 'pdf' ? (
                  <FileIcon size={36} strokeWidth={1} />
                ) : activeFile?.type === 'folder' ? (
                  <ChevronRight size={36} strokeWidth={1} />
                ) : (
                  <FileText size={36} strokeWidth={1} />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.button>
          {/* Folder navigation bar */}
          {currentFolder && (
            <button
              className="absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/10 text-black/60 text-[10px] rounded-full border border-black/10 shadow"
              onClick={goBack}
            >
              ← Back
            </button>
          )}
          <div className="absolute top-[120px] flex flex-col items-center w-[min(82vw,400px)]">
            <div className="w-px h-16 bg-gradient-to-b from-black/20 to-transparent" />
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mt-6 max-w-full px-5 py-3 bg-[#FAF9F6]/95 backdrop-blur-md rounded-full border border-black/5 shadow-xl"
            >
              <span className="block max-w-full truncate text-center text-[12px] md:text-[14px] font-bold tracking-[0.35em] md:tracking-[0.5em] uppercase text-black">
                ◊.{activeFile?.name.toUpperCase().replace(/\s/g, '_')}
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* The Wheel - Container Rotation Strategy */}
      <motion.div 
        style={{ rotate: rotationSmooth }}
        className="relative rounded-full border border-black/[0.03] flex items-center justify-center pointer-events-none will-change-transform transform-gpu"
        aria-activedescendant={activeFile?.path}
        role="listbox"
        aria-label="Project content wheel"
        tabIndex={-1}
        transition={{ type: 'spring', stiffness: 700, damping: 42, mass: 0.55 }}
        animate={{ width: wheelSize, height: wheelSize }}
      >
        {itemPositions.map(({ file, index, left, top }) => {
          return (
            <motion.div
              key={file.path}
              className="absolute flex items-center justify-center"
              style={{
                width: 50,
                height: 50,
                left: `calc(50% + ${left}px - 25px)`,
                top: `calc(50% + ${top}px - 25px)`,
              }}
            >
              <OrbitItem 
                file={file}
                isSelected={activeIndex === index}
                isHovered={hovered === index}
                onSelect={() => {
                  if (activeIndex !== index) {
                    setSelectedIndex((prev) => getClosestWrappedIndex(prev, index, total));
                    return;
                  }

                  activateFile(file);
                }}
                onHoverChange={(h) => setHovered(h ? index : null)}
                parentRotation={rotationSmooth}
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Decorative Rings - Under the wheel */}
      <div className="absolute rounded-full border border-black/[0.02] -z-10" style={{ width: wheelSize, height: wheelSize }} />
      <div className="absolute rounded-full border border-black/[0.01] -z-10" style={{ width: wheelSize + 10, height: wheelSize + 10 }} />
    </div>
  );
};

function OrbitItem({ 
  file, isSelected, isHovered, onSelect, onHoverChange, parentRotation 
}: { 
  file: NullFile, isSelected: boolean, isHovered: boolean, onSelect: () => void, 
  onHoverChange: (h: boolean) => void, parentRotation: MotionValue<number> 
}) {
  const counterRotate = useTransform(parentRotation, (r: number) => -r);

  return (
    <motion.button
      id={file.path}
      style={{ rotate: counterRotate }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      aria-label={file.name}
      aria-pressed={isSelected}
      className={cn(
        "w-14 h-14 rounded-full esoteric-glass flex items-center justify-center pointer-events-auto transition-all duration-300",
        isSelected ? "border-black/60 text-black shadow-[0_0_30px_rgba(0,0,0,0.15)] scale-125 z-50 bg-white" : 
        isHovered ? "border-black/30 text-black scale-115 shadow-xl z-40 bg-white/50" : 
        "text-black/10 border-black/5"
      )}
    >
      {file.type === 'pdf' ? <FileIcon size={24} strokeWidth={1.5} /> : file.type === 'app' ? <Cpu size={24} strokeWidth={1.5} className="animate-pulse" /> : <FileText size={24} strokeWidth={1.5} />}
      
      <AnimatePresence>
        {(isHovered || isSelected) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white px-4 py-1.5 rounded-full text-[9px] font-bold tracking-[0.3em] uppercase z-[110] shadow-2xl pointer-events-none"
          >
            {file.name}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

const FileOrbit = React.memo(FileOrbitComponent);
FileOrbit.displayName = 'FileOrbit';

export default FileOrbit;
