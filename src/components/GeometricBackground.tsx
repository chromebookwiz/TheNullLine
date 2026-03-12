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
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
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
      ctx.strokeStyle = color || `rgba(0, 0, 0, 1.0)`;
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
      
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.35; 
      const speed = time * 0.0001; 

      // Draw nested SOLID black polygons with varying weights
      drawStarPolygon(centerX, centerY, baseRadius * 0.3, 3, 1, speed, 1.5);     
      drawStarPolygon(centerX, centerY, baseRadius * 0.6, 5, 2, -speed * 0.8, 1.0);    
      drawStarPolygon(centerX, centerY, baseRadius * 0.9, 8, 3, speed * 0.6, 0.5);           
      drawStarPolygon(centerX, centerY, baseRadius * 1.2, 13, 5, -speed * 0.4, 0.3);

      // CENTRAL ENCASEMENT: Mini-core with uniform radii
      // Make the mini shape animation larger and concentric with the inside of the large triangle
      const triangleRadius = baseRadius * 0.3;
      const miniRadius = triangleRadius * 0.85; // Just inside the triangle
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0, 0, 0, 1.0)";
      ctx.lineWidth = 0.7;
      ctx.arc(centerX, centerY, miniRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Mini shapes all touch the circle, now with mathematically accurate rainbow colors
      const miniShapes = [
        { q: 3, p: 1, rot: speed * 2 },
        { q: 5, p: 2, rot: -speed * 1.5 },
        { q: 8, p: 3, rot: speed * 1.2 },
        { q: 13, p: 5, rot: -speed * 0.8 },
      ];
      // Map q to a hue in the rainbow (0-360)
      const qs = miniShapes.map(s => s.q);
      const minQ = Math.min(...qs);
      const maxQ = Math.max(...qs);
      miniShapes.forEach((shape, i) => {
        // Evenly distribute hues across the rainbow for the q values
        const t = (shape.q - minQ) / (maxQ - minQ);
        const hue = Math.round(360 * t); // 0=red, 120=green, 240=blue, 360=red
        const color = `hsl(${hue}, 98%, 54%)`;
        drawStarPolygon(centerX, centerY, miniRadius, shape.q, shape.p, shape.rot, 2.2, color);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate(0);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-2] opacity-80"
    />
  );
};

const GeometricBackground = React.memo(GeometricBackgroundComponent);
GeometricBackground.displayName = 'GeometricBackground';

export default GeometricBackground;
