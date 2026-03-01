import { TRACKS } from '../constants';
import Panel from './Panel';

const CX = 150, CY = 150;
const R_OUTER = 135, R_INNER = 44;
const RING_SPACING = (R_OUTER - R_INNER) / 7;

function stepAngle(step) {
  return (step / 16) * Math.PI * 2 - Math.PI / 2;
}

function pos(r, step) {
  const a = stepAngle(step);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

export default function EuclideanRing({
  seq, curStep, selTrack, euclidean, curPatName, bpm,
  onToggleStep, onSelectTrack,
}) {
  const selEucl = euclidean[selTrack];

  return (
    <Panel className="rounded-lg p-3 flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-mono tracking-widest text-dim uppercase">
          EUCLIDEAN
        </span>
        <span className="text-[10px] font-mono text-dim">
          {TRACKS[selTrack].s}: E({selEucl.hits},{selEucl.rotation})
          {selEucl.manual ? ' *' : ''}
          {' · '}{bpm}bpm
        </span>
      </div>

      {/* SVG Ring */}
      <svg
        viewBox="0 0 300 300"
        className="w-full max-w-[320px]"
        style={{ aspectRatio: '1' }}
      >
        {/* Ring paths */}
        {TRACKS.map((tr, ri) => {
          const r = R_OUTER - ri * RING_SPACING;
          const isSel = ri === selTrack;
          return (
            <circle
              key={`ring-${ri}`}
              cx={CX} cy={CY} r={r}
              fill="none"
              stroke={tr.col}
              strokeWidth={isSel ? 1.5 : 0.5}
              opacity={isSel ? 0.35 : 0.1}
            />
          );
        })}

        {/* Playhead line */}
        {curStep >= 0 && (() => {
          const a = stepAngle(curStep);
          return (
            <line
              x1={CX} y1={CY}
              x2={CX + (R_OUTER + 6) * Math.cos(a)}
              y2={CY + (R_OUTER + 6) * Math.sin(a)}
              stroke="white"
              strokeWidth={0.8}
              opacity={0.15}
            />
          );
        })()}

        {/* Step nodes */}
        {TRACKS.map((tr, ri) => {
          const r = R_OUTER - ri * RING_SPACING;
          const isSel = ri === selTrack;
          return Array.from({ length: 16 }, (_, si) => {
            const on = seq[ri][si];
            const cur = si === curStep;
            const { x, y } = pos(r, si);
            const nodeR = isSel
              ? (on ? 6 : 3.5)
              : (on ? 4.5 : 2);

            return (
              <circle
                key={`n-${ri}-${si}`}
                cx={x} cy={y} r={nodeR}
                fill={on ? tr.col : '#333'}
                fillOpacity={on ? (isSel ? 0.9 : 0.5) : (isSel ? 0.25 : 0.08)}
                stroke={cur ? 'white' : 'none'}
                strokeWidth={cur ? (isSel ? 2 : 1) : 0}
                strokeOpacity={cur ? 0.8 : 0}
                style={{ cursor: isSel ? 'pointer' : 'default', transition: 'fill-opacity 0.05s' }}
                onClick={() => isSel ? onToggleStep(si) : onSelectTrack(ri)}
              />
            );
          });
        })}

        {/* Current step glow on selected track */}
        {curStep >= 0 && (() => {
          const r = R_OUTER - selTrack * RING_SPACING;
          const { x, y } = pos(r, curStep);
          const on = seq[selTrack][curStep];
          return on ? (
            <circle
              cx={x} cy={y} r={8}
              fill="none"
              stroke={TRACKS[selTrack].col}
              strokeWidth={1.5}
              opacity={0.4}
            />
          ) : null;
        })()}

        {/* Track labels at 270° (left side) */}
        {TRACKS.map((tr, ri) => {
          const r = R_OUTER - ri * RING_SPACING;
          const labelAngle = Math.PI; // 9 o'clock
          const lx = CX + (r + 14) * Math.cos(labelAngle);
          const ly = CY + (r + 14) * Math.sin(labelAngle);
          const isSel = ri === selTrack;
          return (
            <text
              key={`lbl-${ri}`}
              x={lx} y={ly}
              textAnchor="end"
              dominantBaseline="central"
              fill={tr.col}
              fontSize={isSel ? 8 : 6}
              fontFamily="'IBM Plex Mono', monospace"
              fontWeight={isSel ? 700 : 400}
              opacity={isSel ? 0.9 : 0.3}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectTrack(ri)}
            >
              {tr.s}
            </text>
          );
        })}

        {/* Center info */}
        <text
          x={CX} y={CY - 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill={TRACKS[selTrack].col}
          fontSize={16}
          fontFamily="'IBM Plex Mono', monospace"
          fontWeight={700}
        >
          {TRACKS[selTrack].s}
        </text>
        <text
          x={CX} y={CY + 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#6B5040"
          fontSize={11}
          fontFamily="'IBM Plex Mono', monospace"
        >
          E({selEucl.hits},{selEucl.rotation})
        </text>
        <text
          x={CX} y={CY + 22}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#4A4A4A"
          fontSize={9}
          fontFamily="'IBM Plex Mono', monospace"
        >
          {curPatName[selTrack]}
        </text>
      </svg>
    </Panel>
  );
}
