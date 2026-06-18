import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

export default function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useSettingsStore();

  const effectiveTheme = theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const particles: { x: number; y: number; vx: number; vy: number; radius: number }[] = [];
    const NUM_PARTICLES = window.innerWidth < 768 ? 40 : 80;
    const CONNECT_DISTANCE = 150;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Initialize particles
    for (let i = 0; i < NUM_PARTICLES; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.5 + 0.5
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isLight = document.documentElement.classList.contains('light') || effectiveTheme === 'light';
      const particleColor = isLight ? 'rgba(124, 58, 237, 0.4)' : 'rgba(139, 92, 246, 0.4)';
      const lineColor = isLight ? '124, 58, 237' : '139, 92, 246';

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();

        // Draw connecting lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < CONNECT_DISTANCE * CONNECT_DISTANCE) {
            const distance = Math.sqrt(distSq);
            const opacity = 1 - (distance / CONNECT_DISTANCE);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${lineColor}, ${opacity * 0.15})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [effectiveTheme]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
