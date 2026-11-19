// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor
// shows the full editor with a photo loaded. `scene` picks the sample scene,
// `caption` the words, `layout` and `grade` the look. window.__shotReady is
// set once the scene is painted, so a screenshot tool knows when to shoot.
export async function runShot(shot, query, api) {
  const scene = query.get('scene') ?? 'sunset';
  const caption = query.get('caption') ?? 'Vice Lights';
  const sub = query.get('sub') ?? null;
  const layout = query.get('layout') ?? 'triptych';
  const grade = query.get('grade') ?? 'sunset';
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    api.applyShotState({ scene, caption, sub, layout, grade });
  } else {
    api.applyShotState({ scene, caption, sub, layout, grade });
  }
  await api.waitPaint();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
