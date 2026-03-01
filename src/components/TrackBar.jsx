import { TRACKS } from '../constants';

export default function TrackBar({ selTrack, onSetTrack }) {
  return (
    <div className="flex gap-1.5 p-2.5 bg-surface-1 rounded-[10px]">
      {TRACKS.map((tr, i) => {
        const sel = i === selTrack;
        return (
          <button
            key={tr.id}
            onClick={() => onSetTrack(i)}
            className={`flex-1 py-2 text-center rounded-md text-[11px] font-semibold tracking-[1px] font-mono border-2 transition-all duration-100 ${
              sel ? 'scale-105' : ''
            }`}
            style={{
              background: tr.col + (sel ? '33' : '0d'),
              color: sel ? tr.col : tr.col + '55',
              borderColor: sel ? tr.col : 'transparent',
            }}
          >
            {tr.s}
          </button>
        );
      })}
    </div>
  );
}
