import { useRef, useCallback } from 'react';
import { initAudio } from '../audio';

export default function Knob({ def, value, index, mapped, learn, onValueChange, onLearnClick }) {
  const dragRef = useRef(null);

  const pct = Math.max(0, Math.min(1, (value - def.min) / (def.max - def.min)));
  const ang = -135 + pct * 270;
  const R = 18, cx = 21, cy = 21;

  const xy = (a) => ({
    x: cx + R * Math.cos((a - 90) * Math.PI / 180),
    y: cy + R * Math.sin((a - 90) * Math.PI / 180),
  });

  const s1 = xy(-135);
  const e1 = xy(ang);
  const e2 = xy(135);
  const largeArc = pct * 270 > 180 ? 1 : 0;

  const displayVal = def.fmt
    ? def.fmt(value)
    : value >= 100
      ? Math.round(value)
      : value < 10
        ? value.toFixed(2)
        : Math.round(value);

  const onMouseDown = useCallback((e) => {
    initAudio();
    e.preventDefault();
    const startY = e.clientY;
    const startVal = value;

    const onMouseMove = (me) => {
      const newVal = Math.max(
        def.min,
        Math.min(def.max, startVal + (startY - me.clientY) * ((def.max - def.min) / 200))
      );
      onValueChange(index, newVal);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dragRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dragRef.current = { onMouseMove, onMouseUp };
  }, [value, def.min, def.max, index, onValueChange]);

  return (
    <div
      className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all duration-200 ${
        learn
          ? 'border-c1 animate-[learn-pulse_1s_infinite]'
          : mapped !== null
            ? 'border-[rgba(0,221,119,0.12)]'
            : 'border-transparent'
      }`}
      onClick={onLearnClick}
    >
      <div className="w-[52px] h-[52px] relative cursor-grab" onMouseDown={onMouseDown}>
        <svg viewBox="0 0 42 42" className="w-full h-full">
          <circle cx="21" cy="21" r="18" fill="none" stroke="#333333" strokeWidth="2.5" />
          <path
            d={`M${s1.x},${s1.y} A18,18 0 1,1 ${e2.x},${e2.y}`}
            fill="none" stroke="#4A4A4A" strokeWidth="2.5" strokeLinecap="round"
          />
          <path
            d={`M${s1.x},${s1.y} A18,18 0 ${largeArc},1 ${e1.x},${e1.y}`}
            fill="none" stroke={def.col} strokeWidth="2.5" strokeLinecap="round"
          />
          <circle cx="21" cy="21" r="11" fill="#333333" />
        </svg>
        <div
          className="absolute top-[3px] left-1/2 w-1 h-1 rounded-full -ml-0.5"
          style={{
            background: def.col,
            boxShadow: `0 0 5px ${def.col}`,
            transformOrigin: 'center 18px',
            transform: `rotate(${ang}deg)`,
          }}
        />
      </div>
      <div className="font-mono text-xs font-semibold" style={{ color: def.col }}>
        {displayVal}
      </div>
      <div className="text-[8px] tracking-[1.5px] text-dim uppercase">{def.lbl}</div>
      {mapped !== null && (
        <div className="text-[8px] text-c1 font-mono">CC{mapped}</div>
      )}
    </div>
  );
}
