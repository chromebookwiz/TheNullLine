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
      canvas.width = width;
      canvas.height = height;
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
      drawCircle = true
    ) => {
      const hue = Math.max(0, 300 - (q * 20)); 
      const color = `hsla(${hue}, 70%, 50%, 0.15)`;
      const circleColor = `hsla(${hue}, 70%, 50%, 0.05)`;

      if (drawCircle) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = circleColor;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
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
      ctx.lineWidth = 1;

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.38; 

      const speed = time * 0.0001; 

      drawStarPolygon(centerX, centerY, baseRadius * 0.4, 3, 1, speed);     
      drawStarPolygon(centerX, centerY, baseRadius * 0.7, 5, 2, -speed);    
      drawStarPolygon(centerX, centerY, baseRadius, 8, 3, speed);           
      drawStarPolygon(centerX, centerY, baseRadius * 1.3, 13, 5, -speed);   

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
