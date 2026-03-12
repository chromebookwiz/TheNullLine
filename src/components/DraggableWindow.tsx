"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Minimize2, Maximize2, GripHorizontal } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DraggableWindowProps {
  children: React.ReactNode;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
  onPointerDown?: () => void;
}

const DraggableWindow = React.memo(function DraggableWindow({ 
  children, 
  title, 
  onClose, 
  className, 
  style, 
  onPointerDown 
}: DraggableWindowProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const dragControls = useDragControls();

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={style}
        onPointerDown={onPointerDown}
        className={cn(
          "bottom-24 right-8 shadow-2xl transition-shadow duration-300 will-change-transform transform-gpu pointer-events-auto touch-action-none select-none",
          className || "w-80 md:w-96"
        )}
      >
        <div className={cn("esoteric-glass rounded-2xl overflow-hidden border border-black/20 flex flex-col h-full", !className && "max-h-[700px]")}>
          {/* Header / Drag Handle */}
          <div 
            onPointerDown={(e) => dragControls.start(e)}
            className="bg-black/5 px-4 py-2 flex items-center justify-between cursor-move border-b border-black/5 shrink-0 active:bg-black/10 transition-colors"
          >
            <div className="flex items-center gap-3 pointer-events-none">
              <GripHorizontal className="text-black/20" size={14} />
              <span className="text-[9px] uppercase tracking-[0.3em] font-light text-black/60">{title}</span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                className="p-1.5 hover:bg-black/10 rounded-lg transition-colors text-black/40 hover:text-black"
              >
                {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
              </button>
              <button 
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors text-black/40"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Content */}
          <motion.div 
            animate={{ height: isMinimized ? 0 : (className?.includes('h-') ? '100%' : 'auto'), opacity: isMinimized ? 0 : 1 }}
            className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-white"
          >
            <div className="p-0 text-sm leading-relaxed text-black/80 h-full">
              {children}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
});

DraggableWindow.displayName = 'DraggableWindow';

export default DraggableWindow;
