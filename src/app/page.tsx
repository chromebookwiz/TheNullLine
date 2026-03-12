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

interface WindowInstance {
  id: string;
  type: 'document' | 'photonic' | 'info';
  file?: NullFile;
  zIndex: number;
}

export default function Home() {
  const [openWindows, setOpenWindows] = useState<WindowInstance[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(100);

  const bringToFront = (id: string) => {
    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);
    setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: newZ } : w));
  };

  const openWindow = (type: 'document' | 'photonic' | 'info', file?: NullFile) => {
    const id = file ? file.path : type;
    const existing = openWindows.find(w => w.id === id);
    if (existing) {
      bringToFront(id);
    } else {
      const newZ = maxZIndex + 1;
      setMaxZIndex(newZ);
      setOpenWindows(prev => [...prev, { id, type, file, zIndex: newZ }]);
    }
  };

  const closeWindow = (id: string) => {
    setOpenWindows(prev => prev.filter(w => w.id !== id));
  };

  const handleFileSelect = (file: NullFile) => {
    if (file.type === 'app') {
      openWindow('photonic');
      openWindow('info');
    } else {
      openWindow('document', file);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      <GeometricBackground />
      
      <FileOrbit 
        onFileSelect={handleFileSelect} 
        onActivate={() => {
          openWindow('photonic');
          openWindow('info');
        }} 
      />

      <AnimatePresence mode="popLayout">
        {openWindows.map((win) => (
          <React.Fragment key={win.id}>
            {win.type === 'document' && win.file ? (
              <DraggableWindow
                title={`◊.${win.file.name.toUpperCase().replace(/\s/g, '_')}`}
                isOpen={true}
                onClose={() => closeWindow(win.id)}
                className="w-[90vw] md:w-[800px] h-[80vh]"
                style={{ zIndex: win.zIndex }}
                onPointerDown={() => bringToFront(win.id)}
              >
                <DocumentViewer file={win.file} embedded />
              </DraggableWindow>
            ) : win.type === 'photonic' ? (
              <DraggableWindow
                title="◊.VISUALIZER"
                isOpen={true}
                onClose={() => closeWindow(win.id)}
                className="w-[98vw] md:w-[1100px] h-[90vh] md:h-[850px]"
                style={{ zIndex: win.zIndex }}
                onPointerDown={() => bringToFront(win.id)}
              >
                <div className="w-full h-[75vh] md:h-[750px] dark-context rounded-xl overflow-hidden shadow-2xl relative">
                  <PhotonicChip />
                </div>
              </DraggableWindow>
            ) : win.type === 'info' ? (
              <DraggableWindow
                title="◊.DOCS_PRC"
                isOpen={true}
                onClose={() => closeWindow(win.id)}
                className="w-[450px] shadow-xl"
                style={{ zIndex: win.zIndex }}
                onPointerDown={() => bringToFront(win.id)}
              >
                <div className="space-y-6 p-8 bg-white h-full">
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
                    <div className="text-[10px] tracking-[0.5em] text-black/40 mb-3">[.TRINITY_SUPERIORITY]</div>
                    <p className="text-[11px] font-mono text-black/80 leading-relaxed text-left">
                      Unlike <strong>Binary Architecture</strong> (0/1), Trinity Computing utilizes <strong>AEM Phase-Resonance</strong>. 
                      Existing methods suffer from the "Electron Bottleneck"—heat and latency caused by physical cargo movement. 
                      <br/><br/>
                      Trinity logic collapses high-dimensional equations into stable geometric orbits instantly. We don't <em>calculate</em> the answer; we evolve the manifold until the answer is the only stable state remaining. This provides <strong>Zero-Latency Convergence</strong>.
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
                    onClick={() => closeWindow(win.id)}
                    className="w-full py-2 border border-black/10 text-black/20 text-[8px] tracking-[0.5em] uppercase hover:text-black/60 hover:border-black/20 transition-all mt-4"
                  >
                    [ACKNOWLEDGE_FRAMEWORK]
                  </button>
                </div>
              </DraggableWindow>
            ) : null}
          </React.Fragment>
        ))}
      </AnimatePresence>

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
