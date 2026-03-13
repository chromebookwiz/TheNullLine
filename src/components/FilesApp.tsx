"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, FolderOpen, ChevronRight, ArrowLeft } from 'lucide-react';
import type { NullFile } from './FileOrbit';
import { NOLLTECH_WRITINGS } from './nolltechWritings';

const ROOT: NullFile[] = [
  { name: "NollTech", type: "folder", path: "/nolltech", children: NOLLTECH_WRITINGS },
];

export default function FilesApp({ onOpenFile }: { onOpenFile: (file: NullFile) => void }) {
  const [currentFolder, setCurrentFolder] = useState<NullFile | null>(null);

  const items = currentFolder?.children ?? ROOT;

  return (
    <div className="w-full h-full flex flex-col bg-white font-mono select-none">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/5 bg-black/[0.01]">
        {currentFolder ? (
          <button
            onClick={() => setCurrentFolder(null)}
            className="flex items-center gap-2 text-black/40 hover:text-black text-[10px] tracking-[0.3em] uppercase font-bold transition-colors"
          >
            <ArrowLeft size={12} />
            Root
          </button>
        ) : null}
        <span className="text-[10px] tracking-[0.4em] text-black/25 font-bold uppercase">
          ◊.FILES{currentFolder ? ` / ${currentFolder.name}` : ''}
        </span>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFolder?.path ?? 'root'}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
            className="space-y-1"
          >
            {items.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  if (item.type === 'folder') {
                    setCurrentFolder(item);
                  } else {
                    onOpenFile(item);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-black/[0.04] transition-colors group text-left"
              >
                <span className="text-black/30 group-hover:text-black/60 transition-colors">
                  {item.type === 'folder'
                    ? <FolderOpen size={16} strokeWidth={1.5} />
                    : <FileText size={16} strokeWidth={1.5} />}
                </span>
                <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-black/60 group-hover:text-black transition-colors flex-1">
                  {item.name}
                </span>
                {item.type === 'folder' && (
                  <ChevronRight size={12} className="text-black/20 group-hover:text-black/40 transition-colors" />
                )}
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
