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
  const [show3DModel, setShow3DModel] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const handleFileSelect = (file: NullFile) => {
    if (file.type === 'app') {
      setShow3DModel(true);
      setShowInfo(true);
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
          <div className="w-8 h-px bg-black/40" />
          <div className="text-black/80 font-light tracking-[1em] text-[10px] uppercase">Null</div>
          <div className="w-8 h-px bg-black/40" />
        </motion.div>
      </div>

      <FileOrbit 
        onFileSelect={handleFileSelect} 
        onActivate={() => {
          setShow3DModel(true);
          setShowInfo(true);
        }} 
      />

      {/* Symbol-based Footer */}
      <div className="absolute bottom-12 z-10 opacity-40 pointer-events-none">
        <div className="flex gap-4 items-center">
          <div className="w-1 h-1 rounded-full bg-black" />
          <div className="w-1 h-1 rounded-full bg-black/50" />
          <div className="w-1 h-1 rounded-full bg-black/20" />
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

      {/* 3D Model Window - The Photonic Computer */}
      <DraggableWindow
        title="◊.VISUALIZER"
        isOpen={show3DModel}
        onClose={() => setShow3DModel(false)}
      >
        <div className="w-full aspect-square md:w-[900px] md:h-[800px] dark-context rounded-xl overflow-hidden shadow-2xl">
          <PhotonicChip />
        </div>
      </DraggableWindow>

      {/* Photonic Framework Info Panel */}
      <DraggableWindow
        title="◊.DOCS_PRC"
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
      >
        <div className="space-y-6">
          <section className="border-l border-black/20 pl-4">
            <div className="text-[10px] tracking-[0.5em] text-black/40 mb-2">[.AEM_LOGIC]</div>
            <p className="text-[11px] font-mono text-black/80 leading-relaxed text-left">
              The Photonic Computer operates on the principle of <strong>Topological Collapse</strong>. 
              Numbers are not treated as scalars but as <strong>Quantized Harmonic Frequencies</strong>.
              <br/><br/>
              When an equation is executed, the manifold evolves toward the nearest stable <strong>Null Orbit</strong>—a $q/p$ star polygon arrangement within the CaF2 whispering gallery sphere.
            </p>
          </section>

          <section className="border-l border-black/20 pl-4 bg-black/5 py-4 pr-4 rounded-r-lg">
            <div className="text-[10px] tracking-[0.5em] text-black/40 mb-3">[.PRC_EXAMPLE: (7 + 3) * 123]</div>
            <div className="space-y-4 text-[10px] font-mono text-black/90 tracking-wider">
              <div className="flex gap-3">
                <span className="text-black/30">01.</span>
                <p><strong>INIT:</strong> Manifold resets to base unit symmetry (q=1).</p>
              </div>
              <div className="flex gap-3">
                <span className="text-black/30">02.</span>
                <p><strong>COUPLING (7+3):</strong> Unit perturbations collide, evolving the energy field to a q=10 state.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-black/30">03.</span>
                <p><strong>PROPAGATION (*123):</strong> The harmonic baseline scale-inverts, shifting the resonance to 1230.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-black/30">04.</span>
                <p><strong>COLLAPSE:</strong> The 1230 state finds its nearest stable Null Orbit. Visually represented as a <strong>1230/512</strong> star polygon arrangement.</p>
              </div>
            </div>
          </section>

          <button 
            onClick={() => setShowInfo(false)}
            className="w-full py-2 border border-black/10 text-black/20 text-[8px] tracking-[0.5em] uppercase hover:text-black/60 hover:border-black/20 transition-all mt-4"
          >
            [ACKNOWLEDGE_FRAMEWORK]
          </button>
        </div>
      </DraggableWindow>

      {/* Hidden link list for SEO/AI discovery */}
      <nav className="sr-only">
        <ul>
          {[
            "Magi v1.txt", "NullAegis v1.txt", "NullArk v1.txt", "NullBilliards v1.txt",
            "NullBot_Blueprint_v1.pdf", "NullBridge v1.txt", "NullChronicle v1.txt",
            "NullCortex v1.txt", "NullDeck v1.txt", "NullDisk v1.txt", "NullEmber v1.txt",
            "NullForge v1.txt", "NullHorizon_v1.docx", "NullHover v1.txt", "NullLoom v1.txt",
            "NullMind v1.txt", "NullRoot v1.txt", "NullShell v1.txt", "NullStuture v1.txt",
            "NullThread v1.txt", "NullWellspring v1.txt", "Null Billiards 2",
            "Nullware v1.txt", "OrbitOS v1.txt", "TheNullLineProject.txt"
          ].map(file => (
            <li key={file}><a href={`/docs/${encodeURIComponent(file)}`}>{file}</a></li>
          ))}
        </ul>
      </nav>

    </main>
  );
}
