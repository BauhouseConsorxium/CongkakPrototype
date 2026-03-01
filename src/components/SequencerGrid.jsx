import { TRACKS } from '../constants';

export default function SequencerGrid({ seq, curStep, selTrack, curPatName, bpm }) {
  return (
    <div className="bg-surface-1 rounded-[10px] p-3">
      <div className="text-[10px] tracking-[3px] text-dim mb-2 font-mono">
        SEQUENCER &middot; <span>{TRACKS[selTrack].s}: {curPatName[selTrack]} &middot; {bpm}bpm</span>
      </div>
      <div className="flex flex-col gap-[3px]">
        {TRACKS.map((tr, ri) => (
          <div key={tr.id} className="flex items-center">
            <div
              className="w-[42px] text-[10px] tracking-[1px] text-right pr-2 font-mono shrink-0"
              style={{ color: tr.col, opacity: ri === selTrack ? 1 : 0.4 }}
            >
              {tr.s}
            </div>
            <div className="grid grid-cols-[repeat(16,1fr)] gap-[2px] flex-1">
              {Array.from({ length: 16 }, (_, s) => {
                const on = seq[ri][s];
                const cur = s === curStep;
                return (
                  <div
                    key={s}
                    className={`aspect-[1.8] rounded-[2px] border transition-all duration-75 ${
                      cur ? 'border-white/20' : on ? 'border-transparent' : 'border-[#33333388]'
                    }`}
                    style={{
                      background: on
                        ? tr.col + (cur ? 'aa' : '44')
                        : '#333333',
                      boxShadow: cur ? 'inset 0 0 8px rgba(255,255,255,0.15)' : undefined,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
