// Neon Vice cover renderer — draws a multi-panel GTA-style poster onto any 2D canvas.
// Pure functions over a plain state object: no network, no DOM, no imports.
// A state looks like:
//   { photos: [{img, name}], panels: [{photo, zoom, dx, dy} x4], layout, caption,
//     tagline, eyebrow, grade (0..1), halftone, neon, selected }

export const LAYOUT_IDS = ['hero', 'split', 'strip'];

// Panel rectangles as fractions of the cover, per layout and aspect bucket.
// Every layout fills the whole cover with 3 or 4 panels, like a poster collage.
const LAYOUT_TABLE = {
  hero: {
    square: [
      [0, 0, 0.64, 0.62],
      [0.64, 0, 0.36, 0.31],
      [0.64, 0.31, 0.36, 0.31],
      [0, 0.62, 1, 0.38],
    ],
    portrait: [
      [0, 0, 1, 0.52],
      [0, 0.52, 0.5, 0.24],
      [0.5, 0.52, 0.5, 0.24],
      [0, 0.76, 1, 0.24],
    ],
    wide: [
      [0, 0, 0.58, 1],
      [0.58, 0, 0.42, 0.5],
      [0.58, 0.5, 0.42, 0.5],
    ],
  },
  split: {
    square: [
      [0, 0, 0.5, 0.62],
      [0.5, 0, 0.5, 0.62],
      [0, 0.62, 0.5, 0.38],
      [0.5, 0.62, 0.5, 0.38],
    ],
    portrait: [
      [0, 0, 1, 0.4],
      [0, 0.4, 0.5, 0.3],
      [0.5, 0.4, 0.5, 0.3],
      [0, 0.7, 1, 0.3],
    ],
    wide: [
      [0, 0, 0.34, 1],
      [0.34, 0, 0.33, 1],
      [0.67, 0, 0.33, 1],
    ],
  },
  strip: {
    square: [
      [0, 0, 1, 0.55],
      [0, 0.55, 0.34, 0.45],
      [0.34, 0.55, 0.33, 0.45],
      [0.67, 0.55, 0.33, 0.45],
    ],
    portrait: [
      [0, 0, 1, 0.46],
      [0, 0.46, 1, 0.18],
      [0, 0.64, 0.5, 0.36],
      [0.5, 0.64, 0.5, 0.36],
    ],
    wide: [
      [0, 0, 1, 0.62],
      [0, 0.62, 0.5, 0.38],
      [0.5, 0.62, 0.5, 0.38],
    ],
  },
};

/** Which aspect bucket a cover size falls in: square, portrait or wide. */
export function aspectOf(width, height) {
  const ratio = width / height;
  if (ratio >= 1.5) return 'wide';
  if (ratio >= 0.9) return 'square';
  return 'portrait';
}

/** How many panels a layout has at an aspect. */
export function panelCount(layoutId, aspect) {
  return LAYOUT_TABLE[layoutId][aspect].length;
}

/**
 * Pixel rectangles for a layout, with a white outer frame and white gutters
 * between panels — the poster look. Each rect is {x, y, w, h}.
 */
export function panelRects(layoutId, aspect, width, height) {
  const gutter = Math.max(2, Math.round(width * 0.006));
  const frame = Math.max(4, Math.round(width * 0.014));
  const innerW = width - frame * 2;
  const innerH = height - frame * 2;
  return LAYOUT_TABLE[layoutId][aspect].map(([fx, fy, fw, fh]) => {
    const x = frame + fx * innerW;
    const y = frame + fy * innerH;
    const w = fw * innerW;
    const h = fh * innerH;
    return { x: x + gutter / 2, y: y + gutter / 2, w: w - gutter, h: h - gutter };
  });
}

/** The panel index at cover point (px, py), or -1 when the point is on a gutter. */
export function panelAt(layoutId, aspect, width, height, px, py) {
  const rects = panelRects(layoutId, aspect, width, height);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

/** Draw one photo into a panel rect, cover-fit, with the panel's zoom and pan. */
function drawPanelPhoto(ctx, img, rect, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const zoom = Math.max(0.5, panel.zoom || 1);
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = (dw - rect.w) / 2;
  const oy = (dh - rect.h) / 2;
  const x = rect.x + (rect.w - dw) / 2 + (panel.dx || 0) * ox;
  const y = rect.y + (rect.h - dh) / 2 + (panel.dy || 0) * oy;
  ctx.drawImage(img, x, y, dw, dh);
}

/** The Vice City sunset grade: magenta-to-orange-to-teal wash, warm glow, vignette. */
function sunsetGrade(ctx, rect, strength) {
  const s = Math.max(0, Math.min(1, strength));
  if (s <= 0) return;
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w * 0.25, rect.y + rect.h);
  wash.addColorStop(0, `rgba(255,46,136,${(0.5 * s).toFixed(3)})`);
  wash.addColorStop(0.45, `rgba(255,122,24,${(0.34 * s).toFixed(3)})`);
  wash.addColorStop(1, `rgba(0,229,199,${(0.38 * s).toFixed(3)})`);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = `rgba(255,140,40,${(0.25 * s).toFixed(3)})`;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const vig = ctx.createRadialGradient(cx, cy, Math.min(rect.w, rect.h) * 0.35, cx, cy, Math.max(rect.w, rect.h) * 0.75);
  vig.addColorStop(0, 'rgba(8,0,24,0)');
  vig.addColorStop(1, 'rgba(8,0,24,0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** A halftone dot field across the cover's top-right corner, like cheap print. */
function halftoneCorner(ctx, width, height) {
  const s = width / 1080;
  const step = 11 * s;
  const x0 = width * 0.66;
  const y0 = 0;
  const y1 = height * 0.16;
  ctx.save();
  ctx.fillStyle = 'rgba(10,0,20,0.30)';
  for (let y = y0 + step / 2; y < y1; y += step) {
    for (let x = x0 + step / 2; x < width; x += step) {
      const t = 1 - (y - y0) / (y1 - y0);
      const r = Math.max(0.4, 2.2 * s * (0.4 + 0.6 * t));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A rounded rectangle path, for the eyebrow pill and panel badges. */
function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/**
 * Word-wrap a caption into at most two lines at the largest size that fits.
 * Returns {lines, size}; shrinks the type before it ever spills a third line.
 */
function fitCaptionLines(ctx, text, maxWidth, startSize) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [], size: startSize };
  for (let size = startSize; size >= startSize * 0.5; size -= 2) {
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    const lines = [''];
    let li = 0;
    for (const word of words) {
      const trial = lines[li] === '' ? word : `${lines[li]} ${word}`;
      if (ctx.measureText(trial).width <= maxWidth || lines[li] === '') {
        lines[li] = trial;
      } else if (li === 0) {
        lines.push(word);
        li = 1;
      } else {
        return null;
      }
    }
    if (lines.length <= 2 && lines.every((line) => ctx.measureText(line).width <= maxWidth)) {
      return { lines, size };
    }
  }
  ctx.font = `${Math.round(startSize * 0.5)}px Anton, "Arial Black", sans-serif`;
  return { lines: [words.join(' ')], size: Math.round(startSize * 0.5) };
}

/** The caption block: scrim, bold lettering with neon glow, tagline, eyebrow pill. */
function drawCaptionBlock(ctx, width, height, state) {
  const scrimH = height * 0.3;
  const scrim = ctx.createLinearGradient(0, height - scrimH, 0, height);
  scrim.addColorStop(0, 'rgba(5,0,16,0)');
  scrim.addColorStop(1, 'rgba(5,0,16,0.82)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, height - scrimH, width, scrimH);

  // Eyebrow pill, top-left over the first panel.
  const eyebrow = String(state.eyebrow || '').trim();
  if (eyebrow !== '') {
    const pillSize = Math.round(width * 0.026);
    ctx.font = `${pillSize}px Anton, "Arial Black", sans-serif`;
    const padX = pillSize * 0.7;
    const padY = pillSize * 0.42;
    const tw = ctx.measureText(eyebrow.toUpperCase()).width;
    const px = Math.round(width * 0.014);
    const py = Math.round(width * 0.014);
    ctx.fillStyle = '#ff2e88';
    roundRectPath(ctx, px, py, tw + padX * 2, pillSize + padY * 2, (pillSize + padY * 2) / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(eyebrow.toUpperCase(), px + padX, py + (pillSize + padY * 2) / 2 + 1);
  }

  // Main caption, tilted a touch, white with a black outline and pink neon glow.
  // Laid out from the bottom up: tagline baseline, neon bar, then the caption,
  // so the three never overlap.
  const caption = String(state.caption || '').trim();
  const tSize = Math.round(width * 0.03);
  const taglineBaseline = height - height * 0.028;
  if (caption !== '') {
    const fitted = fitCaptionLines(ctx, caption.toUpperCase(), width * 0.88, Math.round(width * 0.115));
    const size = fitted.size;
    const lineH = size * 0.98;
    const blockH = fitted.lines.length * lineH;
    const barH = Math.max(3, size * 0.07);
    const barBottom = taglineBaseline - tSize * 1.4;
    const blockBottom = barBottom - barH - size * 0.12;
    const baseY = blockBottom - blockH;
    ctx.save();
    ctx.translate(width / 2, baseY + blockH / 2);
    ctx.rotate(-0.018);
    ctx.translate(-width / 2, -(baseY + blockH / 2));
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14001f';
    ctx.lineWidth = Math.max(2, size * 0.16);
    if (state.neon) {
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = size * 0.18;
    }
    fitted.lines.forEach((line, i) => {
      const y = baseY + lineH * (i + 0.5);
      ctx.strokeText(line, width / 2, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, width / 2, y);
    });
    ctx.restore();
    // Neon underline under the last caption line.
    const widest = Math.max(...fitted.lines.map((line) => ctx.measureText(line).width));
    const barW = widest * 0.42;
    const barY = barBottom - barH / 2;
    ctx.save();
    ctx.translate(width / 2, barY);
    ctx.rotate(-0.018);
    ctx.fillStyle = '#ff2e88';
    if (state.neon) {
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = size * 0.16;
    }
    ctx.fillRect(-barW / 2, -barH / 2, barW, barH);
    ctx.restore();
  }

  // Tagline in spaced teal capitals under the caption.
  const tagline = String(state.tagline || '').trim();
  if (tagline !== '') {
    ctx.font = `${tSize}px Anton, "Arial Black", sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(width * 0.008)}px`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14001f';
    ctx.lineWidth = Math.max(1.5, tSize * 0.14);
    ctx.fillStyle = '#2de2c5';
    const ty = taglineBaseline;
    ctx.strokeText(tagline.toUpperCase(), width / 2, ty);
    ctx.fillText(tagline.toUpperCase(), width / 2, ty);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
}

/** The editor-only selection outline: dashed frame and a numbered badge. */
function drawSelection(ctx, rect, index) {
  const s = Math.max(2, Math.round((rect.w + rect.h) / 400));
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = s;
  ctx.setLineDash([s * 5, s * 3]);
  ctx.strokeRect(rect.x + s, rect.y + s, rect.w - s * 2, rect.h - s * 2);
  ctx.setLineDash([]);
  const badge = Math.round(30 * ((rect.w + rect.h) / 1200) + 14);
  const bx = rect.x + rect.w - badge - 10;
  const by = rect.y + rect.h - badge - 10;
  ctx.fillStyle = '#ff2e88';
  roundRectPath(ctx, bx, by, badge, badge, badge / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(badge * 0.55)}px Anton, "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(index + 1), bx + badge / 2, by + badge / 2 + 1);
  ctx.restore();
}

/**
 * Draw the whole cover. `state.photos` holds loaded <img> elements (or nulls);
 * a panel with no photo yet is filled with the sunset gradient instead.
 * `opts.selection` draws the editor's selected-panel outline (preview only).
 */
export function drawCover(ctx, width, height, state, opts = {}) {
  const aspect = aspectOf(width, height);
  const rects = panelRects(state.layout, aspect, width, height);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  const empty = ctx.createLinearGradient(0, 0, width, height);
  empty.addColorStop(0, '#ff2e88');
  empty.addColorStop(0.5, '#ff7a18');
  empty.addColorStop(1, '#0aa393');
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: 0, zoom: 1, dx: 0, dy: 0 };
    const photo = state.photos[panel.photo];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (photo && photo.img) {
      drawPanelPhoto(ctx, photo.img, rect, panel);
    } else {
      ctx.fillStyle = empty;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    sunsetGrade(ctx, rect, state.grade);
    ctx.restore();
    ctx.strokeStyle = '#14001f';
    ctx.lineWidth = Math.max(2, Math.round(width * 0.003));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  if (state.halftone) halftoneCorner(ctx, width, height);
  drawCaptionBlock(ctx, width, height, state);
  if (opts.selection && typeof state.selected === 'number' && rects[state.selected]) {
    drawSelection(ctx, rects[state.selected], state.selected);
  }
  ctx.restore();
}
