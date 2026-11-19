// Renders the cover: multi-panel layout, per-panel photos, a sunset/neon grade,
// and bold caption lettering. Everything is drawn on one canvas, so the live
// preview and the exported PNG are the same picture at different sizes.

import { makeScene } from './scenes.js';

/** The three panel layouts. Each panel is a fraction rect [x, y, w, h] of the cover. */
export const LAYOUTS = {
  triptych: {
    label: 'Triptych · 3 tall panels',
    panels: [
      [0, 0, 1 / 3, 1],
      [1 / 3, 0, 1 / 3, 1],
      [2 / 3, 0, 1 / 3, 1],
    ],
  },
  hero: {
    label: 'Hero · big top, two below',
    panels: [
      [0, 0, 1, 0.62],
      [0, 0.62, 0.5, 0.38],
      [0.5, 0.62, 0.5, 0.38],
    ],
  },
  quad: {
    label: 'Quad · four panels',
    panels: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
};

/** The colour grades. Each is a top-to-bottom wash plus a caption colour. */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    stops: [
      [0, 'rgba(255,120,60,0.02)'],
      [0.55, 'rgba(255,90,90,0.10)'],
      [1, 'rgba(190,30,110,0.42)'],
    ],
    caption: '#ffffff',
    accent: '#ffb347',
  },
  neon: {
    label: 'Neon',
    stops: [
      [0, 'rgba(0,229,255,0.06)'],
      [0.5, 'rgba(120,40,200,0.12)'],
      [1, 'rgba(255,46,136,0.38)'],
    ],
    caption: '#ffffff',
    accent: '#00e5ff',
  },
  midnight: {
    label: 'Midnight',
    stops: [
      [0, 'rgba(10,20,80,0.10)'],
      [0.55, 'rgba(40,30,110,0.16)'],
      [1, 'rgba(8,6,30,0.45)'],
    ],
    caption: '#ffe9a8',
    accent: '#7df9ff',
  },
  none: {
    label: 'No grade',
    stops: [],
    caption: '#ffffff',
    accent: '#ffffff',
  },
};

export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

// Cache of rendered scene canvases, keyed by variant+seed+size.
const sceneCache = new Map();

/** Returns a drawable (image or canvas) for a panel source at roughly this size. */
export function sourceDrawable(source, approxW, approxH) {
  if (!source) return null;
  if (source.kind === 'upload') return source.img;
  const key = `${source.variant}:${source.seed}:${approxW}x${approxH}`;
  if (!sceneCache.has(key)) {
    sceneCache.set(key, makeScene(source.variant, approxW, approxH, source.seed));
  }
  return sceneCache.get(key);
}

/** Draws one photo into a panel rect, cover-fit, with zoom and pan offsets. */
function drawPanelPhoto(ctx, drawable, rect, zoom, ox, oy) {
  const [x, y, w, h] = rect;
  const iw = drawable.naturalWidth ?? drawable.width;
  const ih = drawable.naturalHeight ?? drawable.height;
  const base = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  const dx = x + (w - dw) / 2 + ox * w;
  const dy = y + (h - dh) / 2 + oy * h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(drawable, dx, dy, dw, dh);
  // A whisper of shade so the grade and caption sit on top of any photo.
  const shade = ctx.createLinearGradient(0, y, 0, y + h);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Washes the whole cover in the chosen grade. */
function applyGrade(ctx, w, h, grade) {
  if (!grade.stops.length) return;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of grade.stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Soft darkening toward the corners, so the cover reads as one poster. */
function applyVignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** The bold caption: uppercase, outlined, with a small accent rule above it. */
function drawCaption(ctx, w, h, opts) {
  const text = (opts.caption || '').trim().toUpperCase();
  if (!text) return;
  const grade = GRADES[opts.grade] ?? GRADES.sunset;
  const base = Math.min(w, h);
  let size = base * (opts.captionSize ?? 0.11);
  ctx.font = `900 ${size}px Impact, 'Arial Black', 'Franklin Gothic Heavy', sans-serif`;
  while (ctx.measureText(text).width > w * 0.88 && size > 14) {
    size -= 2;
    ctx.font = `900 ${size}px Impact, 'Arial Black', 'Franklin Gothic Heavy', sans-serif`;
  }
  const y = opts.captionPos === 'top' ? h * 0.12 + size * 0.5 : h - h * 0.075;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = Math.max(2, size * 0.14);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(text, w / 2, y);
  ctx.fillStyle = opts.captionColor || grade.caption;
  ctx.fillText(text, w / 2, y);
  ctx.restore();
  // Accent rule above the caption.
  const ruleW = Math.min(w * 0.4, ctx.measureText(text).width * 0.5);
  const ruleY = opts.captionPos === 'top' ? y + size * 0.75 : y - size * 0.75;
  ctx.fillStyle = grade.accent;
  ctx.fillRect(w / 2 - ruleW / 2, ruleY, ruleW, Math.max(3, size * 0.06));
  // Optional sub-caption, small and letterspaced.
  if (opts.subcaption && opts.subcaption.trim()) {
    const sub = opts.subcaption.trim().toUpperCase();
    const subSize = Math.max(12, size * 0.22);
    ctx.save();
    ctx.font = `700 ${subSize}px 'Arial Narrow', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = subSize * 0.3;
    const subY = opts.captionPos === 'top' ? ruleY + subSize * 1.6 : ruleY - subSize * 1.6;
    ctx.fillText(sub.split('').join(' '), w / 2, subY);
    ctx.restore();
  }
}

/**
 * Renders the whole cover onto `canvas` at its own size.
 * opts: { layout, panels: [{source, zoom, ox, oy}], grade, caption, subcaption,
 *         captionPos, captionSize, captionColor, frame }
 * A panel source is { kind: 'scene', variant, seed } or { kind: 'upload', img, name }.
 */
export function renderCover(canvas, opts) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = LAYOUTS[opts.layout] ?? LAYOUTS.triptych;
  const grade = GRADES[opts.grade] ?? GRADES.sunset;
  const gutter = Math.max(4, Math.round(Math.min(w, h) * 0.006));

  ctx.fillStyle = '#0a0614';
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((frac, i) => {
    const panel = opts.panels[i] ?? {};
    const px = frac[0] * w + gutter / 2;
    const py = frac[1] * h + gutter / 2;
    const pw = frac[2] * w - gutter;
    const ph = frac[3] * h - gutter;
    const drawable = sourceDrawable(panel.source, Math.round(pw), Math.round(ph));
    if (drawable) {
      drawPanelPhoto(ctx, drawable, [px, py, pw, ph], panel.zoom ?? 1, panel.ox ?? 0, panel.oy ?? 0);
    } else {
      // Empty panel: a dark placeholder with a thin outline.
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    }
  });

  applyGrade(ctx, w, h, grade);
  applyVignette(ctx, w, h);
  drawCaption(ctx, w, h, opts);

  if (opts.frame) {
    ctx.strokeStyle = opts.frame === 'neon' ? '#00e5ff' : 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  }
  return canvas;
}

/** Renders the cover at full export size and resolves to a PNG blob. */
export function exportCoverBlob(opts, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas, opts);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('export failed'))), 'image/png');
  });
}
