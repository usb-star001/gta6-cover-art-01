// Neon Vice editor — wires the controls to the cover renderer, loads photos from
// the machine (or the bundled samples), and exports the cover as a PNG.
// Photos are read locally and never uploaded anywhere.

import { aspectOf, drawCover, panelAt, panelCount } from './render.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);

const PREVIEW_SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

const EXPORT_SIZES = [
  [1080, 1080],
  [1080, 1350],
  [1920, 1080],
];

// The cover state: photos are {img, name}; panels point at photos by index.
const state = {
  photos: [],
  panels: [
    { photo: 0, zoom: 1, dx: 0, dy: 0 },
    { photo: 1, zoom: 1, dx: 0, dy: 0 },
    { photo: 0, zoom: 1, dx: 0, dy: 0 },
    { photo: 1, zoom: 1, dx: 0, dy: 0 },
  ],
  layout: 'hero',
  aspect: 'square',
  caption: 'VICE CITY',
  tagline: 'SUNSET HEIST',
  eyebrow: 'VICE CITY',
  grade: 0.65,
  halftone: true,
  neon: true,
  selected: 0,
};

const preview = $('preview');
const previewCtx = preview.getContext('2d');

/** Resize the preview canvas to the current aspect and redraw the cover. */
function renderPreview() {
  const [w, h] = PREVIEW_SIZES[state.aspect];
  if (preview.width !== w) preview.width = w;
  if (preview.height !== h) preview.height = h;
  drawCover(previewCtx, w, h, state, { selection: true });
}

/** Rebuild the photo thumbnails; the selected panel's photo gets a teal ring. */
function refreshThumbs() {
  const box = $('thumbs');
  box.replaceChildren();
  state.photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = `${photo.name} — put in the selected panel`;
    if (state.panels[state.selected] && state.panels[state.selected].photo === i) {
      btn.classList.add('in-panel');
    }
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    btn.append(img);
    btn.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      refreshThumbs();
      refreshPanelControls();
      renderPreview();
    });
    box.append(btn);
  });
}

/** Sync the selected-panel controls with the state (photo, zoom, pan). */
function refreshPanelControls() {
  const count = panelCount(state.layout, state.aspect);
  if (state.selected >= count) state.selected = 0;
  const panel = state.panels[state.selected];
  $('panelLabel').textContent = `Panel ${state.selected + 1} of ${count} — click a panel in the preview to pick it.`;
  const select = $('panelPhoto');
  select.replaceChildren();
  state.photos.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = photo.name;
    select.append(opt);
  });
  if (state.photos.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No photo yet';
    select.append(opt);
  }
  select.value = String(panel.photo);
  $('zoom').value = String(panel.zoom);
  $('dx').value = String(panel.dx);
  $('dy').value = String(panel.dy);
  $('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
  $('dxVal').textContent = String(panel.dx.toFixed(2));
  $('dyVal').textContent = String(panel.dy.toFixed(2));
}

/** Draw the cover at an exact export size and hand back the canvas. */
function renderExportCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas.getContext('2d'), width, height, state, { selection: false });
  return canvas;
}

/** Export one PNG at an exact size; returns a promise that resolves when saved. */
function exportCover(width, height) {
  return new Promise((resolve) => {
    const canvas = renderExportCanvas(width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus('Export failed — the browser refused the PNG.');
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neon-vice-${width}x${height}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus(`Exported neon-vice-${width}x${height}.png (${Math.round(blob.size / 1024)} KiB).`);
      resolve(true);
    }, 'image/png');
  });
}

/** The same export as a data URL, for the screenshot scenes (scaled-down covers). */
function exportDataURL(width, height, type = 'image/jpeg', quality = 0.88) {
  return renderExportCanvas(width, height).toDataURL(type, quality);
}

function setStatus(text) {
  $('status').textContent = text;
}

/** Load an image from a URL (a sample) or a data URL (an upload). */
function loadImage(src, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, name });
    img.onerror = () => reject(new Error(`Could not load ${name}`));
    img.src = src;
  });
}

/** Load a bundled sample photo into the photo list. */
async function loadSample(name) {
  const photo = await loadImage(`samples/${name}.jpg`, `${name} sample`);
  state.photos.push(photo);
  refreshThumbs();
  refreshPanelControls();
  renderPreview();
  return photo;
}

/** Read uploaded files from the machine into the photo list. */
async function loadUploads(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      });
      const photo = await loadImage(dataUrl, file.name);
      state.photos.push(photo);
      added++;
    } catch {
      // A file that will not load is skipped; the others still land.
    }
  }
  if (added > 0) {
    refreshThumbs();
    refreshPanelControls();
    renderPreview();
    setStatus(`Added ${added} photo${added === 1 ? '' : 's'}. Click a thumbnail to place one.`);
  }
}

/** The selected panel's photo, or null when no photo is loaded yet. */
function selectedPanel() {
  return state.panels[state.selected];
}

/** Setters the screenshot scenes use, so one code path drives both. */
const api = {
  state,
  loadSample,
  setCaption(text) { state.caption = text; $('caption').value = text; },
  setTagline(text) { state.tagline = text; $('tagline').value = text; },
  setEyebrow(text) { state.eyebrow = text; $('eyebrow').value = text; },
  setLayout(layout) {
    state.layout = layout;
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === layout));
    refreshPanelControls();
  },
  setAspect(aspect) {
    state.aspect = aspect;
    document.querySelectorAll('[data-aspect]').forEach((b) => b.classList.toggle('on', b.dataset.aspect === aspect));
    refreshPanelControls();
  },
  renderPreview,
  exportDataURL,
  renderCoverOnly(width, height) {
    if (preview.width !== width) preview.width = width;
    if (preview.height !== height) preview.height = height;
    drawCover(previewCtx, width, height, state, { selection: false });
  },
};

/** Wire every control to the state, then load the samples and the display font. */
async function init() {
  $('upload').addEventListener('change', (e) => loadUploads(e.target.files));
  $('samplePier').addEventListener('click', () => loadSample('pier').catch(() => setStatus('Pier sample failed to load.')));
  $('sampleBoulevard').addEventListener('click', () => loadSample('boulevard').catch(() => setStatus('Boulevard sample failed to load.')));

  $('panelPhoto').addEventListener('change', (e) => {
    selectedPanel().photo = Number(e.target.value);
    refreshThumbs();
    renderPreview();
  });
  $('zoom').addEventListener('input', (e) => {
    selectedPanel().zoom = Number(e.target.value);
    refreshPanelControls();
    renderPreview();
  });
  $('dx').addEventListener('input', (e) => {
    selectedPanel().dx = Number(e.target.value);
    refreshPanelControls();
    renderPreview();
  });
  $('dy').addEventListener('input', (e) => {
    selectedPanel().dy = Number(e.target.value);
    refreshPanelControls();
    renderPreview();
  });
  $('fillAll').addEventListener('click', () => {
    const photo = selectedPanel().photo;
    state.panels.forEach((p) => { p.photo = photo; });
    refreshThumbs();
    renderPreview();
    setStatus('Every panel now shows the same photo.');
  });

  document.querySelectorAll('[data-layout]').forEach((btn) => {
    btn.addEventListener('click', () => api.setLayout(btn.dataset.layout));
  });
  document.querySelectorAll('[data-aspect]').forEach((btn) => {
    btn.addEventListener('click', () => {
      api.setAspect(btn.dataset.aspect);
      renderPreview();
    });
  });

  $('caption').addEventListener('input', (e) => { state.caption = e.target.value; renderPreview(); });
  $('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; renderPreview(); });
  $('eyebrow').addEventListener('input', (e) => { state.eyebrow = e.target.value; renderPreview(); });
  $('grade').addEventListener('input', (e) => {
    state.grade = Number(e.target.value) / 100;
    $('gradeVal').textContent = `${e.target.value}%`;
    renderPreview();
  });
  $('halftone').addEventListener('change', (e) => { state.halftone = e.target.checked; renderPreview(); });
  $('neon').addEventListener('change', (e) => { state.neon = e.target.checked; renderPreview(); });

  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [w, h] = btn.dataset.export.split('x').map(Number);
      exportCover(w, h);
    });
  });

  preview.addEventListener('click', (e) => {
    const rect = preview.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * preview.width;
    const py = ((e.clientY - rect.top) / rect.height) * preview.height;
    const hit = panelAt(state.layout, state.aspect, preview.width, preview.height, px, py);
    if (hit >= 0) {
      state.selected = hit;
      refreshThumbs();
      refreshPanelControls();
      renderPreview();
    }
  });

  // The display font ships with the app; wait for it before the first paint
  // so the caption never renders in a fallback face.
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch {
    // A missing font still leaves a usable bold fallback.
  }

  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, api);
    return;
  }

  try {
    await loadSample('pier');
    await loadSample('boulevard');
    setStatus('Ready — pick a panel, crop it, write a caption, export a PNG.');
  } catch {
    setStatus('Sample photos failed to load — upload your own to begin.');
  }
  renderPreview();
  refreshPanelControls();
}

// Test hook: the browser checks drive the app through this, never through clicks.
window.__viceCover = { api, state, exportCover, exportDataURL, renderPreview, EXPORT_SIZES };

init();
