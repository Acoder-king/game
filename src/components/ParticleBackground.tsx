import React, { useEffect, useRef } from 'react';

export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class definition
    class Particle {
      x: number = 0;
      y: number = 0;
      size: number = 0;
      speedX: number = 0;
      speedY: number = 0;
      alpha: number = 0;
      decay: number = 0;
      color: string = '';

      constructor() {
        this.reset();
        this.y = Math.random() * height; // start distributed
      }

      reset() {
        this.x = Math.random() * width;
        this.y = height + 10;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.speedY = -(Math.random() * 0.6 + 0.2); // upward drift
        this.alpha = Math.random() * 0.5 + 0.2;
        this.decay = Math.random() * 0.003 + 0.001;
        // Monochrome White, Silver, and Slate color palette
        const colors = [
          'rgba(255, 255, 255, ', // Pure White
          'rgba(241, 245, 249, ', // Slate-100
          'rgba(226, 232, 240, ', // Slate-200
          'rgba(148, 163, 184, '  // Slate-400
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= this.decay;

        if (this.alpha <= 0 || this.y < -10 || this.x < -10 || this.x > width + 10) {
          this.reset();
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.save();
        c.shadowBlur = this.size * 3;
        c.shadowColor = '#ffffff';
        c.fillStyle = `${this.color}${this.alpha})`;
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }

    const particles: Particle[] = Array.from({ length: 45 }, () => new Particle());

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      // Create majestic spotlight linear lines background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Spotlight glow center
      const gradient = ctx.createRadialGradient(
        width / 2,
        height * 0.25,
        15,
        width / 2,
        height * 0.25,
        width * 0.85
      );
      gradient.addColorStop(0, '#ffffff');    // Luminous pure white core
      gradient.addColorStop(0.12, '#cbd5e1');  // Sleek silver light
      gradient.addColorStop(0.35, '#1e293b');  // Deep slate transition
      gradient.addColorStop(0.75, '#000000');  // True velvet black boundary
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw light beams
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      
      // Left spotlight beam
      ctx.beginPath();
      ctx.moveTo(width * 0.15, 0);
      ctx.lineTo(width * 0.45, height);
      ctx.lineTo(width * 0.55, height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();

      // Right spotlight beam
      ctx.beginPath();
      ctx.moveTo(width * 0.85, 0);
      ctx.lineTo(width * 0.55, height);
      ctx.lineTo(width * 0.45, height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fill();
      ctx.restore();

      // Render drifting dust particles
      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none -z-10 bg-[#000000]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
