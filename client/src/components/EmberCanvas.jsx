import React, { useEffect, useRef } from 'react';

export default function EmberCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // Create glowing embers
    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 200, // Spawn below viewport
        radius: Math.random() * 2 + 1,
        speedY: -(Math.random() * 1.0 + 0.5),
        speedX: (Math.random() * 0.6 - 0.3),
        maxHeight: Math.random() * (canvas.height * 0.7), // height at which it dies
        colorHue: Math.random() > 0.4 ? 20 : 5, // orange (20) or red (5)
        opacity: Math.random() * 0.5 + 0.3,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        ctx.beginPath();
        // Create radial gradient for a glow effect
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        gradient.addColorStop(0, `hsla(${p.colorHue}, 100%, 65%, ${p.opacity})`);
        gradient.addColorStop(0.3, `hsla(${p.colorHue}, 100%, 50%, ${p.opacity * 0.6})`);
        gradient.addColorStop(1, `hsla(${p.colorHue}, 100%, 40%, 0)`);
        
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Move particle
        p.y += p.speedY;
        p.x += p.speedX;
        
        // Sway horizontally
        p.speedX += (Math.random() * 0.1 - 0.05);
        p.speedX = Math.max(-1, Math.min(1, p.speedX)); // Clamp sway

        // Calculate opacity based on position to fade out near the top
        const relativeHeight = p.y / canvas.height;
        p.opacity = Math.max(0, relativeHeight * 0.7);

        // Reset if it goes off top or fades out completely
        if (p.y < 0 || p.opacity <= 0.02) {
          p.y = canvas.height + Math.random() * 100;
          p.x = Math.random() * canvas.width;
          p.opacity = Math.random() * 0.5 + 0.3;
          p.speedX = (Math.random() * 0.6 - 0.3);
          p.speedY = -(Math.random() * 1.0 + 0.5);
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-10"
    />
  );
}
