import { useRef, useEffect, useState } from 'react';
import { TRACKS, MODE_NAMES } from '../constants';
import {
  FONT,
  WAYANG_DANCE_A, WAYANG_DANCE_B, WAYANG_DANCE_C,
  WAYANG_RAISED, WAYANG_ECSTATIC,
} from '../lcd-font';

const W = 128;
const H = 64;
const SCALE = 3;
const BG = '#0a1a0a';
const PRIMARY = '#00FF88';
const DIM = '#006633';
const VERY_DIM = '#003318';

const DANCE_POSES = [WAYANG_DANCE_A, WAYANG_DANCE_B, WAYANG_DANCE_C];
const INTRO_LAST = 5;
const INTRO_DURATIONS = [300, 180, 180, 180, 250, 350];

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

function drawSprite(ctx, data, x, y, color, width) {
  ctx.fillStyle = color;
  const topBit = 1 << (width - 1);
  for (let row = 0; row < data.length; row++) {
    const bits = data[row];
    for (let col = 0; col < width; col++) {
      if (bits & (topBit >> col)) {
        ctx.fillRect(x + col, y + row, 1, 1);
      }
    }
  }
}

function drawSpriteScaled(ctx, data, x, y, color, width, scale) {
  ctx.fillStyle = color;
  const topBit = 1 << (width - 1);
  for (let row = 0; row < data.length; row++) {
    const bits = data[row];
    for (let col = 0; col < width; col++) {
      if (bits & (topBit >> col)) {
        ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
      }
    }
  }
}

function drawDottedLine(ctx, y, color) {
  ctx.fillStyle = color;
  for (let x = 0; x < W; x += 2) {
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawIntro(ctx, frame) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const title = 'CONGKAK::PROTO';
  const titleW = textWidth(title);
  const titleX = Math.round((W - titleW) / 2);

  // Frame 0 — title centered on screen
  if (frame === 0) {
    drawText(ctx, title, titleX, 28, DIM);
    // Dash-dot borders top and bottom
    drawDottedLine(ctx, 22, VERY_DIM);
    drawDottedLine(ctx, 37, VERY_DIM);
    return;
  }

  // Frames 1–4 — big 3x wayang dancing, title at top
  if (frame >= 1 && frame <= 4) {
    const color = frame === 4 ? PRIMARY : DIM;
    const titleColor = frame === 4 ? PRIMARY : DIM;

    drawText(ctx, title, titleX, 2, titleColor);
    drawDottedLine(ctx, 10, VERY_DIM);

    const poses = [WAYANG_DANCE_A, WAYANG_DANCE_B, WAYANG_DANCE_C, WAYANG_ECSTATIC];
    const pose = poses[frame - 1];
    const sc = 3;
    const sw = 7 * sc;  // 21
    const sh = 11 * sc; // 33
    const sx = Math.round((W - sw) / 2);
    const sy = 15;

    drawSpriteScaled(ctx, pose, sx, sy, color, 7, sc);
    drawDottedLine(ctx, sy + sh + 2, VERY_DIM);

    // Progress dots at bottom
    for (let i = 0; i < 4; i++) {
      const dx = Math.round(W / 2) - 7 + i * 4;
      ctx.fillStyle = i <= frame - 1 ? (frame === 4 ? PRIMARY : DIM) : VERY_DIM;
      ctx.fillRect(dx, 56, 2, 2);
    }
    return;
  }

  // Frame 5 — all 16 figures ecstatic + "▶ PLAY"
  if (frame === 5) {
    drawText(ctx, title, titleX, 2, PRIMARY);
    drawDottedLine(ctx, 10, DIM);

    for (let s = 0; s < 16; s++) {
      drawSprite(ctx, WAYANG_ECSTATIC, s * 8, 18, PRIMARY, 7);
    }
    drawDottedLine(ctx, 30, DIM);

    const playIcon = '\u25B6';
    const bpmLabel = 'PLAY';
    const cx = Math.round(W / 2);
    drawChar(ctx, playIcon, cx - 17, 40, PRIMARY);
    drawText(ctx, bpmLabel, cx - 9, 40, PRIMARY);

    drawDottedLine(ctx, 56, DIM);
  }
}

export default function LcdDisplay({ state }) {
  const canvasRef = useRef(null);
  const [animFrame, setAnimFrame] = useState(0);
  const [introFrame, setIntroFrame] = useState(null);
  const prevPlayingRef = useRef(false);

  // Detect stop → play transition / cancel on stop
  useEffect(() => {
    if (state.playing && !prevPlayingRef.current) {
      setIntroFrame(0);
    } else if (!state.playing) {
      setIntroFrame(null);
    }
    prevPlayingRef.current = state.playing;
  }, [state.playing]);

  // Advance intro frames with variable timing
  useEffect(() => {
    if (introFrame === null || introFrame > INTRO_LAST) {
      if (introFrame !== null) setIntroFrame(null);
      return;
    }
    const ms = INTRO_DURATIONS[introFrame] || 200;
    const id = setTimeout(() => setIntroFrame(f => f + 1), ms);
    return () => clearTimeout(id);
  }, [introFrame]);

  // Idle dance animation timer
  useEffect(() => {
    const id = setInterval(() => {
      setAnimFrame(f => (f + 1) % 3);
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // ── Intro animation — takes over entire LCD ──
    if (introFrame !== null && introFrame <= INTRO_LAST) {
      drawIntro(ctx, introFrame);
      return;
    }

    // ── Normal UI ──
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // Header (y=0)
    drawText(ctx, 'CONGKAK::PROTO', 1, 0, DIM);
    const icon = state.playing ? '\u25B6' : '\u25A0';
    const bpmStr = String(Math.round(state.bpm));
    drawChar(ctx, icon, 92, 0, PRIMARY);
    drawText(ctx, bpmStr, W - textWidth(bpmStr) - 1, 0, PRIMARY);

    // Dotted separator (y=8)
    drawDottedLine(ctx, 8, VERY_DIM);

    // Track + Euclidean + Mode (y=10)
    const trackName = TRACKS[state.selTrack]?.lbl || '???';
    const eucl = state.euclidean[state.selTrack];
    const hStr = String(eucl.hits).padStart(2, '0');
    const rStr = String(eucl.rotation).padStart(2, '0');
    const euclText = 'E(' + hStr + ',' + rStr + ')';
    const modeText = MODE_NAMES[state.mode];

    drawText(ctx, trackName, 1, 10, PRIMARY);
    const euclX = Math.round((W - textWidth(euclText)) / 2);
    drawText(ctx, euclText, euclX, 10, DIM);
    drawText(ctx, modeText, W - textWidth(modeText) - 1, 10, PRIMARY);

    // Step dots (y=18)
    const trackSeq = state.seq[state.selTrack];
    const cellW = 8;
    for (let s = 0; s < 16; s++) {
      const sx = s * cellW + 3;
      if (trackSeq[s]) {
        ctx.fillStyle = DIM;
        ctx.fillRect(sx, 18, 2, 2);
      } else {
        ctx.fillStyle = VERY_DIM;
        ctx.fillRect(sx, 18, 1, 1);
      }
    }

    // Highlight current step dot
    if (state.playing && state.curStep >= 0) {
      const sx = state.curStep * cellW + 3;
      ctx.fillStyle = PRIMARY;
      if (trackSeq[state.curStep]) {
        ctx.fillRect(sx, 18, 2, 2);
      } else {
        ctx.fillRect(sx, 18, 1, 1);
      }
    }

    // Playhead triangle (y=21)
    if (state.playing && state.curStep >= 0) {
      const px = state.curStep * cellW + 3;
      ctx.fillStyle = PRIMARY;
      ctx.fillRect(px, 21, 3, 1);
      ctx.fillRect(px + 1, 22, 1, 1);
    }

    // Wayang figures (y=23)
    const figureY = 23;
    for (let s = 0; s < 16; s++) {
      const fx = s * cellW;
      const isActive = trackSeq[s];
      const isCurrent = state.playing && state.curStep === s;

      let sprite;
      let color;

      if (isCurrent && isActive) {
        sprite = WAYANG_ECSTATIC;
        color = PRIMARY;
      } else if (isCurrent) {
        sprite = WAYANG_DANCE_A;
        color = PRIMARY;
      } else if (isActive) {
        sprite = WAYANG_RAISED;
        color = DIM;
      } else {
        sprite = DANCE_POSES[animFrame];
        color = VERY_DIM;
      }

      drawSprite(ctx, sprite, fx, figureY, color, 7);
    }

    // Ground line (y=34)
    drawDottedLine(ctx, 34, VERY_DIM);

    // Dotted separator (y=36)
    drawDottedLine(ctx, 36, VERY_DIM);

    // PAT + VOL (y=38)
    const patName = state.curPatName[state.selTrack] || '\u2014';
    const patText = 'PAT:' + patName;
    const volVal = String(Math.round(state.knobValues[8]));
    const volText = 'VOL:' + volVal;

    drawText(ctx, patText, 1, 38, PRIMARY);
    drawText(ctx, volText, W - textWidth(volText) - 1, 38, PRIMARY);

    // STEP + MIDI (y=47)
    const stepNum = state.playing && state.curStep >= 0
      ? String(state.curStep + 1).padStart(2, '0')
      : '--';
    const stepText = 'STEP:' + stepNum + '/16';
    const midiText = 'MIDI:' + (state.midiAccess ? 'OK' : '--');

    drawText(ctx, stepText, 1, 47, DIM);
    drawText(ctx, midiText, W - textWidth(midiText) - 1, 47, DIM);

    // Decorative bottom border (y=56)
    ctx.fillStyle = VERY_DIM;
    for (let x = 0; x < W; x++) {
      const cycle = x % 4;
      if (cycle === 0 || cycle === 1 || cycle === 3) {
        ctx.fillRect(x, 56, 1, 1);
      }
    }

  }, [state, animFrame, introFrame]);

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
