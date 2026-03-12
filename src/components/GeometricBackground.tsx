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
      rotation: number
    ) => {
      ctx.beginPath();
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
      ctx.strokeStyle = 'rgba(125, 65, 255, 0.15)';
      ctx.lineWidth = 1;

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.4;

      // Draw several nested star polygons from NullBilliards ADE classification
      drawStarPolygon(centerX, centerY, baseRadius, 8, 3, time * 0.0001);
      drawStarPolygon(centerX, centerY, baseRadius * 0.8, 5, 2, -time * 0.00015);
      drawStarPolygon(centerX, centerY, baseRadius * 1.2, 13, 5, time * 0.00005);

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
      className="fixed inset-0 pointer-events-none z-[-2] opacity-50"
    />
  );
}
