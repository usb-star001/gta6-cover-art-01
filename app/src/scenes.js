// Procedural sample scenes for Neon Sunset Studio.
// Every scene is drawn fresh by the app itself on a canvas — no photo files, no
// borrowed artwork, no rights question. Each scene is deterministic: the same
// variant and seed always draws the same picture, so screenshots are stable.
// A scene is used as a panel photo exactly like an uploaded image.

/** mulberry32: a tiny deterministic PRNG, so a scene draws the same every time. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Renders a scene variant onto a fresh canvas and returns it. */
export function makeScene(variant, width, height, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(seed);
  if (variant === 'neon') drawNeonScene(ctx, width, height, rnd);
  else if (variant === 'dusk') drawDuskScene(ctx, width, height, rnd);
  else drawSunsetScene(ctx, width, height, rnd);
  return canvas;
}

export const SCENE_VARIANTS = [
  { id: 'sunset', label: 'Sunset Blvd' },
  { id: 'neon', label: 'Neon Pier' },
  { id: 'dusk', label: 'Dusk Skyline' },
];

/** A vertical sky gradient from the given colour stops. */
function skyGradient(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** A glowing disc (the sun or moon) with a soft halo. */
function glowDisc(ctx, x, y, r, core, halo) {
  const haloGrad = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3.2);
  haloGrad.addColorStop(0, halo);
  haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haloGrad;
  ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A row of dark buildings with lit windows, along the horizon line. */
function skyline(ctx, w, horizon, rnd, opts) {
  const { minH, maxH, color, litChance, litColor } = opts;
  let x = -10;
  while (x < w + 10) {
    const bw = w * (0.05 + rnd() * 0.09);
    const bh = minH + rnd() * (maxH - minH);
    ctx.fillStyle = color;
    ctx.fillRect(x, horizon - bh, bw, bh);
    // Antenna on a few towers.
    if (rnd() < 0.25) {
      ctx.fillRect(x + bw / 2 - 1, horizon - bh - h() * 0.03, 2, h() * 0.03);
    }
    // Lit windows.
    const cols = Math.max(2, Math.floor(bw / (w * 0.022)));
    const rows = Math.max(3, Math.floor(bh / (h() * 0.045)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() < litChance) {
          ctx.fillStyle = litColor;
          ctx.fillRect(
            x + 4 + c * ((bw - 8) / cols),
            horizon - bh + 5 + r * ((bh - 10) / rows),
            Math.max(2, w * 0.008),
            Math.max(2, h() * 0.012),
          );
        }
      }
    }
    x += bw + w * 0.008;
  }
  function h() {
    return ctx.canvas.height;
  }
}

/** A palm silhouette: curved trunk and drooping fronds. */
function palmTree(ctx, x, baseY, height, lean, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const topX = x + lean;
  const topY = baseY - height;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, height * 0.035);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + lean * 0.3, baseY - height * 0.55, topX, topY);
  ctx.stroke();
  // Fronds: arcs drooping from the crown.
  ctx.lineWidth = Math.max(2, height * 0.018);
  for (let i = 0; i < 7; i++) {
    const a = (-160 + i * 32) * (Math.PI / 180);
    const len = height * (0.34 + (i % 3) * 0.05);
    const cx = topX + Math.cos(a) * len * 0.55;
    const cy = topY + Math.sin(a) * len * 0.55 - height * 0.06;
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len + height * 0.22;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(topX - 3, topY + 4, 3, 0, Math.PI * 2);
  ctx.arc(topX + 4, topY + 5, 3, 0, Math.PI * 2);
  ctx.fill();
}

/** Golden-hour boulevard: big sun, skyline, palms, wet road with reflections. */
function drawSunsetScene(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [
    [0, '#2a1052'],
    [0.35, '#8e2a6e'],
    [0.62, '#e85a4a'],
    [0.8, '#ff9a3d'],
    [1, '#ffc46b'],
  ]);
  glowDisc(ctx, w * 0.62, h * 0.58, h * 0.11, '#ffe9a8', 'rgba(255,170,80,0.55)');
  const horizon = h * 0.72;
  skyline(ctx, w, horizon, rnd, {
    minH: h * 0.1,
    maxH: h * 0.34,
    color: '#1c0b33',
    litChance: 0.28,
    litColor: '#ffd27a',
  });
  // Road / ground with a sun reflection.
  ctx.fillStyle = '#160a26';
  ctx.fillRect(0, horizon, w, h - horizon);
  const refl = ctx.createLinearGradient(0, horizon, 0, h);
  refl.addColorStop(0, 'rgba(255,170,80,0.5)');
  refl.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = refl;
  const rw = w * 0.16;
  ctx.beginPath();
  ctx.moveTo(w * 0.62 - rw * 0.4, horizon);
  ctx.lineTo(w * 0.62 + rw * 0.4, horizon);
  ctx.lineTo(w * 0.62 + rw, h);
  ctx.lineTo(w * 0.62 - rw, h);
  ctx.closePath();
  ctx.fill();
  // Palm silhouettes framing the scene.
  palmTree(ctx, w * 0.08, h * 0.98, h * 0.42, w * 0.03, '#14081f');
  palmTree(ctx, w * 0.93, h * 0.98, h * 0.36, -w * 0.035, '#14081f');
  palmTree(ctx, w * 0.86, h * 0.9, h * 0.24, -w * 0.02, '#1c0b33');
}

/** Neon pier at night: glowing signs, a ferris wheel, neon on the water. */
function drawNeonScene(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [
    [0, '#070d2b'],
    [0.5, '#1b1150'],
    [0.78, '#3b0f5e'],
    [1, '#12082e'],
  ]);
  // Stars.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) {
    const s = rnd();
    ctx.globalAlpha = 0.25 + s * 0.6;
    ctx.fillRect(rnd() * w, rnd() * h * 0.45, s > 0.85 ? 2 : 1, s > 0.85 ? 2 : 1);
  }
  ctx.globalAlpha = 1;
  // Ferris wheel.
  const wx = w * 0.68;
  const wy = h * 0.42;
  const wr = h * 0.26;
  ctx.strokeStyle = '#ff2e88';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = 18;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(wx, wy, wr, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
    ctx.stroke();
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(wx - wr * 0.5, wy + wr * 0.9);
  ctx.lineTo(wx, wy);
  ctx.lineTo(wx + wr * 0.5, wy + wr * 0.9);
  ctx.stroke();
  // Neon sign blocks on the left.
  const signs = ['#ff2e88', '#00e5ff', '#ffd319', '#ff2e88'];
  let sx = w * 0.04;
  for (const color of signs) {
    const sw = w * 0.1;
    const sh = h * (0.1 + rnd() * 0.16);
    ctx.fillStyle = '#0d0620';
    ctx.fillRect(sx, h * 0.72 - sh, sw, sh);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillRect(sx + 4, h * 0.72 - sh + 6, sw - 8, 5);
    ctx.fillRect(sx + 4, h * 0.72 - sh + 16, sw - 8, 3);
    ctx.shadowBlur = 0;
    sx += sw + w * 0.02;
  }
  const horizon = h * 0.72;
  skyline(ctx, w, horizon, rnd, {
    minH: h * 0.06,
    maxH: h * 0.2,
    color: '#0a0618',
    litChance: 0.35,
    litColor: '#7df9ff',
  });
  // Water with neon streaks.
  ctx.fillStyle = '#05030f';
  ctx.fillRect(0, horizon, w, h - horizon);
  for (const [cx, color] of [[0.68, '#ff2e88'], [0.3, '#00e5ff'], [0.5, '#ffd319']]) {
    const grad = ctx.createLinearGradient(0, horizon, 0, h);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = grad;
    ctx.fillRect(w * cx - w * 0.02, horizon, w * 0.04, h - horizon);
    ctx.globalAlpha = 1;
  }
  palmTree(ctx, w * 0.05, h * 0.98, h * 0.3, w * 0.02, '#05030f');
}

/** Dusk skyline: teal-to-plum sky, crescent moon, tall towers, light trails. */
function drawDuskScene(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [
    [0, '#0e2a4e'],
    [0.45, '#4a3a7d'],
    [0.75, '#a85a7e'],
    [1, '#e88a5a'],
  ]);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 70; i++) {
    ctx.globalAlpha = 0.2 + rnd() * 0.6;
    ctx.fillRect(rnd() * w, rnd() * h * 0.4, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
  // Crescent moon.
  ctx.fillStyle = '#f5ecd7';
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.18, h * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0e2a4e';
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.16, h * 0.06, 0, Math.PI * 2);
  ctx.fill();
  const horizon = h * 0.74;
  skyline(ctx, w, horizon, rnd, {
    minH: h * 0.16,
    maxH: h * 0.46,
    color: '#120a24',
    litChance: 0.32,
    litColor: '#ffe9a8',
  });
  // Street with headlight trails.
  ctx.fillStyle = '#0b0616';
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.strokeStyle = '#ffd319';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.86);
  ctx.quadraticCurveTo(w * 0.5, h * 0.8, w, h * 0.88);
  ctx.stroke();
  ctx.strokeStyle = '#ff2e5e';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.93);
  ctx.quadraticCurveTo(w * 0.5, h * 0.87, w, h * 0.95);
  ctx.stroke();
  ctx.globalAlpha = 1;
  palmTree(ctx, w * 0.1, h * 0.99, h * 0.38, w * 0.025, '#0b0616');
}
