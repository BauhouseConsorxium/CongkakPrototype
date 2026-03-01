import { useRef, useEffect, useState } from 'react';
import { TRACKS, MODE_NAMES } from '../constants';
import {
  WAYANG_DANCE_A, WAYANG_DANCE_B, WAYANG_DANCE_C,
  WAYANG_RAISED, WAYANG_ECSTATIC,
} from '../lcd-font';
import { drawText, textWidth, drawChar, drawSprite, drawDottedLine } from '../lcd-drawing';
import { INTRO_LAST, INTRO_DURATIONS, drawIntro } from '../lcd-intro';

const W = 128;
const H = 64;
const SCALE = 3;
const BG = '#0a1a0a';
const PRIMARY = '#00FF88';
const DIM = '#006633';
const VERY_DIM = '#003318';

const DANCE_POSES = [WAYANG_DANCE_A, WAYANG_DANCE_B, WAYANG_DANCE_C];

function drawHeader(ctx, state) {
  drawText(ctx, 'CONGKAK::PROTO', 1, 0, DIM);
  const icon = state.playing ? '\u25B6' : '\u25A0';
  const bpmStr = String(Math.round(state.bpm));
  drawChar(ctx, icon, 92, 0, PRIMARY);
  drawText(ctx, bpmStr, W - textWidth(bpmStr) - 1, 0, PRIMARY);

  drawDottedLine(ctx, 8, VERY_DIM, W);
}

function drawTrackInfo(ctx, state) {
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
}

function drawStepGrid(ctx, state) {
  const trackSeq = state.seq[state.selTrack];
  const cellW = 8;

  // Step dots (y=18)
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
}

function drawWayang(ctx, state, animFrame) {
  const trackSeq = state.seq[state.selTrack];
  const cellW = 8;
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

  // Ground line + separator
  drawDottedLine(ctx, 34, VERY_DIM, W);
  drawDottedLine(ctx, 36, VERY_DIM, W);
}

function drawStatusRows(ctx, state) {
  // PAT + VOL (y=38)
  const hasSmp = state.samples && state.samples[state.selTrack];
  const patName = hasSmp ? 'SMP' : (state.curPatName[state.selTrack] || '\u2014');
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
}

function drawBottomBorder(ctx) {
  ctx.fillStyle = VERY_DIM;
  for (let x = 0; x < W; x++) {
    const cycle = x % 4;
    if (cycle === 0 || cycle === 1 || cycle === 3) {
      ctx.fillRect(x, 56, 1, 1);
    }
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
      drawIntro(ctx, introFrame, { BG, PRIMARY, DIM, VERY_DIM, W, H });
      return;
    }

    // ── Normal UI ──
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    drawHeader(ctx, state);
    drawTrackInfo(ctx, state);
    drawStepGrid(ctx, state);
    drawWayang(ctx, state, animFrame);
    drawStatusRows(ctx, state);
    drawBottomBorder(ctx);

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
