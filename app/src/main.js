// main.js — wires the editor: pick or upload a photo, reframe it, caption
// it, pick a grade and a format, export the PNG. A `?shot=` query sets up a
// fixed scene for screenshots instead of the defaults.
//
// The live preview and the export run the same renderCover() from cover.js,
// so what you see is exactly what the PNG holds.

import { renderCover, heroSourceRect, heroPanelRect, FORMATS } from './cover.js';
import { makeSceneCanvas, SAMPLE_PHOTOS, BACKDROP_SETS } from './scenes.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');

const state = {
  format: 'portrait',
  grade: 'sunset',
  caption: 'BOULEVARD QUEEN',
  subtitle: 'VICE CITY',
  focal: { x: 0.52, y: 0.55 },
  zoom: 1,
  sampleId: 'queen',
  uploaded: null, // an Image when the visitor uploads their own photo
  backdropOffset: 0,
};

// Caches: sample photos and backdrops are painted per grade so a grade
// switch re-grades the whole cover, scenes included.
const sampleCache = new Map();   // `${id}:${grade}` -> canvas
const backdropCache = new Map(); // grade -> [canvas, ...]

function samplePhoto(id, grade) {
  const key = `${id}:${grade}`;
  if (!sampleCache.has(key)) sampleCache.set(key, makeSceneCanvas(id, 1080, 1350, grade));
  return sampleCache.get(key);
}

function backdropsFor(grade) {
  if (!backdropCache.has(grade)) {
    backdropCache.set(grade, BACKDROP_SETS[grade].map((kind) => makeSceneCanvas(kind, 1080, 810, grade)));
  }
  return backdropCache.get(grade);
}

function currentPhoto() {
  return state.uploaded ?? samplePhoto(state.sampleId, state.grade);
}

function render() {
  const { w, h } = FORMATS[state.format];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderCover(ctx, w, h, {
    format: state.format,
    photo: currentPhoto(),
    focal: state.focal,
    zoom: state.zoom,
    caption: state.caption,
    subtitle: state.subtitle,
    grade: state.grade,
    backdrops: backdropsFor(state.grade),
    backdropOffset: state.backdropOffset,
  });
}

function renderThumbs() {
  for (const sample of SAMPLE_PHOTOS) {
    const el = document.querySelector(`[data-sample="${sample.id}"] canvas`);
    if (!el) continue;
    const img = samplePhoto(sample.id, state.grade);
    const tctx = el.getContext('2d');
    tctx.drawImage(img, 0, 0, el.width, el.height);
  }
}

function setStatus(text) {
  $('status').textContent = text;
}

function setFormat(format) {
  state.format = format;
  for (const btn of document.querySelectorAll('[data-format]')) {
    btn.classList.toggle('active', btn.dataset.format === format);
  }
  // The focal point is format-independent, so the crop carries over.
  render();
  setStatus(`Format ${FORMATS[format].label} — crop kept.`);
}

function setGrade(grade) {
  state.grade = grade;
  for (const btn of document.querySelectorAll('[data-grade]')) {
    btn.classList.toggle('active', btn.dataset.grade === grade);
  }
  renderThumbs();
  render();
  setStatus(grade === 'neon' ? 'Neon grade — deep navy, cyan + hot pink.' : 'Sunset grade — peach, coral, violet.');
}

function setSample(id) {
  state.sampleId = id;
  state.uploaded = null;
  const sample = SAMPLE_PHOTOS.find((s) => s.id === id);
  // Each sample ships with the focal point its composition was framed for.
  state.focal = sample && sample.focal ? { ...sample.focal } : { x: 0.5, y: 0.42 };
  state.zoom = 1;
  $('zoom').value = '1';
  $('zoomVal').textContent = '1.00×';
  for (const btn of document.querySelectorAll('[data-sample]')) {
    btn.classList.toggle('active', btn.dataset.sample === id);
  }
  if (sample) {
    state.caption = sample.caption;
    $('caption').value = sample.caption;
  }
  render();
  setStatus(`Sample photo: ${sample ? sample.label : id}.`);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function handleUpload(file) {
  if (!file) return;
  try {
    const img = await loadImage(URL.createObjectURL(file));
    state.uploaded = img;
    state.sampleId = 'upload';
    state.focal = { x: 0.5, y: 0.42 };
    state.zoom = 1;
    $('zoom').value = '1';
    $('zoomVal').textContent = '1.00×';
    for (const btn of document.querySelectorAll('[data-sample]')) btn.classList.remove('active');
    render();
    setStatus(`Your photo is in — drag it on the cover to reframe.`);
  } catch {
    setStatus('That file could not be read as an image.');
  }
}

// --- Drag to reframe the hero photo ---------------------------------------
// Dragging moves the photo under the pointer; the focal point follows, so the
// same crop survives a format switch.
let drag = null;

function canvasScale() {
  const rect = canvas.getBoundingClientRect();
  return { x: canvas.width / rect.width, y: canvas.height / rect.height };
}

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (canvas.width / rect.width);
  const py = (e.clientY - rect.top) * (canvas.height / rect.height);
  const hero = heroPanelRect(state.format, canvas.width, canvas.height);
  if (px < hero.x || px > hero.x + hero.w || py < hero.y || py > hero.y + hero.h) return;
  canvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, focal: { ...state.focal } };
  canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const photo = currentPhoto();
  const hero = heroPanelRect(state.format, canvas.width, canvas.height);
  const src = heroSourceRect(photo, hero.w, hero.h, drag.focal, state.zoom);
  const rect = canvas.getBoundingClientRect();
  const dxCss = e.clientX - drag.x;
  const dyCss = e.clientY - drag.y;
  // Content follows the pointer: move the focal point the other way.
  const dxImg = (dxCss / rect.width) * canvas.width / hero.w * src.sw;
  const dyImg = (dyCss / rect.height) * canvas.height / hero.h * src.sh;
  state.focal = {
    x: Math.min(1, Math.max(0, drag.focal.x - dxImg / photo.width)),
    y: Math.min(1, Math.max(0, drag.focal.y - dyImg / photo.height)),
  };
  render();
});

function endDrag() {
  if (!drag) return;
  drag = null;
  canvas.style.cursor = '';
  setStatus('Reframed — the crop carries across formats.');
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  setZoom(state.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
}, { passive: false });

function setZoom(z) {
  state.zoom = Math.min(3, Math.max(1, z));
  $('zoom').value = String(state.zoom);
  $('zoomVal').textContent = `${state.zoom.toFixed(2)}×`;
  render();
}

// --- Export ----------------------------------------------------------------
function exportPNGDataURL() {
  return new Promise((resolve) => {
    const { w, h } = FORMATS[state.format];
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    renderCover(off.getContext('2d'), w, h, {
      format: state.format,
      photo: currentPhoto(),
      focal: state.focal,
      zoom: state.zoom,
      caption: state.caption,
      subtitle: state.subtitle,
      grade: state.grade,
      backdrops: backdropsFor(state.grade),
      backdropOffset: state.backdropOffset,
    });
    off.toBlob((blob) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
}

async function downloadPNG() {
  const { w, h } = FORMATS[state.format];
  const dataUrl = await exportPNGDataURL();
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `vice-cover-${state.format}-${w}x${h}.png`;
  a.click();
  setStatus(`Saved vice-cover-${state.format}-${w}x${h}.png — ${w} × ${h}, no watermark.`);
}

// --- Controls ---------------------------------------------------------------
for (const btn of document.querySelectorAll('[data-format]')) {
  btn.addEventListener('click', () => setFormat(btn.dataset.format));
}
for (const btn of document.querySelectorAll('[data-grade]')) {
  btn.addEventListener('click', () => setGrade(btn.dataset.grade));
}
for (const btn of document.querySelectorAll('[data-sample]')) {
  btn.addEventListener('click', () => setSample(btn.dataset.sample));
}
$('upload').addEventListener('change', (e) => handleUpload(e.target.files[0]));
$('caption').addEventListener('input', (e) => { state.caption = e.target.value; render(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
$('zoom').addEventListener('input', (e) => setZoom(Number(e.target.value)));
$('swap').addEventListener('click', () => {
  state.backdropOffset = (state.backdropOffset + 1) % BACKDROP_SETS[state.grade].length;
  render();
  setStatus('Scenes swapped — same cover, new supporting panels.');
});
$('download').addEventListener('click', downloadPNG);

// --- Shot mode: fixed scenes for screenshots -------------------------------
// ?shot=cover&photo=queen&caption=BOULEVARD%20QUEEN&format=portrait&grade=sunset
// ?shot=editor&... (same, but the page stays an editor for a UI screenshot)
function applyShotParams() {
  const q = new URLSearchParams(location.search);
  if (!q.has('shot')) return;
  const photo = q.get('photo');
  if (photo && SAMPLE_PHOTOS.some((s) => s.id === photo)) {
    state.sampleId = photo;
    const sample = SAMPLE_PHOTOS.find((s) => s.id === photo);
    if (sample.focal) state.focal = { ...sample.focal };
  }
  const format = q.get('format');
  if (format && FORMATS[format]) state.format = format;
  const grade = q.get('grade');
  if (grade === 'sunset' || grade === 'neon') state.grade = grade;
  const caption = q.get('caption');
  if (caption !== null) state.caption = caption;
  const subtitle = q.get('subtitle');
  if (subtitle !== null) state.subtitle = subtitle;
  const focal = q.get('focal');
  if (focal) {
    const [fx, fy] = focal.split(',').map(Number);
    if (Number.isFinite(fx) && Number.isFinite(fy)) state.focal = { x: fx, y: fy };
  }
  const zoom = q.get('zoom');
  if (zoom && Number.isFinite(Number(zoom))) state.zoom = Number(zoom);
  $('caption').value = state.caption;
  $('subtitle').value = state.subtitle;
  $('zoom').value = String(state.zoom);
  $('zoomVal').textContent = `${state.zoom.toFixed(2)}×`;
  for (const btn of document.querySelectorAll('[data-format]')) {
    btn.classList.toggle('active', btn.dataset.format === state.format);
  }
  for (const btn of document.querySelectorAll('[data-grade]')) {
    btn.classList.toggle('active', btn.dataset.grade === state.grade);
  }
  for (const btn of document.querySelectorAll('[data-sample]')) {
    btn.classList.toggle('active', btn.dataset.sample === state.sampleId);
  }
}

// --- Boot -------------------------------------------------------------------
async function boot() {
  applyShotParams();
  // Anton (bundled locally) must be ready before the first paint: the neon
  // signs and the caption both set in it.
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch { /* fall back to the sans-serif in the stack */ }
  renderThumbs();
  render();
  window.__coverStudio = { exportPNGDataURL, state, render };
  window.__ready = true;
}

boot();
