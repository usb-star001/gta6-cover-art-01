// Fixed scenes for screenshots: ?shot=cover shows the cover alone at a chosen
// size, ?shot=editor shows the editor with a sample photo loaded. The query picks
// the photo (a bundled sample), the caption, the layout and the aspect.
// window.__shotReady is set once the scene has painted.

/** Wait for two animation frames so the canvas has painted. */
function painted() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

export async function runShot(shot, query, api) {
  const photo = query.get('photo') ?? 'pier';
  const other = photo === 'pier' ? 'boulevard' : 'pier';
  api.setCaption(query.get('caption') ?? 'VICE CITY');
  api.setTagline(query.get('tagline') ?? 'SUNSET HEIST');
  api.setEyebrow(query.get('eyebrow') ?? 'VICE CITY');
  api.setLayout(query.get('layout') ?? 'hero');
  api.setAspect(query.get('aspect') ?? 'square');
  await api.loadSample(photo);
  await api.loadSample(other);
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch {
    // The fallback face still paints.
  }
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = (query.get('size') ?? '1080x1080').split('x').map(Number);
    api.renderCoverOnly(size[0], size[1]);
  } else {
    api.renderPreview();
  }
  await painted();
  window.__shotReady = true;
}
