"use client";

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import GeometricBackground from '@/components/GeometricBackground';
import FileOrbit from '@/components/FileOrbit';
import DocumentViewer from '@/components/DocumentViewer';
import DraggableWindow from '@/components/DraggableWindow';
import { LayoutGrid } from 'lucide-react';

interface NullFile {
  name: string;
  type: 'txt' | 'docx' | 'pdf';
  path: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<NullFile | null>(null);
  const [showOutline, setShowOutline] = useState(true);

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      <GeometricBackground />
      
      {/* Hero Section */}
      <div className="absolute top-12 md:top-20 z-10 text-center space-y-2 pointer-events-none">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-bold tracking-tighter"
        >
          THE NULL <span className="photonic-gradient bg-clip-text text-transparent">LINE</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.2 }}
          className="text-sm md:text-base tracking-[0.3em] uppercase opacity-60 flex items-center justify-center gap-4"
        >
          <span className="w-12 h-px bg-white/20" />
          NullTech Repository
          <span className="w-12 h-px bg-white/20" />
        </motion.p>
      </div>

      {/* Main Interaction Area */}
      <FileOrbit onFileSelect={setSelectedFile} />

      {/* Footer Info */}
      <div className="absolute bottom-12 z-10 text-center space-y-1 opacity-30 text-[10px] uppercase tracking-widest pointer-events-none">
        <p>Based on NullBilliards Geometry</p>
        <p>Quantum-Ready Hyper-Text Archive</p>
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
        title="Design Outline" 
        isOpen={showOutline} 
        onClose={() => setShowOutline(false)}
      >
        <div className="space-y-4">
          <section>
            <h3 className="text-accent font-bold text-xs uppercase tracking-tighter mb-1">Fundamental Equation</h3>
            <p className="font-mono text-lg font-bold">k · k = 0</p>
            <p className="text-[10px] opacity-60">A photon's four-momentum is null. Inside reflective boundaries, this produces mass, time, and computation.</p>
          </section>
          
          <section>
            <h3 className="text-accent font-bold text-xs uppercase tracking-tighter mb-1">The Dependency Map</h3>
            <ul className="text-[10px] space-y-1 opacity-80 list-disc pl-3">
              <li><strong>Null Sphere Computer</strong>: Fundamental photonic processor.</li>
              <li><strong>Orbit OS</strong>: Wavefunction collapse as process execution.</li>
              <li><strong>Null Forge</strong>: Atomic-precision fabricator.</li>
              <li><strong>Trinary Magi</strong>: Civilisational AI governance.</li>
              <li><strong>Null Ark</strong>: Interstellar colony vessel.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-accent font-bold text-xs uppercase tracking-tighter mb-1">Strategic Objective</h3>
            <p className="text-[10px] opacity-60">To extend human civilization across the stars via the systematic exploitation of null billiard dynamics.</p>
          </section>

          <button 
            onClick={() => setShowOutline(false)}
            className="w-full py-2 bg-accent/10 border border-accent/20 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-accent/20 transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </DraggableWindow>

      {/* Outline Toggle Button */}
      {!showOutline && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowOutline(true)}
          className="fixed bottom-8 right-8 w-12 h-12 glass rounded-full flex items-center justify-center text-accent shadow-2xl z-50 hover:scale-110 transition-transform"
          title="Open Design Outline"
        >
          <LayoutGrid size={20} />
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
