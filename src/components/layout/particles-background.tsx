'use client';

// ============================================================
//  ParticlesBackground — subtle constellation behind the public
//  site (canvas). Theme-aware (reads --accent / --muted tokens),
//  performance-guarded, reduced-motion safe.
//  Fixed, full-viewport, behind content (z-0), pointer-events none.
//  Masked to fade out toward the bottom (see `fade` below) so it stays
//  calm over content-heavy sections while emphasising the hero.
// ============================================================

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let raf = 0;
    const mouse = { x: -9999, y: -9999 };

    // ── theme colours (read from CSS tokens; update on theme change) ──
    let accent: [number, number, number] = [34, 211, 238];
    let dot: [number, number, number] = [139, 152, 169];
    function readColors() {
      const styles = getComputedStyle(document.documentElement);
      const a = styles.getPropertyValue('--accent').trim();
      const m = styles.getPropertyValue('--muted').trim();
      if (a.startsWith('#')) accent = hexToRgb(a);
      if (m.startsWith('#')) dot = hexToRgb(m);
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = width + 'px';
      canvas!.style.height = height + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(90, Math.floor(width / 16));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    }

    const LINK = 130; // px distance to draw a connecting line
    const NEAR = 120; // px distance for mouse highlight

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      // move
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }

      // connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            const alpha = 0.16 * (1 - d / LINK);
            ctx!.strokeStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},${alpha})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      // dots
      for (const p of particles) {
        const near = Math.hypot(p.x - mouse.x, p.y - mouse.y) < NEAR;
        ctx!.fillStyle = near
          ? `rgba(${accent[0]},${accent[1]},${accent[2]},0.9)`
          : `rgba(${dot[0]},${dot[1]},${dot[2]},0.55)`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, near ? 2.4 : 1.6, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function loop() {
      draw();
      raf = requestAnimationFrame(loop);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (prefersReduced) {
        draw(); // single static frame
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    }

    function onMove(e: PointerEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    // theme change → re-read colours
    const observer = new MutationObserver(readColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (prefersReduced) draw();
      }, 150);
    }

    readColors();
    resize();
    start();

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // The fade promised in the header comment lives here. Without it the
  // constellation renders at full strength to the bottom of the viewport,
  // which reads as busy texture over content — and as the only thing on
  // screen when a page has no sections to render.
  const fade = 'linear-gradient(to bottom, black 0%, black 30%, transparent 80%)';

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ WebkitMaskImage: fade, maskImage: fade }}
    />
  );
}
