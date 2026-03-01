import { TRACKS } from '../constants';
import Panel from './Panel';
import { colorAlpha } from '../utils/color';

export default function TrackBar({ selTrack, onSetTrack }) {
  return (
    <Panel className="flex gap-1.5">
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
              background: colorAlpha(tr.col, sel ? '33' : '0d'),
              color: sel ? tr.col : colorAlpha(tr.col, '55'),
              borderColor: sel ? tr.col : 'transparent',
            }}
          >
            {tr.s}
          </button>
        );
      })}
    </Panel>
  );
}
