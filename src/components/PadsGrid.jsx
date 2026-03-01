import { useState, useCallback } from 'react';
import { TRACKS, TRACK_KEYS, SOUND_PRESETS, TRACK_PATTERNS, LEARN_BORDER } from '../constants';
import Panel from './Panel';
import { colorAlpha } from '../utils/color';

export default function PadsGrid({ mode, selTrack, seq, activePatPerTrack, maps, learn, onTriggerPad, onLearnClick }) {
  const [flashIdx, setFlashIdx] = useState(-1);

  const handlePad = useCallback((i) => {
    if (learn) {
      onLearnClick('pad', i);
      return;
    }
    onTriggerPad(i);
    if (mode !== 0) {
      setFlashIdx(i);
      setTimeout(() => setFlashIdx(-1), 120);
    }
  }, [learn, mode, onTriggerPad, onLearnClick]);

  return (
    <Panel>
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 16 }, (_, i) => {
          const isFlash = flashIdx === i;
          let bg, borderColor, col, lbl, sub = '';

          if (mode === 0) {
            const isOn = seq[selTrack][i];
            const tc = TRACKS[selTrack].col;
            bg = isOn ? colorAlpha(tc, '44') : colorAlpha(tc, '0d');
            borderColor = isOn ? tc : colorAlpha(tc, '22');
            col = isOn ? tc : '#4A4A4A';
            lbl = String(i + 1);
            sub = isOn ? '\u25CF' : '';
          } else if (mode === 1) {
            const tr = TRACKS[i % 8];
            bg = colorAlpha(tr.col, '1a');
            borderColor = colorAlpha(tr.col, '33');
            col = tr.col;
            lbl = tr.s;
            sub = i < 8 ? tr.lbl : '';
          } else if (mode === 2) {
            const sp = SOUND_PRESETS[i];
            bg = colorAlpha('#B8A080', '0d');
            borderColor = colorAlpha('#B8A080', '22');
            col = '#B8A080';
            lbl = sp ? sp.n : '\u2014';
          } else {
            const key = TRACK_KEYS[selTrack];
            const pats = TRACK_PATTERNS[key];
            const pat = pats?.[i];
            const isActive = activePatPerTrack[selTrack] === i;
            const tc = TRACKS[selTrack].col;
            bg = isActive ? colorAlpha(tc, '22') : colorAlpha(tc, '0d');
            borderColor = isActive ? tc : colorAlpha(tc, '22');
            col = isActive ? tc : '#4A4A4A';
            lbl = pat ? pat.n : '\u2014';
            if (pat) {
              sub = pat.p.map(v => v ? '\u25CF' : '\u00B7').join('');
            } else {
              sub = TRACKS[selTrack].s;
            }
          }

          return (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handlePad(i); }}
              onTouchStart={(e) => { e.preventDefault(); handlePad(i); }}
              className={`aspect-[1.15] rounded-lg cursor-pointer flex flex-col items-center justify-center transition-all duration-75 relative overflow-hidden select-none font-mono border-2 ${
                isFlash ? 'scale-[0.92] brightness-[1.3]' : ''
              } ${
                learn ? LEARN_BORDER : ''
              }`}
              style={{
                background: bg,
                borderColor: learn ? undefined : borderColor,
              }}
            >
              <div className="text-xs font-bold tracking-[1px] pointer-events-none z-[1]" style={{ color: col }}>
                {lbl}
              </div>
              {mode === 3 && sub ? (
                <div className="text-[7px] opacity-50 pointer-events-none z-[1] mt-0.5 tracking-[0] max-w-[90%] overflow-hidden text-ellipsis whitespace-nowrap">
                  {sub}
                </div>
              ) : (
                <div className="text-[8px] opacity-40 pointer-events-none z-[1] mt-0.5 tracking-[0.5px] max-w-[90%] overflow-hidden text-ellipsis whitespace-nowrap">
                  {sub}
                </div>
              )}
              {maps.pads[i] !== null && (
                <div className="text-[8px] text-c1 z-[1]">N{maps.pads[i]}</div>
              )}
              {mode === 0 && seq[selTrack][i] && (
                <div
                  className="absolute bottom-0.5 left-[3px] right-[3px] h-0.5 rounded-sm opacity-60"
                  style={{ background: TRACKS[selTrack].col }}
                />
              )}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
