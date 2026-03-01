import { drawText, textWidth, drawChar, drawDottedLine, drawSpriteScaled, drawSprite } from './lcd-drawing';
import { WAYANG_DANCE_A, WAYANG_DANCE_B, WAYANG_DANCE_C, WAYANG_ECSTATIC } from './lcd-font';

export const INTRO_LAST = 5;
export const INTRO_DURATIONS = [300, 180, 180, 180, 250, 350];

export function drawIntro(ctx, frame, colors) {
  const { BG, PRIMARY, DIM, VERY_DIM, W, H } = colors;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const title = 'CONGKAK::PROTO';
  const titleW = textWidth(title);
  const titleX = Math.round((W - titleW) / 2);

  // Frame 0 — title centered on screen
  if (frame === 0) {
    drawText(ctx, title, titleX, 28, DIM);
    drawDottedLine(ctx, 22, VERY_DIM, W);
    drawDottedLine(ctx, 37, VERY_DIM, W);
    return;
  }

  // Frames 1–4 — big 3x wayang dancing, title at top
  if (frame >= 1 && frame <= 4) {
    const color = frame === 4 ? PRIMARY : DIM;
    const titleColor = frame === 4 ? PRIMARY : DIM;

    drawText(ctx, title, titleX, 2, titleColor);
    drawDottedLine(ctx, 10, VERY_DIM, W);

    const poses = [WAYANG_DANCE_A, WAYANG_DANCE_B, WAYANG_DANCE_C, WAYANG_ECSTATIC];
    const pose = poses[frame - 1];
    const sc = 3;
    const sw = 7 * sc;  // 21
    const sh = 11 * sc; // 33
    const sx = Math.round((W - sw) / 2);
    const sy = 15;

    drawSpriteScaled(ctx, pose, sx, sy, color, 7, sc);
    drawDottedLine(ctx, sy + sh + 2, VERY_DIM, W);

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
    drawDottedLine(ctx, 10, DIM, W);

    for (let s = 0; s < 16; s++) {
      drawSprite(ctx, WAYANG_ECSTATIC, s * 8, 18, PRIMARY, 7);
    }
    drawDottedLine(ctx, 30, DIM, W);

    const playIcon = '\u25B6';
    const bpmLabel = 'PLAY';
    const cx = Math.round(W / 2);
    drawChar(ctx, playIcon, cx - 17, 40, PRIMARY);
    drawText(ctx, bpmLabel, cx - 9, 40, PRIMARY);

    drawDottedLine(ctx, 56, DIM, W);
  }
}
