import { useRef, useEffect } from 'react';
import { TRACKS, MODE_NAMES } from '../constants';
import { FONT } from '../lcd-font';

const W = 128;
const H = 64;
const SCALE = 3;
const BG = '#0a1a0a';
const PRIMARY = '#00FF88';
const DIM = '#006633';

function drawChar(ctx, char, x, y, color) {
  const glyph = FONT[char] || FONT['?'] || FONT[' '];
  ctx.fillStyle = color;
  for (let row = 0; row < 7; row++) {
    const bits = glyph[row];
    for (let col = 0; col < 5; col++) {
      if (bits & (0x10 >> col)) {
        ctx.fillRect(x + col, y + row, 1, 1);
      }
    }
  }
}

function drawText(ctx, str, x, y, color) {
  for (let i = 0; i < str.length; i++) {
    drawChar(ctx, str[i], x + i * 6, y, color);
  }
}

function textWidth(str) {
  return str.length * 6;
}

export default function LcdDisplay({ state }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // ── Header ──
    drawText(ctx, 'CONGKAK::PROTO', 1, 0, DIM);

    // Separator
    ctx.fillStyle = DIM;
    ctx.fillRect(0, 8, W, 1);

    // ── Track + BPM line (y=10) ──
    const icon = state.playing ? '\u25B6' : '\u25A0';
    const trackName = TRACKS[state.selTrack]?.lbl || '???';
    const bpmStr = String(Math.round(state.bpm)) + ' BPM';

    drawChar(ctx, icon, 1, 10, PRIMARY);
    drawText(ctx, trackName, 9, 10, PRIMARY);
    drawText(ctx, bpmStr, W - textWidth(bpmStr) - 1, 10, PRIMARY);

    // ── Euclidean + Mode (y=19) ──
    const eucl = state.euclidean[state.selTrack];
    const hStr = String(eucl.hits).padStart(2, '0');
    const rStr = String(eucl.rotation).padStart(2, '0');
    const euclText = 'E(' + hStr + ',' + rStr + ')';
    const modeText = MODE_NAMES[state.mode];

    drawText(ctx, euclText, 1, 19, PRIMARY);
    drawText(ctx, modeText, W - textWidth(modeText) - 1, 19, PRIMARY);

    // ── Pattern bars (y=28) ── 8 tracks, 2px each = 16px ──
    const stepW = 7; // 7px filled + 1px gap = 8px per step, 16 * 8 = 128
    for (let t = 0; t < 8; t++) {
      const rowY = 28 + t * 2;
      const isSel = t === state.selTrack;
      const trackSeq = state.seq[t];

      for (let s = 0; s < 16; s++) {
        const sx = s * 8;
        if (trackSeq[s]) {
          ctx.fillStyle = isSel ? PRIMARY : DIM;
          ctx.fillRect(sx, rowY, stepW, 2);
        } else if (isSel) {
          // Dim outline for inactive steps on selected track
          ctx.fillStyle = DIM;
          ctx.fillRect(sx, rowY, stepW, 1);
          ctx.fillRect(sx, rowY + 1, stepW, 1);
        }
      }

      // Current step playhead on selected track
      if (isSel && state.playing && state.curStep >= 0) {
        ctx.fillStyle = PRIMARY;
        ctx.fillRect(state.curStep * 8, rowY, stepW, 2);
        // Bright border on current step
        ctx.fillStyle = BG;
        ctx.fillRect(state.curStep * 8 + 1, rowY, stepW - 2, 1);
      }
    }

    // Step position indicator line (y=44)
    if (state.playing && state.curStep >= 0) {
      ctx.fillStyle = PRIMARY;
      ctx.fillRect(state.curStep * 8, 44, stepW, 1);
    }

    // ── PAT + VOL (y=48) ──
    const patName = state.curPatName[state.selTrack] || '\u2014';
    const patText = 'PAT:' + patName;
    const volVal = String(Math.round(state.knobValues[8]));
    const volText = 'VOL:' + volVal;

    drawText(ctx, patText, 1, 48, PRIMARY);
    drawText(ctx, volText, W - textWidth(volText) - 1, 48, PRIMARY);

    // ── STEP + MIDI (y=56) ──
    const stepNum = state.playing && state.curStep >= 0
      ? String(state.curStep + 1).padStart(2, '0')
      : '--';
    const stepText = 'STEP:' + stepNum + '/16';
    const midiText = 'MIDI:' + (state.midiAccess ? 'OK' : '--');

    drawText(ctx, stepText, 1, 56, DIM);
    drawText(ctx, midiText, W - textWidth(midiText) - 1, 56, DIM);

  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{
        width: W * SCALE,
        height: H * SCALE,
        imageRendering: 'pixelated',
        background: BG,
        borderRadius: 4,
      }}
    />
  );
}
