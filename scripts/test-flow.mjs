import assert from "node:assert/strict";

const width = 48;
const height = 36;
const previous = image((x, y) => pattern(x, y));
const current = image((x, y) => pattern(x - 2, y - 1));
const estimate = lk(previous, current, 24, 18);

assert.ok(estimate.confidence > 1e-5, `expected textured confidence, got ${estimate.confidence}`);
assert.ok(estimate.x > 0.3, `expected rightward flow, got ${estimate.x.toFixed(3)}`);
assert.ok(estimate.y > 0.1, `expected downward flow, got ${estimate.y.toFixed(3)}`);

const flat = new Float32Array(width * height).fill(0.5);
const uncertain = lk(flat, flat, 24, 18);
assert.ok(uncertain.confidence < 1e-8, `flat region should be rejected, got ${uncertain.confidence}`);

process.stdout.write(`Synthetic LK passed: dx=${estimate.x.toFixed(2)}, dy=${estimate.y.toFixed(2)}\n`);

function image(fn) {
  return Float32Array.from({ length: width * height }, (_, index) => fn(index % width, Math.floor(index / width)));
}

function pattern(x, y) {
  return 0.5 + Math.sin(x * 0.31) * 0.18 + Math.cos(y * 0.43) * 0.17 + Math.sin((x + y) * 0.19) * 0.15;
}

function sample(texture, x, y) {
  return texture[Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))];
}

function lk(oldImage, newImage, x, y) {
  let a11 = 0;
  let a12 = 0;
  let a22 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let oy = -3; oy <= 3; oy += 1) {
    for (let ox = -3; ox <= 3; ox += 1) {
      const px = x + ox;
      const py = y + oy;
      const ix = (sample(newImage, px + 1, py) - sample(newImage, px - 1, py)
        + sample(oldImage, px + 1, py) - sample(oldImage, px - 1, py)) * 0.25;
      const iy = (sample(newImage, px, py + 1) - sample(newImage, px, py - 1)
        + sample(oldImage, px, py + 1) - sample(oldImage, px, py - 1)) * 0.25;
      const it = sample(newImage, px, py) - sample(oldImage, px, py);
      a11 += ix * ix;
      a12 += ix * iy;
      a22 += iy * iy;
      b1 += ix * it;
      b2 += iy * it;
    }
  }
  const determinant = a11 * a22 - a12 * a12;
  if (determinant <= 1e-9) return { x: 0, y: 0, confidence: determinant };
  return {
    x: -(a22 * b1 - a12 * b2) / determinant,
    y: -(a11 * b2 - a12 * b1) / determinant,
    confidence: determinant,
  };
}
