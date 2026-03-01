import { useRef, useEffect, useCallback } from 'react';

const BG = '#0a1a0a';
const PRIMARY = '#00FF88';
const DIM = '#003318';
const MARKER = '#FF4444';
const CANVAS_H = 80;

export default function SampleEditor({ trackIndex, trackColor, sample, recording, onStartRec, onStopRec, onClearSample, onLoadFile, onSetRegion }) {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const dragging = useRef(null); // 'start' | 'end' | null

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    if (recording) {
      ctx.fillStyle = MARKER;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const dot = Date.now() % 1000 < 500 ? ' \u25CF' : '';
      ctx.fillText('RECORDING...' + dot, w / 2, h / 2);
      return;
    }

    if (!sample) {
      ctx.fillStyle = DIM;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NO SAMPLE', w / 2, h / 2);
      return;
    }

    const { waveform, region } = sample;
    const barW = w / waveform.length;
    const midY = h / 2;

    for (let i = 0; i < waveform.length; i++) {
      const x = i * barW;
      const norm = i / waveform.length;
      const inRegion = norm >= region.start && norm <= region.end;
      const amp = waveform[i] * (midY - 4);

      ctx.fillStyle = inRegion ? PRIMARY : DIM;
      ctx.fillRect(x, midY - amp, Math.max(barW - 0.5, 1), amp * 2 || 1);
    }

    // Start marker
    const startX = Math.round(region.start * w);
    ctx.fillStyle = MARKER;
    ctx.fillRect(startX, 0, 2, h);

    // End marker
    const endX = Math.round(region.end * w);
    ctx.fillRect(endX - 1, 0, 2, h);
  }, [sample, recording]);

  useEffect(() => {
    draw();
    if (recording) {
      const id = setInterval(draw, 400);
      return () => clearInterval(id);
    }
  }, [draw, recording]);

  const handlePointerDown = useCallback((e) => {
    if (!sample) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const { region } = sample;
    const startDist = Math.abs(x - region.start);
    const endDist = Math.abs(x - region.end);
    dragging.current = startDist < endDist ? 'start' : 'end';
    canvas.setPointerCapture(e.pointerId);
  }, [sample]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current || !sample) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const { region } = sample;

    if (dragging.current === 'start') {
      const newStart = Math.min(x, region.end - 0.02);
      onSetRegion(trackIndex, Math.max(0, newStart), region.end);
    } else {
      const newEnd = Math.max(x, region.start + 0.02);
      onSetRegion(trackIndex, region.start, Math.min(1, newEnd));
    }
  }, [sample, trackIndex, onSetRegion]);

  const handlePointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[10px] tracking-[1px]" style={{ color: trackColor }}>SAMPLE</span>
        {recording ? (
          <button
            onClick={() => onStopRec(trackIndex)}
            className="font-mono text-[9px] tracking-[0.5px] px-1.5 py-0.5 rounded border cursor-pointer transition-colors duration-100"
            style={{ color: MARKER, borderColor: MARKER, background: 'rgba(255,68,68,0.1)' }}
          >
            STOP
          </button>
        ) : (
          <>
            <button
              onClick={onStartRec}
              className="font-mono text-[9px] tracking-[0.5px] px-1.5 py-0.5 rounded border cursor-pointer transition-colors duration-100"
              style={{ color: MARKER, borderColor: '#661a1a', background: 'transparent' }}
            >
              REC
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="font-mono text-[9px] tracking-[0.5px] px-1.5 py-0.5 rounded border cursor-pointer transition-colors duration-100"
              style={{ color: PRIMARY, borderColor: '#004d26', background: 'transparent' }}
            >
              LOAD
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.wav,.mp3,.ogg,.flac,.aif,.aiff"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onLoadFile(trackIndex, file);
                e.target.value = '';
              }}
            />
          </>
        )}
        {sample && !recording && (
          <>
            <button
              onClick={() => onClearSample(trackIndex)}
              className="font-mono text-[9px] tracking-[0.5px] px-1.5 py-0.5 rounded border cursor-pointer transition-colors duration-100"
              style={{ color: '#666', borderColor: '#333', background: 'transparent' }}
            >
              CLEAR
            </button>
            <span className="font-mono text-[9px]" style={{ color: DIM }}>
              {sample.duration.toFixed(1)}s
            </span>
          </>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={384}
        height={CANVAS_H}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          width: '100%',
          height: CANVAS_H,
          borderRadius: 4,
          background: BG,
          cursor: sample ? 'col-resize' : 'default',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
