"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GripHorizontal, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

interface DraggableWindowProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function DraggableWindow({ title, isOpen, onClose, children }: DraggableWindowProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          style={{ position: 'fixed', zIndex: 100 }}
          className="bottom-24 right-8 w-80 md:w-96 shadow-2xl"
        >
          <div className="esoteric-glass rounded-2xl overflow-hidden border border-black/20 flex flex-col max-h-[700px]">
            {/* Header / Drag Handle */}
            <div className="bg-black/5 px-4 py-2 flex items-center justify-between cursor-move border-b border-black/5">
              <div className="flex items-center gap-3">
                <GripHorizontal className="text-black/20" size={14} />
                <span className="text-[9px] uppercase tracking-[0.3em] font-light text-black/60">{title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-black/10 rounded-lg transition-colors text-black/40 hover:text-black"
                >
                  {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                </button>
                <button 
                  onClick={onClose}
                  className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors text-black/40"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Content */}
            <motion.div 
              animate={{ height: isMinimized ? 0 : 'auto', opacity: isMinimized ? 0 : 1 }}
              className="overflow-y-auto custom-scrollbar"
            >
              <div className="p-5 text-sm leading-relaxed text-foreground/80">
                {children}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
