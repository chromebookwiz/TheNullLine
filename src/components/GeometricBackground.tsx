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
      lineWidth: number
    ) => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(0, 0, 0, 1.0)`;
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
      const innerRadius = baseRadius * 0.1;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0, 0, 0, 1.0)";
      ctx.lineWidth = 2.0;
      ctx.arc(centerX, centerY, innerRadius + 10, 0, Math.PI * 2);
      ctx.stroke();

      // Mini shapes all same size
      drawStarPolygon(centerX, centerY, innerRadius, 3, 1, speed * 2, 1.0);
      drawStarPolygon(centerX, centerY, innerRadius, 5, 2, -speed * 1.5, 1.0);
      drawStarPolygon(centerX, centerY, innerRadius, 8, 3, speed * 1.2, 0.5);
      drawStarPolygon(centerX, centerY, innerRadius, 13, 5, -speed * 0.8, 0.3);

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
