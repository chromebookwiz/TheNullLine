"use client";

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Sphere, Line, OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';

const MAX_POINTS = 400;

// Mapping numbers to geometric "perfect" orbits
function getOrbit(value: number) {
  const q = Math.max(3, Math.round(value));
  let p = 1;
  for (let i = Math.floor(q / 2); i > 0; i--) {
    if (gcd(q, i) === 1) {
      p = i;
      break;
    }
  }
  return { q, p };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const RaySystem = React.memo(function RaySystem({ q, p, isSolving }: { q: number, p: number, isSolving: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  
  // Calculate stable target points
  const targetPoints = useMemo(() => {
    const pnts: THREE.Vector3[] = [];
    const radius = 1.5;
    for (let i = 0; i <= q; i++) {
        const angle = (i * p * 2 * Math.PI) / q;
        pnts.push(new THREE.Vector3(
            radius * Math.cos(angle),
            radius * Math.sin(angle),
            radius * Math.sin(angle * 0.5) * 0.1 
        ));
    }
    return pnts;
  }, [q, p]);

  // Use a ref for current positions to handle dynamic count changes safely
  const currentPointsRef = useRef<THREE.Vector3[]>(targetPoints);
  const [pointsToRender, setPointsToRender] = useState<THREE.Vector3[]>(targetPoints);

  // Solving phase search simulation state
  const [searchOrbit, setSearchOrbit] = useState({ q, p });

  useEffect(() => {
    if (isSolving) {
      const interval = setInterval(() => {
        setSearchOrbit({
          q: Math.floor(Math.random() * 12) + 3,
          p: Math.floor(Math.random() * 5) + 1
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setSearchOrbit({ q, p });
    }
  }, [isSolving, q, p]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (groupRef.current) {
        const speed = isSolving ? 0.3 : 0.05;
        groupRef.current.rotation.y += speed * 0.1;
    }

    if (coreRef.current) {
      const coreScale = isSolving ? 1 + Math.sin(t * 20) * 0.2 : 0.4;
      coreRef.current.scale.setScalar(coreScale);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = isSolving ? 0.8 + Math.sin(t * 30) * 0.2 : 0.3;
    }

    // Smoothed transition
    const lerpSpeed = isSolving ? 0.05 : 0.15;
    const activeTarget = isSolving ? getOrbitSearchPoints(searchOrbit.q, searchOrbit.p) : targetPoints;
    
    // Ensure we have enough points in the current ref
    if (currentPointsRef.current.length !== activeTarget.length) {
      const diff = activeTarget.length - currentPointsRef.current.length;
      if (diff > 0) {
        for(let i=0; i<diff; i++) currentPointsRef.current.push(new THREE.Vector3(0,0,0));
      } else {
        currentPointsRef.current = currentPointsRef.current.slice(0, activeTarget.length);
      }
    }

    const nextPoints = activeTarget.map((target, i) => {
      const current = currentPointsRef.current[i] || new THREE.Vector3();
      
      if (isSolving) {
        const noise = new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        );
        return current.clone().lerp(target.clone().add(noise), 0.2);
      }
      
      return current.clone().lerp(target, lerpSpeed);
    });

    currentPointsRef.current = nextPoints;
    setPointsToRender([...nextPoints]);
  });

  function getOrbitSearchPoints(sq: number, sp: number) {
    const pnts: THREE.Vector3[] = [];
    const radius = 1.5;
    for (let i = 0; i <= sq; i++) {
        const angle = (i * sp * 2 * Math.PI) / sq;
        pnts.push(new THREE.Vector3(
            radius * Math.cos(angle),
            radius * Math.sin(angle),
            0
        ));
    }
    return pnts;
  }

  return (
    <group ref={groupRef}>
      <Sphere args={[2, 64, 64]}>
        <meshPhysicalMaterial 
          color="white" 
          transparent 
          opacity={0.02} 
          transmission={0.98}
          thickness={0.5}
          roughness={0}
        />
      </Sphere>

      {pointsToRender.slice(0, pointsToRender.length - 1).map((pnt, i) => (
        <Line
          key={`beam-${i}`}
          points={[new THREE.Vector3(0,0,0), pnt]}
          color="white"
          lineWidth={0.5}
          transparent
          opacity={isSolving ? 0.4 : 0.05}
        />
      ))}

      <Line
        points={pointsToRender}
        color="white" 
        lineWidth={isSolving ? 2 : 1.2}
        transparent
        opacity={isSolving ? 0.8 : 0.4}
      />
      
      {pointsToRender.slice(0, pointsToRender.length - 1).map((pnt, i) => (
        <Sphere key={i} position={pnt} args={[isSolving ? 0.04 : 0.025, 16, 16]}>
          <meshBasicMaterial color="white" transparent opacity={0.8} />
        </Sphere>
      ))}

      <Sphere ref={coreRef} args={[0.15, 32, 32]}>
        <meshBasicMaterial color="white" transparent opacity={0.3} />
      </Sphere>
      
      <pointLight intensity={isSolving ? 2 : 0.5} color="white" />
    </group>
  );
});

const PhotonicComputerComponent = () => {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [orbit, setOrbit] = useState({ q: 8, p: 3 });

  const handleSolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;

    setIsSolving(true);
    
    setTimeout(() => {
      try {
        const sanitized = input.replace(/[^-+*/().0-9]/g, '');
        // eslint-disable-next-line no-eval
        const val = eval(sanitized);
        const num = parseFloat(val);
        if (!isNaN(num)) {
          setResult(num);
          setOrbit(getOrbit(num));
        }
      } catch (err) {
        console.error("Math error", err);
      }
      setIsSolving(false);
    }, 2000); 
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-black">
      <div className="flex-1 w-full scale-110">
        <Canvas dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={25} />
          <OrbitControls enablePan={false} autoRotate={!isSolving} autoRotateSpeed={0.5} />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          
          <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
            <RaySystem q={orbit.q} p={orbit.p} isSolving={isSolving} />
          </Float>
          
          <Environment preset="night" />
        </Canvas>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col items-center gap-6 bg-black/90 border-t border-white/5 backdrop-blur-xl">
        <form onSubmit={handleSolve} className="w-full max-w-sm relative group">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="◊.ENTER_EQUATION"
            className="w-full bg-transparent border-b border-white/10 py-3 px-1 text-[11px] uppercase tracking-[0.5em] text-white focus:outline-none focus:border-white/40 transition-all text-center"
          />
          <button 
            type="submit"
            className="absolute right-0 bottom-3 text-[9px] text-white/30 hover:text-white transition-colors tracking-[0.3em] font-bold"
          >
            [EXEC]
          </button>
        </form>

        <div className="flex items-center gap-10">
            <div className="flex flex-col items-center gap-1">
              <div className="text-[7px] tracking-[0.4em] text-white/20 uppercase">Core Status</div>
              <div className="text-[9px] tracking-[0.3em] text-white/60 uppercase">{isSolving ? "◊.COLLAPSING" : "◊.STABLE"}</div>
            </div>
            
            {result !== null && (
                <div className="flex flex-col items-center gap-1 border-x border-white/10 px-10">
                  <div className="text-[7px] tracking-[0.4em] text-white/20 uppercase">Resultant</div>
                  <div className="text-[11px] tracking-[0.2em] text-white font-bold">{result}</div>
                </div>
            )}

            <div className="flex flex-col items-center gap-1">
              <div className="text-[7px] tracking-[0.4em] text-white/20 uppercase">Manifold</div>
              <div className="text-[9px] tracking-[0.3em] text-white/60 uppercase">{orbit.q}:{orbit.p}</div>
            </div>
        </div>
      </div>
    </div>
  );
};

const PhotonicComputer = React.memo(PhotonicComputerComponent);
PhotonicComputer.displayName = 'PhotonicComputer';

export default PhotonicComputer;
