// Neon Sunset Studio: wires the editor. A photo (or three) and a caption become
// a multi-panel GTA-style cover, exported as a PNG. A `?shot=` query sets up a
// fixed scene for a screenshot instead (./shots.js).
import { renderCover, exportCoverBlob, LAYOUTS, GRADES, EXPORT_SIZES } from './cover.js';
import { SCENE_VARIANTS } from './scenes.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusEl = $('status');

// --- State -----------------------------------------------------------------
// A panel source is { kind: 'scene', variant, seed } or { kind: 'upload', img, name }.
const state = {
  layout: 'triptych',
  grade: 'sunset',
  caption: 'Vice Lights',
  subcaption: 'A story in three panels',
  captionPos: 'bottom',
  captionSize: 0.11,
  captionColor: '',
  frame: 'white',
  sizeId: '1920x1080',
  panels: [
    { source: { kind: 'scene', variant: 'sunset', seed: 11 }, zoom: 1, ox: 0, oy: 0 },
    { source: { kind: 'scene', variant: 'neon', seed: 23 }, zoom: 1, ox: 0, oy: 0 },
    { source: { kind: 'scene', variant: 'dusk', seed: 37 }, zoom: 1, ox: 0, oy: 0 },
  ],
  selected: 0,
};
const uploads = []; // { kind: 'upload', img, name } — at most 3, in upload order.

function currentSize() {
  return EXPORT_SIZES.find((s) => s.id === state.sizeId) ?? EXPORT_SIZES[2];
}

/** All sources a panel can use: the three built-in scenes, then uploads. */
function sourceList() {
  const scenes = SCENE_VARIANTS.map((v) => ({
    kind: 'scene',
    variant: v.id,
    seed: { sunset: 11, neon: 23, dusk: 37 }[v.id],
    label: v.label,
  }));
  return [...scenes, ...uploads.map((u) => ({ ...u, label: u.name }))];
}

function sourceLabel(source) {
  if (!source) return 'Empty';
  if (source.kind === 'scene') {
    return SCENE_VARIANTS.find((v) => v.id === source.variant)?.label ?? source.variant;
  }
  return source.name;
}

// --- Rendering ---------------------------------------------------------------
function coverOpts() {
  return {
    layout: state.layout,
    panels: state.panels,
    grade: state.grade,
    caption: state.caption,
    subcaption: state.subcaption,
    captionPos: state.captionPos,
    captionSize: state.captionSize,
    captionColor: state.captionColor || undefined,
    frame: state.frame === 'none' ? '' : state.frame,
  };
}

/** Sizes the preview canvas to the chosen export aspect and renders the cover. */
function redraw() {
  const size = currentSize();
  const maxW = document.body.classList.contains('shot-cover') ? window.innerWidth : 760;
  const scale = Math.min(1, maxW / size.w, 640 / size.h);
  preview.width = Math.max(2, Math.round(size.w * scale));
  preview.height = Math.max(2, Math.round(size.h * scale));
  if (document.body.classList.contains('shot-cover')) {
    preview.width = window.innerWidth;
    preview.height = window.innerHeight;
  }
  renderCover(preview, coverOpts());
  $('size-note').textContent = `Preview ${preview.width} × ${preview.height} — exports at ${size.w} × ${size.h}.`;
}

function waitPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

// --- Controls ----------------------------------------------------------------
function buildPanelControls() {
  const wrap = $('panel-controls');
  wrap.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const div = document.createElement('div');
    div.className = 'panel-card' + (i === state.selected ? ' selected' : '');
    div.innerHTML = `
      <button type="button" class="panel-pick">Panel ${i + 1} · <span></span></button>
      <label>Photo
        <select></select>
      </label>
      <label>Zoom <input type="range" min="1" max="2.5" step="0.05" value="${panel.zoom}"></label>
      <label>Pan X <input type="range" min="-0.4" max="0.4" step="0.02" value="${panel.ox}"></label>
      <label>Pan Y <input type="range" min="-0.4" max="0.4" step="0.02" value="${panel.oy}"></label>`;
    const label = div.querySelector('.panel-pick span');
    const select = div.querySelector('select');
    const [zoom, ox, oy] = div.querySelectorAll('input[type=range]');
    const refresh = () => {
      label.textContent = sourceLabel(panel.source);
      select.innerHTML = '';
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Empty panel';
      select.appendChild(empty);
      sourceList().forEach((src, idx) => {
        const opt = document.createElement('option');
        opt.value = String(idx);
        opt.textContent = src.label;
        select.appendChild(opt);
      });
      const idx = sourceList().findIndex(
        (s) => s.kind === panel.source?.kind && (s.variant ?? s.name) === (panel.source?.variant ?? panel.source?.name),
      );
      select.value = idx === -1 ? '' : String(idx);
    };
    refresh();
    div.querySelector('.panel-pick').addEventListener('click', () => {
      state.selected = i;
      buildPanelControls();
      redraw();
    });
    select.addEventListener('change', () => {
      panel.source = select.value === '' ? null : sourceList()[Number(select.value)];
      refresh();
      redraw();
    });
    zoom.addEventListener('input', () => { panel.zoom = Number(zoom.value); redraw(); });
    ox.addEventListener('input', () => { panel.ox = Number(ox.value); redraw(); });
    oy.addEventListener('input', () => { panel.oy = Number(oy.value); redraw(); });
    wrap.appendChild(div);
  });
}

function buildLayoutButtons() {
  const wrap = $('layout-buttons');
  wrap.innerHTML = '';
  for (const [id, layout] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = layout.label;
    b.className = id === state.layout ? 'active' : '';
    b.addEventListener('click', () => {
      state.layout = id;
      // Quad needs a fourth panel; other layouts use three.
      while (state.panels.length < LAYOUTS[id].panels.length) {
        state.panels.push({ source: { kind: 'scene', variant: 'dusk', seed: 37 }, zoom: 1, ox: 0, oy: 0 });
      }
      state.panels.length = LAYOUTS[id].panels.length;
      buildLayoutButtons();
      buildPanelControls();
      redraw();
    });
    wrap.appendChild(b);
  }
}

function buildGradeSelect() {
  const sel = $('grade');
  sel.innerHTML = '';
  for (const [id, grade] of Object.entries(GRADES)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = grade.label;
    sel.appendChild(opt);
  }
  sel.value = state.grade;
}

function buildSizeRadios() {
  const wrap = $('size-radios');
  wrap.innerHTML = '';
  for (const size of EXPORT_SIZES) {
    const label = document.createElement('label');
    label.className = 'radio';
    label.innerHTML = `<input type="radio" name="size" value="${size.id}"> ${size.label}`;
    label.querySelector('input').checked = size.id === state.sizeId;
    label.querySelector('input').addEventListener('change', () => {
      state.sizeId = size.id;
      redraw();
    });
    wrap.appendChild(label);
  }
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

$('photos').addEventListener('change', async (e) => {
  const files = [...e.target.files].slice(0, 3);
  for (const file of files) {
    const img = await loadImage(URL.createObjectURL(file));
    uploads.push({ kind: 'upload', img, name: file.name });
  }
  while (uploads.length > 3) uploads.shift();
  if (files.length) {
    // Put the newest upload into the selected panel so the change is visible.
    state.panels[state.selected].source = uploads[uploads.length - 1];
    statusEl.textContent = `${files.length} photo${files.length > 1 ? 's' : ''} loaded.`;
    buildPanelControls();
    redraw();
  }
});

$('fill-all').addEventListener('click', () => {
  const src = state.panels[state.selected].source;
  state.panels.forEach((p) => { p.source = src; });
  buildPanelControls();
  redraw();
  statusEl.textContent = 'All panels now use the selected photo.';
});

$('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
$('subcaption').addEventListener('input', (e) => { state.subcaption = e.target.value; redraw(); });
$('caption-size').addEventListener('input', (e) => { state.captionSize = Number(e.target.value); redraw(); });
$('caption-pos').addEventListener('change', (e) => { state.captionPos = e.target.value; redraw(); });
$('caption-color').addEventListener('change', (e) => { state.captionColor = e.target.value; redraw(); });
$('grade').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
$('frame').addEventListener('change', (e) => { state.frame = e.target.value; redraw(); });

$('export').addEventListener('click', async () => {
  const size = currentSize();
  statusEl.textContent = 'Exporting…';
  try {
    const blob = await exportCoverBlob(coverOpts(), size);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    statusEl.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (err) {
    statusEl.textContent = `Export failed: ${err.message}`;
  }
});

// Drag on the preview pans the selected panel's photo.
let drag = null;
preview.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, ox: state.panels[state.selected].ox, oy: state.panels[state.selected].oy };
  preview.setPointerCapture(e.pointerId);
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const panel = state.panels[state.selected];
  panel.ox = Math.max(-0.4, Math.min(0.4, drag.ox + (e.clientX - drag.x) / preview.width));
  panel.oy = Math.max(-0.4, Math.min(0.4, drag.oy + (e.clientY - drag.y) / preview.height));
  redraw();
});
preview.addEventListener('pointerup', () => { drag = null; buildPanelControls(); });

// --- Shot mode (screenshots) --------------------------------------------------
const shotApi = {
  applyShotState({ scene, caption, sub, layout, grade }) {
    state.caption = caption;
    if (sub) state.subcaption = sub;
    state.layout = layout;
    state.grade = grade;
    // Panels cycle through the three scenes starting at the requested one, so
    // a multi-panel cover shows variety instead of the same scene repeated.
    const order = ['sunset', 'neon', 'dusk'];
    const seeds = { sunset: 11, neon: 23, dusk: 37 };
    const start = Math.max(0, order.indexOf(scene));
    const variants = order.slice(start).concat(order.slice(0, start));
    // Make sure there is one panel per layout slot (quad needs a fourth).
    while (state.panels.length < LAYOUTS[layout].panels.length) {
      state.panels.push({ source: null, zoom: 1, ox: 0, oy: 0 });
    }
    state.panels.length = LAYOUTS[layout].panels.length;
    state.panels.forEach((p, i) => {
      const variant = variants[i % variants.length];
      // The repeated variant (quad's fourth panel) gets a fresh seed so its
      // skyline draws differently instead of cloning another panel.
      const seed = i < variants.length ? seeds[variant] : seeds[variant] + 60;
      p.source = { kind: 'scene', variant, seed };
      p.zoom = 1;
      p.ox = 0;
      p.oy = 0;
    });
    $('caption').value = caption;
    $('subcaption').value = state.subcaption;
    buildLayoutButtons();
    buildPanelControls();
    redraw();
  },
  waitPaint,
};

// --- Boot ----------------------------------------------------------------------
buildLayoutButtons();
buildGradeSelect();
buildSizeRadios();
buildPanelControls();
redraw();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), shotApi);
}

// Test hook: the exported cover at any size, as a PNG data URL.
window.__vice = {
  state,
  renderCover,
  exportCoverDataURL: async (w, h) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    renderCover(canvas, coverOpts());
    return canvas.toDataURL('image/png');
  },
};
