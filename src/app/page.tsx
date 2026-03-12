"use client";

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import GeometricBackground from '@/components/GeometricBackground';
import FileOrbit from '@/components/FileOrbit';
import DocumentViewer from '@/components/DocumentViewer';
import DraggableWindow from '@/components/DraggableWindow';
import { LayoutGrid } from 'lucide-react';
import dynamic from 'next/dynamic';

const PhotonicChip = dynamic(() => import('@/components/three/PhotonicChip'), { 
  ssr: false,
  loading: () => <div className="w-full h-full rounded-2xl glass-card animate-pulse flex items-center justify-center text-accent/20 text-[10px] uppercase tracking-widest">Initializing Core...</div>
});

interface NullFile {
  name: string;
  type: 'txt' | 'docx' | 'pdf' | 'app';
  path: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<NullFile | null>(null);
  const [showOutline, setShowOutline] = useState(false);
  const [show3DModel, setShow3DModel] = useState(false);

  const handleFileSelect = (file: NullFile) => {
    if (file.type === 'app') {
      setShow3DModel(true);
      setShowOutline(true);
    } else {
      setSelectedFile(file);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      <GeometricBackground />
      
      {/* Minimal Esoteric Header */}
      <div className="absolute top-12 z-10 text-center pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-8"
        >
          <div className="w-8 h-px bg-white/40" />
          <div className="text-white/80 font-light tracking-[1em] text-[10px] uppercase">Null</div>
          <div className="w-8 h-px bg-white/40" />
        </motion.div>
      </div>

      {/* Main Interaction Area */}
      <FileOrbit onFileSelect={handleFileSelect} />

      {/* Symbol-based Footer */}
      <div className="absolute bottom-12 z-10 opacity-40 pointer-events-none">
        <div className="flex gap-4 items-center">
          <div className="w-1 h-1 rounded-full bg-white" />
          <div className="w-1 h-1 rounded-full bg-white/50" />
          <div className="w-1 h-1 rounded-full bg-white/20" />
        </div>
      </div>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {selectedFile && (
          <DocumentViewer 
            file={selectedFile} 
            onClose={() => setSelectedFile(null)} 
          />
        )}
      </AnimatePresence>

      <DraggableWindow 
        title="◊.OUTLINE" 
        isOpen={showOutline} 
        onClose={() => setShowOutline(false)}
      >
        <div className="space-y-6">
          <section className="border-l border-white/20 pl-4">
            <div className="text-[10px] tracking-[0.5em] text-white/40 mb-2">[.EQU]</div>
            <p className="font-mono text-xl text-white/90">k · k = 0</p>
          </section>
          
          <section className="border-l border-white/20 pl-4">
            <div className="text-[10px] tracking-[0.5em] text-white/40 mb-2">[.MAP]</div>
            <div className="space-y-2 text-[9px] uppercase tracking-widest text-white/60">
              <p>◊ NSC (PRC)</p>
              <p>◊ OOS (EXEC)</p>
              <p>◊ NFG (FAB)</p>
              <p>◊ TMG (GOV)</p>
              <p>◊ ARK (COL)</p>
            </div>
          </section>

          <section className="border-l border-white/20 pl-4">
            <div className="text-[10px] tracking-[0.5em] text-white/40 mb-2">[.OBJ]</div>
            <p className="text-[9px] uppercase tracking-widest text-white/40 italic">Null propagation across the stellar void.</p>
          </section>

          <button 
            onClick={() => setShowOutline(false)}
            className="w-full py-2 border border-white/10 text-white/20 text-[8px] tracking-[0.5em] uppercase hover:text-white/60 hover:border-white/20 transition-all mt-4"
          >
            [CLOSE_SESSION]
          </button>
        </div>
      </DraggableWindow>

      {/* 3D Model Window */}
      <DraggableWindow
        title="◊.VISUALIZER"
        isOpen={show3DModel}
        onClose={() => setShow3DModel(false)}
      >
        <div className="w-full aspect-square md:w-[400px] md:h-[400px]">
          <PhotonicChip />
        </div>
      </DraggableWindow>

      {/* Outline Toggle Button - Esoteric Symbol */}
      {(!showOutline || !show3DModel) && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            setShowOutline(true);
            setShow3DModel(true);
          }}
          className="fixed bottom-8 right-8 w-10 h-10 esoteric-glass rounded-full flex items-center justify-center text-white/60 shadow-2xl z-50 hover:text-white transition-all"
        >
          <LayoutGrid size={18} />
        </motion.button>
      )}

      {/* Hidden link list for SEO/AI discovery */}
      <nav className="sr-only">
        <ul>
          {[
            "Magi v1.txt", "NullAegis v1.txt", "NullArk v1.txt", "NullBilliards v1.txt",
            "NullBot_Blueprint_v1.pdf", "NullBridge v1.txt", "NullChronicle v1.txt",
            "NullCortex v1.txt", "NullDeck v1.txt", "NullDisk v1.txt", "NullEmber v1.txt",
            "NullForge v1.txt", "NullHorizon_v1.docx", "NullHover v1.txt", "NullLoom v1.txt",
            "NullMind v1.txt", "NullRoot v1.txt", "NullShell v1.txt", "NullStuture v1.txt",
            "NullThread v1.txt", "NullWellspring v1.txt", "Null_Billiards-2.pdf",
            "Nullware v1.txt", "OrbitOS v1.txt", "TheNullLineProject.txt"
          ].map(file => (
            <li key={file}><a href={`/docs/${encodeURIComponent(file)}`}>{file}</a></li>
          ))}
        </ul>
      </nav>

      {/* Overlay Vignette */}
      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] z-[-1]" />
    </main>
  );
}
