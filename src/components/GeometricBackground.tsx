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
      // Make the mini shape animation exactly inscribed in the triangle
      const triangleRadius = baseRadius * 0.3;
      // The inradius of an equilateral triangle of circumradius R is R * cos(pi/3) = R * 0.5
      // But for a regular polygon, the inradius is R * cos(pi/q). For q=3, inradius = R * 0.5
      // We want the mini circle's inner edge to touch the triangle's inner edge, so:
      const miniRadius = triangleRadius * 0.5; // inradius of triangle
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0, 0, 0, 1.0)";
      ctx.lineWidth = 0.7;
      ctx.arc(centerX, centerY, miniRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Mini shapes all touch the circle, now with pure RGB and 50/50 mixes, 50% transparent
      // Rotations matched to outer counterparts so triangles/stars align in angle
      // Order: Magenta, Cyan, Yellow, Blue, Green, Red (reverse, so Red is out front)
      const miniShapes = [
        { q: 7, p: 2, rot: -speed * 0.4, color: 'rgba(255,0,255,0.5)' }, // Magenta (R+B) — near q=13 speed
        { q: 6, p: 1, rot: speed * 0.6, color: 'rgba(0,255,255,0.5)' },  // Cyan (G+B) — near q=8 speed
        { q: 4, p: 1, rot: -speed * 0.8, color: 'rgba(255,255,0,0.5)' }, // Yellow (R+G) — near q=5 speed
        { q: 8, p: 3, rot: speed * 0.6, color: 'rgba(0,0,255,0.5)' },    // Blue — matches outer q=8
        { q: 5, p: 2, rot: -speed * 0.8, color: 'rgba(0,255,0,0.5)' },   // Green — matches outer q=5
        { q: 3, p: 1, rot: speed, color: 'rgba(255,0,0,0.5)' },          // Red — matches outer q=3 (triangle)
      ];
      miniShapes.forEach((shape) => {
        drawStarPolygon(centerX, centerY, miniRadius, shape.q, shape.p, shape.rot, 2.2, shape.color);
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
