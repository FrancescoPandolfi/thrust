"use client";

import { useEffect, useRef } from "react";

const NODE_DENSITY = 10000;
const LINK_DISTANCE_RATIO = 0.34;
const RENDER_SCALE = 0.45;
const GRAIN_TILE = 128;
const GRAIN_FRAME_INTERVAL = 4;

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

function createNodes(width: number, height: number): Node[] {
  const count = Math.max(14, Math.round((width * height) / NODE_DENSITY));

  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.12,
    vy: (Math.random() - 0.5) * 0.12,
  }));
}

function getCanvasSize(container: HTMLElement) {
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = container.clientWidth;
  const displayHeight = container.clientHeight;
  const width = Math.max(160, Math.round(displayWidth * RENDER_SCALE));
  const height = Math.max(160, Math.round(displayHeight * RENDER_SCALE));

  return {
    width,
    height,
    pixelWidth: Math.round(width * dpr),
    pixelHeight: Math.round(height * dpr),
    dpr,
    displayWidth,
    displayHeight,
  };
}

function fillTvGrainTile(imageData: ImageData) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const value = (Math.random() * 255) | 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 10 + (Math.random() * 28) | 0;
  }
}

export function LoginBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grainRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const grainCanvas = grainRef.current;
    if (!container || !canvas || !grainCanvas) return;

    const root: HTMLDivElement = container;
    const surface: HTMLCanvasElement = canvas;
    const grainSurface: HTMLCanvasElement = grainCanvas;
    const ctx = surface.getContext("2d");
    const grainCtx = grainSurface.getContext("2d");
    if (!ctx || !grainCtx) return;
    const context: CanvasRenderingContext2D = ctx;
    const grainContext: CanvasRenderingContext2D = grainCtx;

    let frameId = 0;
    let nodes: Node[] = [];
    let canvasWidth = 0;
    let canvasHeight = 0;
    let displayWidth = 0;
    let displayHeight = 0;
    let frameCount = 0;

    const grainTileCanvas = document.createElement("canvas");
    grainTileCanvas.width = GRAIN_TILE;
    grainTileCanvas.height = GRAIN_TILE;
    const grainTileCtx = grainTileCanvas.getContext("2d");
    if (!grainTileCtx) return;
    const grainTileContext: CanvasRenderingContext2D = grainTileCtx;
    const grainTileImage = grainTileContext.createImageData(GRAIN_TILE, GRAIN_TILE);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function resize() {
      const size = getCanvasSize(root);
      canvasWidth = size.width;
      canvasHeight = size.height;
      displayWidth = size.displayWidth;
      displayHeight = size.displayHeight;

      surface.width = size.pixelWidth;
      surface.height = size.pixelHeight;
      surface.style.width = `${displayWidth}px`;
      surface.style.height = `${displayHeight}px`;
      context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);

      grainSurface.width = size.pixelWidth;
      grainSurface.height = size.pixelHeight;
      grainSurface.style.width = `${displayWidth}px`;
      grainSurface.style.height = `${displayHeight}px`;
      grainContext.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);

      nodes = createNodes(canvasWidth, canvasHeight);

      if (reducedMotion) {
        fillTvGrainTile(grainTileImage);
        grainTileContext.putImageData(grainTileImage, 0, 0);
        drawTvGrain(0, 0);
      }
    }

    function drawTvGrain(offsetX: number, offsetY: number) {
      if (!reducedMotion) {
        fillTvGrainTile(grainTileImage);
        grainTileContext.putImageData(grainTileImage, 0, 0);
      }

      const pattern = grainContext.createPattern(grainTileCanvas, "repeat");
      if (!pattern) return;

      grainContext.clearRect(0, 0, displayWidth, displayHeight);
      grainContext.save();
      grainContext.fillStyle = pattern;
      grainContext.translate(offsetX, offsetY);
      grainContext.fillRect(
        -offsetX,
        -offsetY,
        displayWidth + GRAIN_TILE,
        displayHeight + GRAIN_TILE,
      );
      grainContext.restore();
    }

    function draw() {
      const linkDistance = canvasHeight * LINK_DISTANCE_RATIO;

      context.fillStyle = "#070708";
      context.fillRect(0, 0, canvasWidth, canvasHeight);

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
            context.strokeStyle = `rgba(223, 255, 0, ${strength * 0.5})`;
            context.lineWidth = 1.15;
            context.beginPath();
            context.moveTo(Math.round(nodes[i].x), Math.round(nodes[i].y));
            context.lineTo(Math.round(nodes[j].x), Math.round(nodes[j].y));
            context.stroke();
          }
        }
      }

      for (const node of nodes) {
        context.fillStyle = "rgba(223, 255, 0, 1)";
        const size = 2;
        context.fillRect((node.x - size / 2) | 0, (node.y - size / 2) | 0, size, size);
      }

      const grainOffsetX = reducedMotion
        ? 0
        : (Math.random() * GRAIN_TILE) | 0;
      const grainOffsetY = reducedMotion
        ? 0
        : (Math.random() * GRAIN_TILE) | 0;

      frameCount += 1;
      if (
        reducedMotion ||
        frameCount === 1 ||
        frameCount % GRAIN_FRAME_INTERVAL === 0
      ) {
        drawTvGrain(grainOffsetX, grainOffsetY);
      }

      frameId = window.requestAnimationFrame(draw);
    }

    resize();
    draw();

    const observer = new ResizeObserver(resize);
    observer.observe(root);

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
      <canvas ref={grainRef} className="login-bg-tv-grain" />
      <div className="login-bg-dirt absolute inset-0" />
      <div className="login-bg-vignette absolute inset-0" />
    </div>
  );
}
