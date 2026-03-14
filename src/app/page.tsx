"use client";

import React, { useCallback, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import GeometricBackground from '@/components/GeometricBackground';
import FileOrbit from '@/components/FileOrbit';
import DocumentViewer from '@/components/DocumentViewer';
import DraggableWindow from '@/components/DraggableWindow';
import dynamic from 'next/dynamic';

const PhotonicChip = dynamic(() => import('@/components/three/PhotonicChip'), { 
  ssr: false,
  loading: () => <div className="w-full h-full rounded-2xl glass-card animate-pulse flex items-center justify-center text-accent/20 text-[10px] uppercase tracking-widest">Initializing Core...</div>
});

const ShapeClicker = dynamic(() => import('@/components/ShapeClicker'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-white flex items-center justify-center text-black/20 text-[10px] uppercase tracking-widest">Loading Manifold...</div>
});

const FilesApp = dynamic(() => import('@/components/FilesApp'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-white flex items-center justify-center text-black/20 text-[10px] uppercase tracking-widest">Opening Files...</div>
});

const NullForgeApp = dynamic(() => import('@/components/NullForgeApp'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-white flex items-center justify-center text-black/20 text-[10px] uppercase tracking-widest">Loading Forge...</div>
});

const NullDeckApp = dynamic(() => import('@/components/NullDeckApp'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#070b12] flex items-center justify-center text-white/20 text-[10px] uppercase tracking-widest">Initializing Projection...</div>
});

const NullHoverApp = dynamic(() => import('@/components/NullHoverApp'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-white flex items-center justify-center text-black/20 text-[10px] uppercase tracking-widest">Engaging Coils...</div>
});

const NullPromoApp = dynamic(() => import('@/components/NullPromoApp'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black flex items-center justify-center text-white/20 text-[10px] uppercase tracking-widest">Loading Showcase...</div>
});

const CommunityApp = dynamic(() => import('@/components/CommunityApp'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-white flex items-center justify-center text-black/20 text-[10px] uppercase tracking-widest">Loading Community...</div>
});


type FileType = 'txt' | 'docx' | 'pdf' | 'app' | 'folder';

interface NullFile {
  name: string;
  type: FileType;
  path: string;
  children?: NullFile[];
}


type AppWindowType = 'document' | 'photonic' | 'info' | 'evolve' | 'clicker' | 'simulation' | 'files' | 'forge' | 'deck' | 'hover' | 'promo' | 'community';
interface WindowInstance {
  id: string;
  type: AppWindowType;
  file?: NullFile;
  zIndex: number;
}

export default function Home() {
  const [openWindows, setOpenWindows] = useState<WindowInstance[]>([]);
  const zIndexRef = useRef(100);

  const getNextZIndex = useCallback(() => {
    zIndexRef.current += 1;
    return zIndexRef.current;
  }, []);

  const bringToFront = useCallback((id: string) => {
    const newZ = getNextZIndex();
    setOpenWindows((prev) => prev.map((windowItem) => windowItem.id === id ? { ...windowItem, zIndex: newZ } : windowItem));
  }, [getNextZIndex]);


  const openWindow = useCallback((type: AppWindowType, file?: NullFile) => {
    const id = file ? file.path : type;

    setOpenWindows((prev) => {
      const existing = prev.find((windowItem) => windowItem.id === id);
      const newZ = getNextZIndex();

      if (existing) {
        return prev.map((windowItem) => windowItem.id === id ? { ...windowItem, zIndex: newZ } : windowItem);
      }

      return [...prev, { id, type, file, zIndex: newZ }];
    });
  }, [getNextZIndex]);

  const closeWindow = useCallback((id: string) => {
    setOpenWindows((prev) => prev.filter((windowItem) => windowItem.id !== id));
  }, []);


  const handleFileSelect = useCallback((file: NullFile) => {
    if (file.type === 'app') {
      if (file.name.toLowerCase().includes('clicker')) {
        openWindow('clicker');
      } else if (file.path === 'app://simulation' || file.name.toLowerCase().includes('billiard')) {
        openWindow('simulation');
      } else if (file.name.toLowerCase().includes('forge')) {
        openWindow('forge');
      } else if (file.name.toLowerCase().includes('deck') || file.name.toLowerCase().includes('cylinder')) {
        openWindow('deck');
      } else if (file.name.toLowerCase().includes('hover')) {
        openWindow('hover');
      } else if (file.name.toLowerCase().includes('promo') || file.name.toLowerCase().includes('showcase')) {
        openWindow('promo');
      } else if (file.name.toLowerCase().includes('community') || file.name.toLowerCase().includes('donate')) {
        openWindow('community');
      } else if (file.name.toLowerCase().includes('files')) {
        openWindow('files', file);
      } else {
        openWindow('photonic');
        openWindow('info');
      }
    } else {
      openWindow('document', file);
    }
  }, [openWindow]);

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      <GeometricBackground />

      <div className="relative z-10 w-full flex items-center justify-center">
        <FileOrbit onFileSelect={handleFileSelect} />
      </div>

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
                title="◊.NULL_PHOTON_SPHERE"
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
            ) : win.type === 'clicker' ? (
              <DraggableWindow
                title="◊.CLICKER"
                isOpen={true}
                onClose={() => closeWindow(win.id)}
                className="w-[90vw] md:w-[800px] h-[80vh]"
                style={{ zIndex: win.zIndex }}
                onPointerDown={() => bringToFront(win.id)}
              >
                <ShapeClicker />
              </DraggableWindow>
            ) : win.type === 'community' ? (
              <DraggableWindow
                title="◊.COMMUNITY"
                isOpen={true}
                onClose={() => closeWindow(win.id)}
                className="w-[98vw] md:w-[600px] h-[90vh] md:h-[700px]"
                style={{ zIndex: win.zIndex }}
                onPointerDown={() => bringToFront(win.id)}
              >
                <CommunityApp />
              </DraggableWindow>
            ) : win.type === 'simulation' ? (
              <DraggableWindow
                title="◊.NULL_BILLIARD_COMPUTER"
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
            ) : win.type === 'forge' ? (
              <DraggableWindow
                title="◊.NULL_FORGE"
                isOpen={true}
                onClose={() => closeWindow(win.id)}
                className="w-[98vw] md:w-[900px] h-[90vh] md:h-[700px]"
                style={{ zIndex: win.zIndex }}
                onPointerDown={() => bringToFront(win.id)}
              >
                <NullForgeApp />
              </DraggableWindow>
            ) : win.type === 'deck' ? (
              <DraggableWindow
                title="◊.NULL_CYLINDER"
                isOpen={true}
                onClose={() => closeWindow(win.id)}
                className="w-[98vw] md:w-[980px] h-[90vh] md:h-[680px]"
                style={{ zIndex: win.zIndex }}
                onPointerDown={() => bringToFront(win.id)}
              >
                <NullDeckApp />
              </DraggableWindow>
            ) : win.type === 'hover' ? (
              <DraggableWindow
                title="◊.NULL_HOVER"
                isOpen={true}
                onClose={() => closeWindow(win.id)}
                className="w-[98vw] md:w-[900px] h-[90vh] md:h-[680px]"
                style={{ zIndex: win.zIndex }}
                onPointerDown={() => bringToFront(win.id)}
              >
                <NullHoverApp />
              </DraggableWindow>
            ) : win.type === 'promo' ? (
              <DraggableWindow
                title="◊.NULL_LINE_SHOWCASE"
                isOpen={true}
                onClose={() => closeWindow(win.id)}
                className="w-[98vw] md:w-[1000px] h-[92vh] md:h-[720px]"
                style={{ zIndex: win.zIndex }}
                onPointerDown={() => bringToFront(win.id)}
              >
                <NullPromoApp />
              </DraggableWindow>
            ) : win.type === 'files' ? (
              <DraggableWindow
                title="◊.FILES"
                isOpen={true}
                onClose={() => closeWindow(win.id)}
                className="w-[400px] h-[70vh]"
                style={{ zIndex: win.zIndex }}
                onPointerDown={() => bringToFront(win.id)}
              >
                <FilesApp onOpenFile={(file) => openWindow('document', file)} />
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
                <div className="space-y-6 p-8 bg-white h-full custom-scrollbar overflow-y-auto">
                  <section className="border-l border-black/20 pl-4">
                    <div className="text-[10px] tracking-[0.5em] text-black/40 mb-2">[.CORE_TOPOLOGY: ZEEMAN-MALAMENT]</div>
                    <p className="text-[11px] font-mono text-black/80 leading-relaxed text-left uppercase">
                      The Photonic Computer utilizes a <strong>Lorentzian Substrate</strong>. Per the findings of Zeeman (1964) and Malament (1977), we establish the <strong>Null Cone</strong> as the logically primitive structure. Computing is the <strong>Topological Localization</strong> of null momentum within an S1-manifold.
                    </p>
                  </section>

                  <section className="border-l border-black/20 pl-4 bg-black/[0.02] py-4 pr-4 rounded-r-lg">
                    <div className="text-[10px] tracking-[0.5em] text-black/40 mb-3">[.EMERGENT_MASS: M=Q]</div>
                    <p className="text-[11px] font-mono text-black/80 leading-relaxed text-left uppercase">
                      Unlike <strong>Electronic Charge</strong> which suffers from thermodynamic leakage, we utilize <strong>Periodic Null Billiards</strong>. When the incidence angle α is a rational multiple of π (α = pπ/q), the ray closes after <em>q</em> reflections. 
                      <br/><br/>
                      The composite four-momentum results in zero spatial sum: <strong>K = (q, 0, 0, 0)</strong>. Mass <em>m=q</em> effectively emerges from massless light, signifying a solved state.
                    </p>
                  </section>

                  <section className="border-l border-black/20 pl-4 bg-black/[0.02] py-4 pr-4 rounded-r-lg">
                    <div className="text-[10px] tracking-[0.5em] text-black/40 mb-3">[.RIEMANN_LINK: E8_LATTICE]</div>
                    <p className="text-[11px] font-mono text-black/80 leading-relaxed text-left uppercase">
                      Stable configurations are classified by <strong>Simply-Laced ADE Diagrams</strong>. The 240 minimal vectors of the <strong>E8 Root System</strong> are embedded as null vectors in R1,8. Stability in the manifold is mathematically isomorphic to the <strong>Riemann Hypothesis</strong>—waveform collapse follows the distribution of critical zeros.
                    </p>
                  </section>

                  <button 
                    onClick={() => closeWindow(win.id)}
                    className="w-full py-3 border border-black/10 text-black/40 text-[8px] tracking-[0.5em] uppercase hover:text-black hover:border-black/30 transition-all mt-4 font-bold"
                  >
                    [ACKNOWLEDGE_FRAMEWORK]
                  </button>
                </div>
              </DraggableWindow>
            ) : win.type === 'evolve' ? (
              <DraggableWindow
                title="◊.MANIFOLD_EVOLVER"
                isOpen={true}
                onClose={() => closeWindow(win.id)}
                className="w-[95vw] md:w-[1200px] h-[90vh] md:h-[700px]"
                style={{ zIndex: win.zIndex }}
                onPointerDown={() => bringToFront(win.id)}
              >
                <ShapeClicker />
              </DraggableWindow>
            ) : null}
          </React.Fragment>
        ))}
      </AnimatePresence>

    </main>
  );
}
