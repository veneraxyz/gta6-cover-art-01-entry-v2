// cover.js — the cover engine: layouts, grades, lettering.
//
// One render function draws every format. The same code paints the live
// preview and the exported PNG, so the export always matches the preview.
//
// Layouts are asymmetric collages in the GTA cover tradition: a dominant
// hero panel carrying the uploaded photo, distinct supporting scenes, thick
// black dividers, and the caption lettered large over a quiet area with a
// gradient Roman numeral VI behind the wordmark.

import { mulberry32 } from './scenes.js';

export const FORMATS = {
  portrait: { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  square: { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  landscape: { w: 1920, h: 1080, label: 'Landscape · 1920 × 1080' },
};

// Panels are normalised rectangles (0..1 of the canvas). src 'photo' is the
// uploaded photo; src 'backdrop' takes backdrops[(idx + offset) % len].
const LAYOUTS = {
  portrait: {
    panels: [
      { x: 0, y: 0, w: 0.64, h: 0.60, src: 'photo' },
      { x: 0.64, y: 0, w: 0.36, h: 0.34, src: 'backdrop', idx: 0 },
      { x: 0.64, y: 0.34, w: 0.36, h: 0.26, src: 'backdrop', idx: 1 },
      { x: 0, y: 0.60, w: 0.46, h: 0.40, src: 'backdrop', idx: 2 },
      { x: 0.46, y: 0.60, w: 0.54, h: 0.40, src: 'backdrop', idx: 3 },
    ],
    title: { x: 0.05, baselineY: 0.955, maxW: 0.90, vi: { x: 0.88, y: 0.885 } },
  },
  square: {
    panels: [
      { x: 0, y: 0, w: 0.58, h: 0.62, src: 'photo' },
      { x: 0.58, y: 0, w: 0.42, h: 0.38, src: 'backdrop', idx: 0 },
      { x: 0.58, y: 0.38, w: 0.42, h: 0.24, src: 'backdrop', idx: 1 },
      { x: 0, y: 0.62, w: 1, h: 0.38, src: 'backdrop', idx: 2 },
    ],
    title: { x: 0.05, baselineY: 0.94, maxW: 0.90, vi: { x: 0.88, y: 0.815 } },
  },
  landscape: {
    panels: [
      { x: 0, y: 0, w: 0.66, h: 1, src: 'photo' },
      { x: 0.66, y: 0, w: 0.34, h: 0.5, src: 'backdrop', idx: 0 },
      { x: 0.66, y: 0.5, w: 0.34, h: 0.5, src: 'backdrop', idx: 1 },
    ],
    title: { x: 0.035, baselineY: 0.93, maxW: 0.60, vi: { x: 0.46, y: 0.82, scale: 2.3 } },
  },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// The source rectangle of `img` that cover-fills a panel of pw × ph, centred
// on the focal point (0..1 of the image) and zoomed in by `zoom` (≥ 1).
// The focal point is format-independent, so the crop survives format switches.
export function heroSourceRect(img, pw, ph, focal, zoom) {
  const iw = img.width, ih = img.height;
  const aspect = pw / ph;
  let sw, sh;
  if (iw / ih > aspect) { sh = ih; sw = ih * aspect; }
  else { sw = iw; sh = iw / aspect; }
  sw /= zoom; sh /= zoom;
  const sx = clamp(focal.x * iw - sw / 2, 0, Math.max(0, iw - sw));
  const sy = clamp(focal.y * ih - sh / 2, 0, Math.max(0, ih - sh));
  return { sx, sy, sw, sh };
}

export function heroPanelRect(format, W, H) {
  const p = LAYOUTS[format].panels[0];
  return { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
}

// Draws `img` cover-filling rect (x, y, w, h), optionally reframed.
function drawPanelImage(ctx, img, rect, grade, focal, zoom) {
  const src = heroSourceRect(img, rect.w, rect.h, focal ?? { x: 0.5, y: 0.5 }, zoom ?? 1);
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  ctx.filter = grade === 'neon'
    ? 'saturate(1.3) contrast(1.12) brightness(0.94)'
    : 'saturate(1.25) contrast(1.06) brightness(1.02)';
  ctx.drawImage(img, src.sx, src.sy, src.sw, src.sh, rect.x, rect.y, rect.w, rect.h);
  ctx.filter = 'none';
  gradeOverlay(ctx, rect, grade);
  ctx.restore();
}

// The grade as a set: warm sunset (peach highlights, coral sky, violet
// shadows, a little teal) or night neon (deep navy, cyan + hot pink as local
// accents, faces kept legible). No uniform colour wash.
function gradeOverlay(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (grade === 'neon') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(10,16,52,0.22)';
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'screen';
    let glow = ctx.createRadialGradient(x + w * 0.12, y + h * 0.95, 0, x + w * 0.12, y + h * 0.95, w * 0.8);
    glow.addColorStop(0, 'rgba(34,230,255,0.20)');
    glow.addColorStop(1, 'rgba(34,230,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, w, h);
    glow = ctx.createRadialGradient(x + w * 0.9, y + h * 0.08, 0, x + w * 0.9, y + h * 0.08, w * 0.7);
    glow.addColorStop(0, 'rgba(255,46,136,0.22)');
    glow.addColorStop(1, 'rgba(255,46,136,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, w, h);
  } else {
    ctx.globalCompositeOperation = 'overlay';
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,120,80,0.30)');
    g.addColorStop(0.45, 'rgba(255,150,110,0.05)');
    g.addColorStop(1, 'rgba(96,42,130,0.26)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(255,170,100,0.20)';
    ctx.fillRect(x, y, w, h);
    // A touch of teal low in the frame (water, signage).
    ctx.globalCompositeOperation = 'screen';
    const teal = ctx.createRadialGradient(x + w * 0.85, y + h * 0.9, 0, x + w * 0.85, y + h * 0.9, w * 0.6);
    teal.addColorStop(0, 'rgba(34,211,238,0.10)');
    teal.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = teal;
    ctx.fillRect(x, y, w, h);
  }
  // A whisper of vignette inside every panel.
  ctx.globalCompositeOperation = 'source-over';
  const vg = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = vg;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Fits the caption into maxW: one line at base size, else two lines, else
// shrink. Returns { lines, size }.
function fitTitle(ctx, text, maxW, baseSize) {
  const clean = (text || 'UNTITLED').trim().toUpperCase() || 'UNTITLED';
  ctx.font = `${baseSize}px Anton, sans-serif`;
  if (ctx.measureText(clean).width <= maxW) return { lines: [clean], size: baseSize };
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    // Split at the word boundary that best balances the two lines.
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const wide = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (!best || wide < best.wide) best = { lines: [a, b], wide };
    }
    let size = baseSize;
    while (size > baseSize * 0.55) {
      ctx.font = `${size}px Anton, sans-serif`;
      const wide = Math.max(...best.lines.map((l) => ctx.measureText(l).width));
      if (wide <= maxW) break;
      size -= 4;
    }
    return { lines: best.lines, size };
  }
  let size = baseSize;
  while (size > baseSize * 0.4) {
    ctx.font = `${size}px Anton, sans-serif`;
    if (ctx.measureText(clean).width <= maxW) break;
    size -= 4;
  }
  return { lines: [clean], size };
}

function drawTitleBlock(ctx, W, H, layout, caption, subtitle, grade) {
  const spec = layout.title;
  const baseSize = Math.round(Math.min(W, H * 1.25) * 0.125);
  const maxW = spec.maxW * W;
  const { lines, size } = fitTitle(ctx, caption, maxW, baseSize);
  const lineH = size * 0.98;
  const blockH = lines.length * lineH + (subtitle ? size * 0.42 : 0);
  const baseY = spec.baselineY * H;

  // Quiet the ground under the lettering: a dark scrim rising from the bottom.
  const scrimH = blockH + size * 1.1;
  const scrim = ctx.createLinearGradient(0, baseY - scrimH, 0, H);
  scrim.addColorStop(0, 'rgba(8,4,16,0)');
  scrim.addColorStop(0.45, 'rgba(8,4,16,0.55)');
  scrim.addColorStop(1, 'rgba(8,4,16,0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, baseY - scrimH, W, scrimH + 2);

  // The big gradient VI behind the wordmark.
  const viSize = Math.round(size * (spec.vi.scale ?? 2.7));
  const viX = spec.vi.x * W, viY = spec.vi.y * H;
  ctx.save();
  ctx.font = `${viSize}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const vg = ctx.createLinearGradient(0, viY - viSize * 0.55, 0, viY + viSize * 0.55);
  if (grade === 'neon') {
    vg.addColorStop(0, '#a5f3fc'); vg.addColorStop(0.4, '#22e6ff');
    vg.addColorStop(0.72, '#ff2e88'); vg.addColorStop(1, '#a855f7');
  } else {
    vg.addColorStop(0, '#ffe9a8'); vg.addColorStop(0.35, '#ff7e5f');
    vg.addColorStop(0.68, '#ff2e88'); vg.addColorStop(1, '#7b2ff7');
  }
  ctx.globalAlpha = 0.92;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(16,8,20,0.85)';
  ctx.lineWidth = viSize * 0.03;
  ctx.strokeText('VI', viX, viY);
  ctx.fillStyle = vg;
  ctx.fillText('VI', viX, viY);
  ctx.restore();

  // The caption: heavy squared silhouette, warm-white fill, near-black
  // outline, modest hard shadow. Readable at thumbnail size.
  ctx.save();
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowOffsetX = Math.round(size * 0.045);
  ctx.shadowOffsetY = Math.round(size * 0.055);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#14100e';
  ctx.lineWidth = size * 0.16;
  const tx = spec.x * W;
  lines.forEach((line, i) => {
    const ly = baseY - (lines.length - 1 - i) * lineH;
    ctx.strokeText(line, tx, ly);
    ctx.fillStyle = '#fff6e8';
    ctx.fillText(line, tx, ly);
  });
  ctx.restore();

  // Optional subtitle, letter-spaced, above the caption.
  if (subtitle && subtitle.trim()) {
    const subSize = Math.round(size * 0.24);
    ctx.save();
    ctx.font = `${subSize}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = grade === 'neon' ? '#7ef0ff' : '#ffd98a';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2; ctx.shadowBlur = 0;
    ctx.fillText(subtitle.trim().toUpperCase(), tx + size * 0.03, baseY - lines.length * lineH - size * 0.16);
    ctx.restore();
  }
}

// A fixed-seed print grain, identical in preview and export.
function drawGrain(ctx, W, H) {
  const rng = mulberry32(1337);
  const n = Math.round((W * H) / 2600);
  for (let i = 0; i < n; i++) {
    const x = rng() * W, y = rng() * H;
    ctx.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 1 + rng() * 1.6, 1 + rng() * 1.6);
  }
}

// Renders the whole cover into ctx at W × H.
// opts: { photo, focal {x,y}, zoom, caption, subtitle, grade, backdrops, backdropOffset }
export function renderCover(ctx, W, H, opts) {
  const format = opts.format ?? 'portrait';
  const layout = LAYOUTS[format];
  const gap = Math.max(8, Math.round(W * 0.011));
  const half = gap / 2;

  // Black ground: the dividers and the poster's outer frame.
  ctx.fillStyle = '#0a0710';
  ctx.fillRect(0, 0, W, H);

  for (const panel of layout.panels) {
    const rect = {
      x: panel.x * W + half,
      y: panel.y * H + half,
      w: panel.w * W - gap,
      h: panel.h * H - gap,
    };
    if (panel.src === 'photo') {
      if (opts.photo) drawPanelImage(ctx, opts.photo, rect, opts.grade, opts.focal, opts.zoom);
    } else {
      const list = opts.backdrops ?? [];
      if (list.length) {
        const img = list[(panel.idx + (opts.backdropOffset ?? 0)) % list.length];
        drawPanelImage(ctx, img, rect, opts.grade);
      }
    }
  }

  drawTitleBlock(ctx, W, H, layout, opts.caption, opts.subtitle, opts.grade);

  // Whole-cover vignette + grain.
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  drawGrain(ctx, W, H);
}
