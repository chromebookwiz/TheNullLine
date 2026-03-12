"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { FileText, File as FileIcon, ChevronRight, X, Info, Cpu, LayoutGrid } from 'lucide-react';
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

const DOCUMENTS: NullFile[] = [
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
];


const FILES: NullFile[] = [
  { name: "Files", type: "app", path: "app://files", children: [
    { name: "NollTech", type: "folder", path: "/nolltech", children: NOLLTECH_WRITINGS },
  ] },
  { name: "Clicker", type: "app", path: "app://clicker" },
  { name: "Simulation", type: "app", path: "app://simulation" },
];


const FileOrbitComponent = ({ 
  onFileSelect, 
  onActivate 
}: { 
  onFileSelect: (file: NullFile) => void,
  onActivate: () => void
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState(0);
  const [currentFolder, setCurrentFolder] = useState<NullFile | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine which files to show (root or folder)
  const files = currentFolder?.children || FILES;
  const total = files.length;

  // Motion Values for the rotation
  const rotationRaw = useMotionValue(90); // 90 is the bottom
  const rotationSmooth = useSpring(rotationRaw, { stiffness: 40, damping: 12, mass: 0.8 });

  // Gyroscope/DeviceOrientation real-time support
  useEffect(() => {
    let lastGyro = 90;
    let gyroActive = false;
    function handleOrientation(event: DeviceOrientationEvent) {
      // Use gamma (left-right tilt) or alpha (compass heading)
      // We'll use gamma for left-right, fallback to alpha if not available
      let angle = 90;
      if (typeof event.gamma === 'number') {
        // gamma is -90 (left) to 90 (right)
        angle = 90 - event.gamma;
      } else if (typeof event.alpha === 'number') {
        // alpha is 0-360 compass
        angle = 90 - (event.alpha % 360);
      }
      lastGyro = angle;
      rotationRaw.set(angle);
    }
    // Try to enable gyroscope if available
    if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+
      window.DeviceOrientationEvent.requestPermission().then((response) => {
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
          gyroActive = true;
        }
      }).catch(() => {});
    } else if (window.DeviceOrientationEvent) {
      // Most browsers
      window.addEventListener('deviceorientation', handleOrientation, true);
      gyroActive = true;
    }
    return () => {
      if (gyroActive) {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, [rotationRaw]);
  
  // The active index is targetIndex normalized
  const activeIndex = ((targetIndex % total) + total) % total;

  useEffect(() => {
    // To make targetIndex bottom: rotation = 90 - (targetIndex * 360 / total)
    const angle = (targetIndex * 360) / total;
    rotationRaw.set(90 - angle);
  }, [targetIndex, total, rotationRaw]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        setTargetIndex(prev => prev - 1);
      } else {
        setTargetIndex(prev => prev + 1);
      }
    };

    let touchY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaY = touchY - e.touches[0].clientY;
      if (Math.abs(deltaY) > 30) {
        setTargetIndex(prev => prev + (deltaY > 0 ? 1 : -1));
        touchY = e.touches[0].clientY;
      }
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
      className="relative w-full h-[700px] flex items-center justify-center overflow-hidden"
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
              const selected = files[activeIndex];
              if (selected.type === 'folder') {
                setCurrentFolder(selected);
                setTargetIndex(0);
              } else {
                onFileSelect(selected);
              }
            }}
            className="w-24 h-24 bg-[#FAF9F6]/90 backdrop-blur-xl rounded-full flex items-center justify-center text-black/60 hover:text-black transition-all shadow-[0_0_50px_rgba(0,0,0,0.1)] border border-black/10 pointer-events-auto group"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={files[activeIndex].type + files[activeIndex].name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                {files[activeIndex].type === 'app' ? (
                  <LayoutGrid size={36} strokeWidth={1} className="group-hover:rotate-90 transition-transform duration-500" />
                ) : files[activeIndex].type === 'pdf' ? (
                  <FileIcon size={36} strokeWidth={1} />
                ) : files[activeIndex].type === 'folder' ? (
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
              onClick={() => { setCurrentFolder(null); setTargetIndex(0); }}
            >
              ← Back
            </button>
          )}
          <div className="absolute top-[120px] flex flex-col items-center w-[400px]">
            <div className="w-px h-16 bg-gradient-to-b from-black/20 to-transparent" />
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mt-6 px-8 py-3 bg-[#FAF9F6]/95 backdrop-blur-md rounded-full border border-black/5 shadow-xl"
            >
              <span className="text-[14px] font-bold tracking-[0.5em] uppercase text-black">
                ◊.{files[activeIndex].name.toUpperCase().replace(/\s/g, '_')}
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* The Wheel - Container Rotation Strategy */}
      <motion.div 
        style={{ rotate: rotationSmooth }}
        className="relative w-[520px] h-[520px] rounded-full border border-black/[0.03] flex items-center justify-center pointer-events-none will-change-transform transform-gpu"
      >
        {files.map((file, i) => {
          const itemAngle = (i * 360) / total;
          const radius = 260;
          return (
            <motion.div
              key={file.path}
              className="absolute flex items-center justify-center"
              style={{
                width: 50,
                height: 50,
                left: `calc(50% + ${radius * Math.cos((itemAngle * Math.PI) / 180)}px - 25px)`,
                top: `calc(50% + ${radius * Math.sin((itemAngle * Math.PI) / 180)}px - 25px)`,
              }}
            >
              <OrbitItem 
                file={file}
                isSelected={activeIndex === i}
                isHovered={hovered === i}
                onSelect={() => {
                  if (file.type === 'folder') {
                    setCurrentFolder(file);
                    setTargetIndex(0);
                  } else {
                    onFileSelect(file);
                  }
                }}
                onHoverChange={(h) => setHovered(h ? i : null)}
                parentRotation={rotationSmooth}
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Decorative Rings - Under the wheel */}
      <div className="absolute w-[520px] h-[520px] rounded-full border border-black/[0.02] -z-10" />
      <div className="absolute w-[530px] h-[530px] rounded-full border border-black/[0.01] -z-10" />
    </div>
  );
};

function OrbitItem({ 
  file, isSelected, isHovered, onSelect, onHoverChange, parentRotation 
}: { 
  file: NullFile, isSelected: boolean, isHovered: boolean, onSelect: () => void, 
  onHoverChange: (h: boolean) => void, parentRotation: any 
}) {
  const counterRotate = useTransform(parentRotation, (r: number) => -r);

  return (
    <motion.button
      style={{ rotate: counterRotate }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
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
