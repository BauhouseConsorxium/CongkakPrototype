import { TRACKS } from '../constants';
import Panel from './Panel';
import { colorAlpha } from '../utils/color';

export default function TrackBar({ selTrack, onSetTrack, samples }) {
  return (
    <Panel className="flex gap-1.5">
      {TRACKS.map((tr, i) => {
        const sel = i === selTrack;
        const hasSample = samples && samples[i];
        return (
          <button
            key={tr.id}
            onClick={() => onSetTrack(i)}
            className={`relative flex-1 py-2 text-center rounded-md text-[11px] font-semibold tracking-[1px] font-mono border-2 transition-all duration-100 ${
              sel ? 'scale-105' : ''
            }`}
            style={{
              background: colorAlpha(tr.col, sel ? '33' : '0d'),
              color: sel ? tr.col : colorAlpha(tr.col, '55'),
              borderColor: sel ? tr.col : 'transparent',
            }}
          >
            {tr.s}
            {hasSample && (
              <span
                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                style={{ background: '#FF4444' }}
              />
            )}
          </button>
        );
      })}
    </Panel>
  );
}
