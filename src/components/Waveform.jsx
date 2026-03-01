import { useRef, useEffect } from 'react';
import { getAnalyser } from '../audio';

export default function Waveform() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    let running = true;

    function draw() {
      if (!running) return;
      animRef.current = requestAnimationFrame(draw);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);

      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      ctx.fillStyle = 'rgba(10,10,10,0.85)';
      ctx.fillRect(0, 0, W, H);

      const analyser = getAnalyser();
      if (!analyser) return;

      const N = analyser.frequencyBinCount;
      const data = new Uint8Array(N);
      analyser.getByteTimeDomainData(data);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#00FF88';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#00FF88';
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const y = (data[i] / 128) * H / 2;
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * W / N, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    draw();
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="h-11 bg-surface-1 rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
