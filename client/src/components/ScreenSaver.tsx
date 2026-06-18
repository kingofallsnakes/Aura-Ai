import { useEffect, useState, useRef } from 'react';

export default function ScreenSaver() {
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 10 seconds idle timeout
  const IDLE_TIMEOUT = 10000;

  const resetTimer = () => {
    setIsActive(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      console.log('ScreenSaver Activated!');
      setIsActive(true);
    }, IDLE_TIMEOUT);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetTimer();

    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // Ignore microscopic mouse jitters (less than 5 pixels)
      if (Math.abs(e.clientX - lastX) < 5 && Math.abs(e.clientY - lastY) < 5) return;
      lastX = e.clientX;
      lastY = e.clientY;
      resetTimer();
    };

    const handleInteraction = () => resetTimer();

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    const events = ['mousedown', 'keydown', 'touchstart', 'wheel'];
    events.forEach((evt) => window.addEventListener(evt, handleInteraction, { passive: true }));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      events.forEach((evt) => window.removeEventListener(evt, handleInteraction));
    };
  }, []);

  return (
    <div 
      className={`fixed inset-0 bg-black/95 backdrop-blur-sm z-[9999] flex items-center justify-center transition-opacity duration-1000 ${
        isActive ? 'opacity-100 pointer-events-auto cursor-none' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Neon Title */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <h1 className="neon-text font-black tracking-[0.2em] text-[10vw] md:text-[8vw] uppercase select-none">
          Aura-Ai
        </h1>
      </div>

      {/* Internal CSS for the precise glowing effect */}
      <style dangerouslySetInnerHTML={{ __html: `
        .neon-text {
          color: #fff;
          text-shadow: 
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 20px #8b5cf6,
            0 0 40px #8b5cf6,
            0 0 80px #8b5cf6,
            0 0 100px #8b5cf6,
            0 0 120px #8b5cf6;
          animation: neon-pulse 4s ease-in-out infinite alternate;
        }

        @keyframes neon-pulse {
          0%, 100% {
            text-shadow: 
              0 0 5px #fff,
              0 0 10px #fff,
              0 0 20px #8b5cf6,
              0 0 40px #8b5cf6,
              0 0 80px #8b5cf6,
              0 0 100px #8b5cf6,
              0 0 120px #8b5cf6;
            transform: scale(1);
          }
          50% {
            text-shadow: 
              0 0 2px #fff,
              0 0 5px #fff,
              0 0 10px #8b5cf6,
              0 0 20px #8b5cf6,
              0 0 40px #8b5cf6,
              0 0 60px #8b5cf6,
              0 0 80px #8b5cf6;
            transform: scale(0.97);
          }
        }
      `}} />
    </div>
  );
}
