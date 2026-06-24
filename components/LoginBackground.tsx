"use client";

import { useEffect, useRef } from "react";

const BASE_HEIGHT = 220;
const NODE_DENSITY = 2200;
const LINK_DISTANCE_RATIO = 0.3;

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

function createNodes(width: number, height: number): Node[] {
  const count = Math.max(18, Math.round((width * height) / NODE_DENSITY));

  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.12,
    vy: (Math.random() - 0.5) * 0.12,
  }));
}

function getCanvasSize(container: HTMLElement) {
  const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
  const height = BASE_HEIGHT;
  const width = Math.max(120, Math.round(height * aspect));

  return { width, height };
}

export function LoginBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const containerEl = containerRef.current;
    const canvasEl = canvasRef.current;
    if (!containerEl || !canvasEl) return;

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    let nodes: Node[] = [];
    let canvasWidth = 0;
    let canvasHeight = 0;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function resize() {
      const size = getCanvasSize(containerEl);
      canvasWidth = size.width;
      canvasHeight = size.height;
      canvasEl.width = canvasWidth;
      canvasEl.height = canvasHeight;
      nodes = createNodes(canvasWidth, canvasHeight);
    }

    function draw() {
      const linkDistance = canvasHeight * LINK_DISTANCE_RATIO;

      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      if (!reducedMotion) {
        for (const node of nodes) {
          node.x += node.vx;
          node.y += node.vy;

          if (node.x <= 0 || node.x >= canvasWidth) node.vx *= -1;
          if (node.y <= 0 || node.y >= canvasHeight) node.vy *= -1;

          node.x = Math.max(0, Math.min(canvasWidth, node.x));
          node.y = Math.max(0, Math.min(canvasHeight, node.y));
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.hypot(dx, dy);

          if (distance < linkDistance) {
            const strength = 1 - distance / linkDistance;
            ctx.strokeStyle = `rgba(223, 255, 0, ${strength * 0.28})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(Math.round(nodes[i].x), Math.round(nodes[i].y));
            ctx.lineTo(Math.round(nodes[j].x), Math.round(nodes[j].y));
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        ctx.fillStyle = "rgba(223, 255, 0, 0.7)";
        ctx.fillRect(node.x | 0, node.y | 0, 1, 1);
      }

      frameId = window.requestAnimationFrame(draw);
    }

    resize();
    draw();

    const observer = new ResizeObserver(resize);
    observer.observe(containerEl);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden bg-zinc-950"
    >
      <canvas ref={canvasRef} className="login-bg-network" />
      <div className="login-bg-grain login-bg-grain-coarse" />
      <div className="login-bg-grain login-bg-grain-fine" />
      <div className="login-bg-vignette absolute inset-0" />
    </div>
  );
}
