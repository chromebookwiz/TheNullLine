"use client";

import React, { useEffect, useRef } from 'react';

export default function GeometricBackground() {
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
      // Draw outer boundary circle
      if (drawCircle) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
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
      const baseRadius = Math.min(width, height) * 0.35; // Slightly smaller

      const speed = time * 0.0001; // Uniform speed

      // Stark counter-rotating orbits with uniform speed
      drawStarPolygon(centerX, centerY, baseRadius, 8, 3, speed);
      drawStarPolygon(centerX, centerY, baseRadius * 0.6, 5, 2, -speed);
      drawStarPolygon(centerX, centerY, baseRadius * 1.2, 13, 5, speed);
      drawStarPolygon(centerX, centerY, baseRadius * 0.3, 3, 1, -speed);

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
}
