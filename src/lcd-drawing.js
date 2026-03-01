import { FONT } from './lcd-font';

export function drawChar(ctx, char, x, y, color) {
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

export function drawText(ctx, str, x, y, color) {
  for (let i = 0; i < str.length; i++) {
    drawChar(ctx, str[i], x + i * 6, y, color);
  }
}

export function textWidth(str) {
  return str.length * 6;
}

export function drawSprite(ctx, data, x, y, color, width) {
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

export function drawSpriteScaled(ctx, data, x, y, color, width, scale) {
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

export function drawDottedLine(ctx, y, color, width) {
  ctx.fillStyle = color;
  for (let x = 0; x < width; x += 2) {
    ctx.fillRect(x, y, 1, 1);
  }
}
