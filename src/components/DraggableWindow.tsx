"use client";

import React, { useState, createContext } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, Minimize2, Maximize2, GripHorizontal } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Consumed by animated child apps (Three.js canvases, rAF loops) to pause
 * rendering when the containing window is minimized.  True = suspended.
 */
export const WindowSuspendedContext = createContext(false);

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
        style={{
          ...style,
          // Inline style always overrides Tailwind classes — collapses the h-[*]
          // height when minimized so the window shrinks to just the title bar.
          ...(isMinimized ? { height: 'auto' } : {}),
        }}
        onPointerDown={onPointerDown}
        className={cn(
          "bottom-24 right-8 shadow-2xl transition-shadow duration-300 will-change-transform transform-gpu pointer-events-auto touch-action-none select-none",
          className || "w-80 md:w-96"
        )}
      >
        <div className={cn(
          "esoteric-glass rounded-2xl overflow-hidden border border-black/20 flex flex-col",
          !isMinimized && (className ? "h-full" : "max-h-[700px]"),
        )}>
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
                onClick={(e) => { e.stopPropagation(); setIsMinimized(v => !v); }}
                className="p-1.5 hover:bg-black/10 rounded-lg transition-colors text-black/40 hover:text-black"
                title={isMinimized ? 'Restore' : 'Minimize'}
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

          {/* Content — hidden via display:none but NOT unmounted so app state is
              preserved.  Child apps consume WindowSuspendedContext to halt their
              render / animation loops while the window is minimised. */}
          <WindowSuspendedContext.Provider value={isMinimized}>
            <div
              style={{
                display: isMinimized ? 'none' : 'flex',
                flex: 1,
                minHeight: 0,
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-white h-full">
                <div className="text-sm leading-relaxed text-black/80 h-full">
                  {children}
                </div>
              </div>
            </div>
          </WindowSuspendedContext.Provider>
        </div>
      </motion.div>
    </div>
  );
});

DraggableWindow.displayName = 'DraggableWindow';

export default DraggableWindow;
