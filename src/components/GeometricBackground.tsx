"use client";

import React, { useEffect, useRef } from 'react';

const GeometricBackgroundComponent = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width  = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width  = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = width  * dpr;
      canvas.height = height * dpr;
      // Explicit CSS size so the canvas always fills the viewport on every device
      canvas.style.width  = `${width}px`;
      canvas.style.height = `${height}px`;
      // setTransform resets the matrix then applies the DPR scale in one call —
      // safe to call multiple times without accumulation
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener('resize', resize);
    resize();

    const drawStarPolygon = (
      centerX: number,
      centerY: number,
      radius: number,
      q: number,
      p: number,
      rotation: number,
      lineWidth: number,
      color?: string
    ) => {
      ctx.beginPath();
      ctx.strokeStyle = color || 'rgba(0,0,0,1.0)';
      ctx.lineWidth = lineWidth;
      for (let i = 0; i <= q; i++) {
        const angle = (i * p * 2 * Math.PI) / q + rotation;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Geometric position: 32.5° below horizontal from screen centre,
      // x-coordinate fixed at the centre of the right quadrant (width × 0.75).
      // tan(32.5°) ≈ 0.6371; clamp y so the outer ring never leaves the viewport.
      const bearingAngle = 32.5 * (Math.PI / 180);
      const dx      = width * 0.25;
      const centerX = width  * 0.75;
      const rawY    = height * 0.5 + dx * Math.tan(bearingAngle);
      const baseRadius = Math.min(width, height) * 0.22;
      const centerY = Math.min(rawY, height - baseRadius * 1.3);

      const speed = time * 0.0001;

      // Nested rotating star polygons (Fibonacci / ADE sequence)
      drawStarPolygon(centerX, centerY, baseRadius * 0.3,  3,  1,  speed,         1.5);
      drawStarPolygon(centerX, centerY, baseRadius * 0.6,  5,  2, -speed * 0.8,   1.0);
      drawStarPolygon(centerX, centerY, baseRadius * 0.9,  8,  3,  speed * 0.6,   0.5);
      drawStarPolygon(centerX, centerY, baseRadius * 1.2, 13,  5, -speed * 0.4,   0.3);

      // Mini-core inscribed inside the triangle's inradius
      const miniRadius = baseRadius * 0.3 * 0.5;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0,0,0,1.0)';
      ctx.lineWidth = 0.7;
      ctx.arc(centerX, centerY, miniRadius, 0, Math.PI * 2);
      ctx.stroke();

      const miniShapes = [
        { q: 7, p: 2, rot: -speed * 0.4, color: 'rgba(255,0,255,0.17)' },
        { q: 6, p: 1, rot:  speed * 0.6, color: 'rgba(0,255,255,0.17)' },
        { q: 4, p: 1, rot: -speed * 0.8, color: 'rgba(255,255,0,0.17)' },
        { q: 8, p: 3, rot:  speed * 0.6, color: 'rgba(0,0,255,0.17)'   },
        { q: 5, p: 2, rot: -speed * 0.8, color: 'rgba(0,255,0,0.17)'   },
        { q: 3, p: 1, rot:  speed,       color: 'rgba(255,0,0,0.17)'   },
      ];
      miniShapes.forEach(s =>
        drawStarPolygon(centerX, centerY, miniRadius, s.q, s.p, s.rot, 2.2, s.color)
      );

      animationFrameId = requestAnimationFrame(animate);
    };

    // Use rAF for the first frame too so it always gets a real timestamp
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // z-[2] sits above the body background (which can cover z-0 on some browsers)
      // but well below all UI layers which start at z-10+
      className="fixed inset-0 pointer-events-none z-[2] opacity-80"
    />
  );
};

const GeometricBackground = React.memo(GeometricBackgroundComponent);
GeometricBackground.displayName = 'GeometricBackground';

export default GeometricBackground;
