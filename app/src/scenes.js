// scenes.js — every picture in Vice Cover Studio II is drawn here, in code.
//
// No photos are shipped and nothing is fetched: the sample "photos" and the
// Vice City backdrops are procedural canvas illustrations (bold flat shapes,
// sunset gradients, dark silhouettes) painted fresh at load. That keeps the
// app fully offline and every asset its own work.
//
// Each painter takes (ctx, w, h, grade) and fills the whole canvas.
// grade is 'sunset' or 'neon'; painters pick their palette from PAL.

export const GRADES = ['sunset', 'neon'];

export const PAL = {
  sunset: {
    skyTop: '#251242', skyMid: '#7b2d5e', skyLow: '#ff5e6c', horizon: '#ffb36b',
    sun: '#fff3c4', sunGlow: 'rgba(255,154,92,0.55)',
    far: '#4a2358', near: '#1d0f30', silhouette: '#160a24',
    water: '#5b2a5e', waterHi: '#ffcf8a', rim: '#ffb36b',
    neonA: '#ff2e88', neonB: '#22e6ff', window: '#ffd98a',
    road: '#241133', roadLine: '#ffd98a', face: '#3a2140',
  },
  neon: {
    skyTop: '#030614', skyMid: '#0b1030', skyLow: '#1b1445', horizon: '#3b1d5e',
    sun: '#ffd9ec', sunGlow: 'rgba(255,46,136,0.45)',
    far: '#120a2e', near: '#0a0618', silhouette: '#05030f',
    water: '#0a1230', waterHi: '#22e6ff', rim: '#22e6ff',
    neonA: '#ff2e88', neonB: '#22e6ff', window: '#7ef0ff',
    road: '#0a0a1c', roadLine: '#7ef0ff', face: '#1c1638',
  },
};

// Deterministic PRNG so a scene paints the same way every time.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vgrad(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

export function paintSky(ctx, w, h, pal, horizonAt = 0.62) {
  ctx.fillStyle = vgrad(ctx, w, h, [
    [0, pal.skyTop], [0.42, pal.skyMid], [horizonAt, pal.skyLow], [1, pal.horizon],
  ]);
  ctx.fillRect(0, 0, w, h);
}

export function paintStars(ctx, w, h, rng, count = 90, maxY = 0.45) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < count; i++) {
    const x = rng() * w, y = rng() * h * maxY;
    const r = rng() < 0.12 ? 1.8 : 0.9;
    ctx.globalAlpha = 0.25 + rng() * 0.6;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function paintSun(ctx, x, y, r, pal, striped = false) {
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3.2);
  glow.addColorStop(0, pal.sunGlow);
  glow.addColorStop(1, 'rgba(255,120,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, '#fffbe8'); g.addColorStop(0.55, pal.sun); g.addColorStop(1, '#ff9a5c');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  if (striped) {
    // Retro sun slats across the lower half.
    ctx.fillStyle = 'rgba(122,45,94,0.55)';
    let yy = y + r * 0.08, hh = r * 0.05;
    while (yy < y + r) { ctx.fillRect(x - r, yy, r * 2, hh); yy += hh * 2.6; hh *= 1.35; }
  }
  ctx.restore();
}

// A row of buildings along yBase, heights up to hMax. Returns nothing.
export function paintSkyline(ctx, w, yBase, hMax, color, rng, opts = {}) {
  const { windows = true, windowColor = '#ffd98a', deco = 0.35 } = opts;
  let x = -10;
  ctx.fillStyle = color;
  while (x < w + 10) {
    const bw = 34 + rng() * 86;
    const bh = hMax * (0.28 + rng() * 0.72);
    const top = yBase - bh;
    ctx.fillRect(x, top, bw, bh);
    if (rng() < deco) {
      // Art-deco stepped crown.
      const sw = bw * 0.62, sh = bh * 0.16;
      ctx.fillRect(x + (bw - sw) / 2, top - sh, sw, sh);
      ctx.fillRect(x + (bw - sw * 0.5) / 2, top - sh * 1.8, sw * 0.5, sh * 0.8);
    }
    if (rng() < 0.22) {
      ctx.fillRect(x + bw / 2 - 1, top - bh * 0.22, 2, bh * 0.22);
      ctx.beginPath(); ctx.arc(x + bw / 2, top - bh * 0.22, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    if (windows) {
      ctx.fillStyle = windowColor;
      const cols = Math.max(1, Math.floor(bw / 16));
      const rows = Math.max(1, Math.floor(bh / 22));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rng() < 0.34) {
            ctx.globalAlpha = 0.5 + rng() * 0.5;
            ctx.fillRect(x + 5 + c * 16, top + 8 + r * 22, 7, 10);
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
    }
    x += bw + 2 + rng() * 14;
  }
}

// Water band with a shimmering sun column under sunX.
export function paintWater(ctx, x, y, w, h, pal, sunX, rng) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, pal.water); g.addColorStop(1, pal.near);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = pal.waterHi;
  for (let i = 0; i < 46; i++) {
    const t = rng();
    const yy = y + t * h;
    const spread = 14 + t * 90;
    const xx = sunX + (rng() - 0.5) * 2 * spread;
    const len = 14 + rng() * (26 + t * 70);
    ctx.globalAlpha = 0.10 + (1 - t) * 0.5;
    ctx.fillRect(xx - len / 2, yy, len, 2 + t * 2.5);
  }
  ctx.globalAlpha = 1;
}

// A palm tree; (x, y) is the ground point, h the height, lean in radians.
export function paintPalm(ctx, x, y, h, pal, rng, lean = 0.12) {
  const topX = x + Math.sin(lean) * h * 0.9;
  const topY = y - h;
  ctx.strokeStyle = pal.silhouette;
  ctx.lineCap = 'round';
  // Trunk: a tapered filled shape.
  ctx.fillStyle = pal.silhouette;
  ctx.beginPath();
  ctx.moveTo(x - h * 0.022, y);
  ctx.quadraticCurveTo(x + Math.sin(lean) * h * 0.35, y - h * 0.55, topX - h * 0.012, topY);
  ctx.lineTo(topX + h * 0.012, topY);
  ctx.quadraticCurveTo(x + Math.sin(lean) * h * 0.35 + h * 0.03, y - h * 0.5, x + h * 0.022, y);
  ctx.closePath(); ctx.fill();
  // Fronds: thin lens shapes fanning from the crown.
  const fronds = 8;
  for (let i = 0; i < fronds; i++) {
    const a = Math.PI * (0.08 + (i / (fronds - 1)) * 0.84) + (rng() - 0.5) * 0.1;
    const len = h * (0.34 + rng() * 0.16);
    const tipX = topX + Math.cos(a) * len;
    const tipY = topY - Math.sin(a) * len * 0.55 + len * 0.28;
    const midX = topX + Math.cos(a) * len * 0.55;
    const midY = topY - Math.sin(a) * len * 0.75 - len * 0.06;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX + len * 0.04, midY + len * 0.10, topX, topY + h * 0.012);
    ctx.closePath(); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(topX - h * 0.02, topY + h * 0.02, h * 0.018, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(topX + h * 0.02, topY + h * 0.03, h * 0.016, 0, Math.PI * 2); ctx.fill();
}

// A sleek coupe in side profile. (cx, cy) is the ground centre, w the length.
export function paintCar(ctx, cx, cy, w, pal, opts = {}) {
  const { facing = 1, glow = true } = opts;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(facing, 1);
  const u = w / 100; // 1 unit = 1% of car length
  // Ground shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(0, 1.5 * u, 52 * u, 4 * u, 0, 0, Math.PI * 2); ctx.fill();
  // Body silhouette.
  const body = new Path2D();
  body.moveTo(-50 * u, -8 * u);
  body.quadraticCurveTo(-52 * u, -15 * u, -44 * u, -17 * u); // front bumper
  body.lineTo(-20 * u, -20 * u);                              // hood
  body.quadraticCurveTo(-8 * u, -30 * u, 2 * u, -30 * u);     // windshield
  body.lineTo(16 * u, -30 * u);                               // roof
  body.quadraticCurveTo(28 * u, -29 * u, 36 * u, -20 * u);    // rear window
  body.lineTo(47 * u, -18 * u);                               // trunk
  body.quadraticCurveTo(52 * u, -16 * u, 51 * u, -8 * u);     // rear
  body.lineTo(41 * u, -8 * u);
  body.arc(32 * u, -8 * u, 10.5 * u, 0, Math.PI, true);       // rear wheel arch
  body.lineTo(-22 * u, -8 * u);
  body.arc(-32 * u, -8 * u, 10.5 * u, 0, Math.PI, true);      // front wheel arch
  body.closePath();
  // Rim light: the same shape shifted toward the sun, peeking out on top.
  ctx.fillStyle = pal.rim;
  ctx.save(); ctx.translate(-1.5 * u, -2 * u); ctx.fill(body); ctx.restore();
  ctx.fillStyle = pal.silhouette;
  ctx.fill(body);
  // Cabin glass.
  ctx.fillStyle = pal.skyLow;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(-14 * u, -21 * u);
  ctx.quadraticCurveTo(-5 * u, -28.5 * u, 2 * u, -28.5 * u);
  ctx.lineTo(15 * u, -28.5 * u);
  ctx.quadraticCurveTo(25 * u, -27.5 * u, 31 * u, -21 * u);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  // Wheels.
  for (const wx of [-32 * u, 32 * u]) {
    ctx.fillStyle = '#0a0614';
    ctx.beginPath(); ctx.arc(wx, -8 * u, 8.6 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d9d4e8';
    ctx.beginPath(); ctx.arc(wx, -8 * u, 4.2 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a0614';
    ctx.beginPath(); ctx.arc(wx, -8 * u, 1.6 * u, 0, Math.PI * 2); ctx.fill();
  }
  // Lights.
  if (glow) {
    ctx.fillStyle = '#fff6c9';
    ctx.beginPath(); ctx.ellipse(-49 * u, -14 * u, 3.2 * u, 1.6 * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff2e4d';
    ctx.beginPath(); ctx.ellipse(49 * u, -14.5 * u, 2.8 * u, 1.5 * u, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// A waist-up person silhouette. (cx, cy) is the bottom centre of the figure,
// u is the head-radius unit. opts: hair 'long'|'short'|'bun', glasses bool,
// lean in radians, earring bool.
export function paintPerson(ctx, cx, cy, u, pal, opts = {}) {
  const { hair = 'long', glasses = true, lean = 0, earring = false } = opts;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(lean);
  // One silhouette path (torso + neck + head + hair) so the rim light is a
  // single shifted copy peeking out on the sun side.
  const body = new Path2D();
  // Torso: wide shoulders tapering to the waist.
  body.moveTo(-2.35 * u, 2.6 * u);
  body.quadraticCurveTo(-2.5 * u, 0.2 * u, -1.9 * u, -0.55 * u);
  body.quadraticCurveTo(-1.1 * u, -0.95 * u, -0.34 * u, -0.85 * u);
  body.lineTo(-0.30 * u, -1.25 * u);
  body.lineTo(0.30 * u, -1.25 * u);
  body.lineTo(0.34 * u, -0.85 * u);
  body.quadraticCurveTo(1.1 * u, -0.95 * u, 1.9 * u, -0.55 * u);
  body.quadraticCurveTo(2.5 * u, 0.2 * u, 2.35 * u, 2.6 * u);
  body.closePath();
  // Head.
  body.moveTo(0.62 * u, -1.55 * u);
  body.ellipse(0, -1.55 * u, 0.62 * u, 0.72 * u, 0, 0, Math.PI * 2);
  // Hair.
  if (hair === 'long') {
    body.moveTo(-1.02 * u, -0.35 * u);
    body.bezierCurveTo(-1.15 * u, -1.4 * u, -0.95 * u, -2.45 * u, 0, -2.5 * u);
    body.bezierCurveTo(0.95 * u, -2.45 * u, 1.15 * u, -1.4 * u, 1.02 * u, -0.35 * u);
    body.quadraticCurveTo(0.8 * u, -0.15 * u, 0.62 * u, -0.55 * u);
    body.lineTo(0.55 * u, -1.9 * u);
    body.quadraticCurveTo(0, -2.2 * u, -0.55 * u, -1.9 * u);
    body.lineTo(-0.62 * u, -0.55 * u);
    body.quadraticCurveTo(-0.8 * u, -0.15 * u, -1.02 * u, -0.35 * u);
    body.closePath();
  } else if (hair === 'bun') {
    body.moveTo(0, -2.5 * u);
    body.ellipse(0, -2.35 * u, 0.42 * u, 0.34 * u, 0, 0, Math.PI * 2);
    body.moveTo(-0.7 * u, -1.75 * u);
    body.quadraticCurveTo(-0.68 * u, -2.35 * u, 0, -2.38 * u);
    body.quadraticCurveTo(0.68 * u, -2.35 * u, 0.7 * u, -1.75 * u);
    body.quadraticCurveTo(0.62 * u, -1.95 * u, 0.4 * u, -1.98 * u);
    body.lineTo(-0.4 * u, -1.98 * u);
    body.quadraticCurveTo(-0.62 * u, -1.95 * u, -0.7 * u, -1.75 * u);
    body.closePath();
  } else {
    body.moveTo(-0.66 * u, -1.6 * u);
    body.quadraticCurveTo(-0.66 * u, -2.3 * u, 0, -2.32 * u);
    body.quadraticCurveTo(0.66 * u, -2.3 * u, 0.66 * u, -1.6 * u);
    body.quadraticCurveTo(0.6 * u, -1.9 * u, 0.3 * u, -1.95 * u);
    body.lineTo(-0.3 * u, -1.95 * u);
    body.quadraticCurveTo(-0.6 * u, -1.9 * u, -0.66 * u, -1.6 * u);
    body.closePath();
  }
  ctx.fillStyle = pal.rim;
  ctx.save(); ctx.translate(-0.09 * u, -0.07 * u); ctx.fill(body); ctx.restore();
  ctx.fillStyle = pal.silhouette;
  ctx.fill(body);
  // The face: one shade lighter than the hair, so the head reads as a face
  // with the glasses on top rather than a single dark oval.
  ctx.fillStyle = pal.face;
  ctx.beginPath(); ctx.ellipse(0, -1.5 * u, 0.5 * u, 0.6 * u, 0, 0, Math.PI * 2); ctx.fill();
  // Jacket details: lapels and a centre line, in a slightly lighter shade.
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = Math.max(1.5, u * 0.05);
  ctx.beginPath();
  ctx.moveTo(-0.3 * u, -0.8 * u); ctx.lineTo(-0.75 * u, 0.1 * u); ctx.lineTo(-0.3 * u, 0.55 * u);
  ctx.moveTo(0.3 * u, -0.8 * u); ctx.lineTo(0.75 * u, 0.1 * u); ctx.lineTo(0.3 * u, 0.55 * u);
  ctx.moveTo(0, -0.7 * u); ctx.lineTo(0, 2.5 * u);
  ctx.stroke();
  if (glasses) {
    ctx.fillStyle = '#0a0614';
    roundRect(ctx, -0.52 * u, -1.72 * u, 0.44 * u, 0.3 * u, 0.08 * u); ctx.fill();
    roundRect(ctx, 0.08 * u, -1.72 * u, 0.44 * u, 0.3 * u, 0.08 * u); ctx.fill();
    ctx.strokeStyle = '#0a0614';
    ctx.lineWidth = Math.max(1.5, u * 0.05);
    ctx.beginPath(); ctx.moveTo(-0.08 * u, -1.6 * u); ctx.lineTo(0.08 * u, -1.6 * u); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1, u * 0.035);
    ctx.beginPath();
    ctx.moveTo(-0.46 * u, -1.5 * u); ctx.lineTo(-0.28 * u, -1.66 * u);
    ctx.moveTo(0.14 * u, -1.5 * u); ctx.lineTo(0.32 * u, -1.66 * u);
    ctx.stroke();
  }
  if (earring) {
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath(); ctx.arc(-0.78 * u, -1.05 * u, 0.09 * u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0.78 * u, -1.05 * u, 0.09 * u, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// A full-body standing silhouette. (cx, cy) is the feet centre, h the height.
export function paintStandingFigure(ctx, cx, cy, h, pal, opts = {}) {
  const { lean = 0, bag = false, glasses = false } = opts;
  const u = h / 7.2; // head radius unit
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(lean);
  const body = new Path2D();
  // Legs.
  body.moveTo(-0.55 * u, 0);
  body.lineTo(-0.5 * u, -3.1 * u);
  body.lineTo(-0.08 * u, -3.1 * u);
  body.lineTo(-0.02 * u, -1.2 * u);
  body.lineTo(0.06 * u, -3.1 * u);
  body.lineTo(0.5 * u, -3.1 * u);
  body.lineTo(0.55 * u, 0);
  body.closePath();
  // Torso.
  body.moveTo(-0.85 * u, -3.0 * u);
  body.quadraticCurveTo(-0.95 * u, -4.6 * u, -0.6 * u, -5.0 * u);
  body.lineTo(-0.28 * u, -5.1 * u);
  body.lineTo(-0.26 * u, -5.5 * u);
  body.lineTo(0.26 * u, -5.5 * u);
  body.lineTo(0.28 * u, -5.1 * u);
  body.lineTo(0.6 * u, -5.0 * u);
  body.quadraticCurveTo(0.95 * u, -4.6 * u, 0.85 * u, -3.0 * u);
  body.closePath();
  // Head.
  body.moveTo(0.5 * u, -5.85 * u);
  body.ellipse(0, -5.85 * u, 0.5 * u, 0.58 * u, 0, 0, Math.PI * 2);
  // Arms.
  body.moveTo(-0.9 * u, -4.9 * u);
  body.quadraticCurveTo(-1.25 * u, -4.2 * u, -1.05 * u, -3.3 * u);
  body.lineTo(-0.8 * u, -3.35 * u);
  body.quadraticCurveTo(-0.9 * u, -4.1 * u, -0.7 * u, -4.7 * u);
  body.closePath();
  body.moveTo(0.9 * u, -4.9 * u);
  body.quadraticCurveTo(1.25 * u, -4.2 * u, 1.05 * u, -3.3 * u);
  body.lineTo(0.8 * u, -3.35 * u);
  body.quadraticCurveTo(0.9 * u, -4.1 * u, 0.7 * u, -4.7 * u);
  body.closePath();
  ctx.fillStyle = pal.rim;
  ctx.save(); ctx.translate(-0.07 * u, -0.05 * u); ctx.fill(body); ctx.restore();
  ctx.fillStyle = pal.silhouette;
  ctx.fill(body);
  if (glasses) {
    ctx.fillStyle = '#0a0614';
    roundRect(ctx, -0.42 * u, -6.0 * u, 0.36 * u, 0.24 * u, 0.06 * u); ctx.fill();
    roundRect(ctx, 0.06 * u, -6.0 * u, 0.36 * u, 0.24 * u, 0.06 * u); ctx.fill();
  }
  if (bag) {
    // Duffel bag at the figure's right hand.
    ctx.fillStyle = pal.silhouette;
    roundRect(ctx, 0.95 * u, -3.5 * u, 1.35 * u, 0.95 * u, 0.3 * u); ctx.fill();
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = Math.max(1, u * 0.04);
    ctx.beginPath(); ctx.moveTo(1.3 * u, -3.5 * u); ctx.quadraticCurveTo(1.6 * u, -4.0 * u, 1.95 * u, -3.5 * u); ctx.stroke();
  }
  ctx.restore();
}

// A glowing neon sign: rounded frame + short text in Anton.
export function paintNeonSign(ctx, x, y, w, h, text, color, sub = '') {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = h * 0.35;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, h * 0.06);
  roundRect(ctx, x, y, w, h, h * 0.18); ctx.stroke();
  ctx.shadowBlur = h * 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.floor(h * 0.52)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + (sub ? -h * 0.12 : h * 0.02));
  if (sub) {
    ctx.font = `${Math.floor(h * 0.2)}px Anton, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(sub, x + w / 2, y + h * 0.78);
  }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A motorcycle with a leaning rider. (cx, cy) is the ground centre, w length.
export function paintBike(ctx, cx, cy, w, pal) {
  const u = w / 100;
  ctx.save();
  ctx.translate(cx, cy);
  // Neon underglow: a cyan pool of light that lifts the bike off the dark road.
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 52 * u);
  glow.addColorStop(0, 'rgba(34,230,255,0.30)');
  glow.addColorStop(0.6, 'rgba(34,230,255,0.10)');
  glow.addColorStop(1, 'rgba(34,230,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.ellipse(0, 1.5 * u, 56 * u, 7 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(0, 1.5 * u, 52 * u, 3.5 * u, 0, 0, Math.PI * 2); ctx.fill();
  // Wheels.
  for (const wx of [-30 * u, 30 * u]) {
    ctx.fillStyle = '#0a0614';
    ctx.beginPath(); ctx.arc(wx, -11 * u, 11 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#241a33';
    ctx.beginPath(); ctx.arc(wx, -11 * u, 7 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d9d4e8';
    ctx.beginPath(); ctx.arc(wx, -11 * u, 2.2 * u, 0, Math.PI * 2); ctx.fill();
  }
  // Frame + tank + seat, one silhouette path.
  ctx.fillStyle = pal.silhouette;
  const frame = new Path2D();
  frame.moveTo(-30 * u, -11 * u);
  frame.lineTo(-8 * u, -26 * u);
  frame.lineTo(6 * u, -27 * u);
  frame.quadraticCurveTo(16 * u, -27 * u, 20 * u, -22 * u);
  frame.lineTo(30 * u, -11 * u);
  frame.lineTo(24 * u, -11 * u);
  frame.lineTo(10 * u, -20 * u);
  frame.lineTo(-6 * u, -19 * u);
  frame.lineTo(-24 * u, -11 * u);
  frame.closePath();
  ctx.fill(frame);
  // Front fork + handlebar.
  ctx.strokeStyle = pal.silhouette;
  ctx.lineWidth = 3.4 * u;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-30 * u, -11 * u); ctx.lineTo(-16 * u, -30 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-16 * u, -30 * u); ctx.lineTo(-8 * u, -28 * u); ctx.stroke();
  // Headlight beam.
  const beam = ctx.createLinearGradient(-34 * u, -22 * u, -95 * u, -14 * u);
  beam.addColorStop(0, 'rgba(255,246,201,0.75)');
  beam.addColorStop(1, 'rgba(255,246,201,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(-33 * u, -24 * u);
  ctx.lineTo(-95 * u, -34 * u);
  ctx.lineTo(-95 * u, -2 * u);
  ctx.lineTo(-33 * u, -18 * u);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff6c9';
  ctx.beginPath(); ctx.arc(-33 * u, -21 * u, 3 * u, 0, Math.PI * 2); ctx.fill();
  // Rider: helmet + leaning torso, drawn in the local frame.
  ctx.fillStyle = pal.silhouette;
  ctx.beginPath(); ctx.arc(-2 * u, -44 * u, 7.5 * u, 0, Math.PI * 2); ctx.fill(); // helmet
  ctx.fillStyle = pal.neonB;
  ctx.beginPath(); ctx.arc(-4 * u, -45 * u, 6 * u, Math.PI * 0.9, Math.PI * 1.7); ctx.lineTo(-4 * u, -45 * u); ctx.fill(); // visor
  // Pink rim light from the neon signs: lifts the rider off the dark street.
  ctx.strokeStyle = pal.neonA;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2 * u;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-2 * u, -44 * u, 7.5 * u, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-12 * u, -29 * u); ctx.quadraticCurveTo(-13 * u, -39 * u, -6 * u, -41 * u); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.silhouette;
  ctx.beginPath();
  ctx.moveTo(-12 * u, -27 * u);
  ctx.quadraticCurveTo(-14 * u, -40 * u, -6 * u, -42 * u);
  ctx.quadraticCurveTo(2 * u, -40 * u, 6 * u, -30 * u);
  ctx.lineTo(10 * u, -25 * u);
  ctx.lineTo(-4 * u, -24 * u);
  ctx.closePath(); ctx.fill();
  // Rider's leg to the peg.
  ctx.strokeStyle = pal.silhouette;
  ctx.lineWidth = 5 * u;
  ctx.beginPath(); ctx.moveTo(4 * u, -27 * u); ctx.lineTo(12 * u, -16 * u); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Scene compositions. Each fills the whole canvas. The three SAMPLE_PHOTOS
// are the "photos" a visitor starts from; the BACKDROPS fill the supporting
// panels of a cover. All drawn, nothing fetched.
// ---------------------------------------------------------------------------

function sceneQueen(ctx, w, h, pal, rng) {
  paintSky(ctx, w, h, pal, 0.66);
  const sunX = w * 0.70, sunY = h * 0.30;
  paintSun(ctx, sunX, sunY, Math.min(w, h) * 0.15, pal, true);
  // Distant skyline + water strip behind the figure.
  paintSkyline(ctx, w, h * 0.72, h * 0.16, pal.far, rng, { windows: false });
  paintWater(ctx, 0, h * 0.72, w, h * 0.14, pal, sunX, rng);
  paintSkyline(ctx, w, h * 0.74, h * 0.1, pal.near, rng, { windows: true, windowColor: pal.window });
  // Framing palms.
  paintPalm(ctx, w * 0.03, h * 0.76, h * 0.44, pal, rng, 0.22);
  paintPalm(ctx, w * 0.99, h * 0.74, h * 0.38, pal, rng, -0.18);
  // The queen: dominant, centre-right, rim-lit by the sun. Her head and
  // shoulders sit in the middle band, so every hero crop keeps her face.
  paintPerson(ctx, w * 0.52, h * 0.86, Math.min(w, h) * 0.12, pal,
    { hair: 'long', glasses: true, earring: true, lean: -0.03 });
}

function sceneRider(ctx, w, h, pal, rng) {
  paintSky(ctx, w, h, pal, 0.6);
  paintStars(ctx, w, h, rng, 110, 0.5);
  const sunX = w * 0.16, sunY = h * 0.18;
  paintSun(ctx, sunX, sunY, Math.min(w, h) * 0.09, pal, false);
  // Night street: buildings with neon. The palm goes behind the signs so it
  // never covers their text.
  paintSkyline(ctx, w, h * 0.62, h * 0.42, pal.near, rng, { windows: true, windowColor: pal.window });
  paintPalm(ctx, w * 0.97, h * 0.64, h * 0.4, pal, rng, -0.2);
  paintNeonSign(ctx, w * 0.10, h * 0.22, w * 0.2, h * 0.075, 'VICE', pal.neonA, 'OCEAN DR');
  paintNeonSign(ctx, w * 0.60, h * 0.14, w * 0.18, h * 0.06, '24H', pal.neonB);
  paintNeonSign(ctx, w * 0.58, h * 0.36, w * 0.13, h * 0.05, 'BAR', pal.neonA);
  // Wet street with neon reflections.
  const roadY = h * 0.62;
  ctx.fillStyle = pal.road;
  ctx.fillRect(0, roadY, w, h - roadY);
  ctx.fillStyle = pal.neonA;
  for (let i = 0; i < 26; i++) {
    const t = rng();
    ctx.globalAlpha = 0.12 + (1 - t) * 0.4;
    ctx.fillRect(w * (0.12 + rng() * 0.16), roadY + t * (h - roadY), 3 + rng() * 8, 4 + t * 10);
  }
  ctx.fillStyle = pal.neonB;
  for (let i = 0; i < 22; i++) {
    const t = rng();
    ctx.globalAlpha = 0.12 + (1 - t) * 0.4;
    ctx.fillRect(w * (0.60 + rng() * 0.18), roadY + t * (h - roadY), 3 + rng() * 8, 4 + t * 10);
  }
  ctx.globalAlpha = 1;
  // The rider: big, low, centre — in the middle band, not at the floor.
  paintBike(ctx, w * 0.5, h * 0.78, w * 0.84, pal);
}

function sceneHeist(ctx, w, h, pal, rng) {
  paintSky(ctx, w, h, pal, 0.6);
  const sunX = w * 0.5, sunY = h * 0.32;
  paintSun(ctx, sunX, sunY, Math.min(w, h) * 0.14, pal, true);
  // Boulevard in perspective: buildings + palms converging on the sun.
  paintSkyline(ctx, w, h * 0.55, h * 0.3, pal.far, rng, { windows: false });
  paintSkyline(ctx, w, h * 0.57, h * 0.2, pal.near, rng, { windows: true, windowColor: pal.window });
  paintPalm(ctx, w * 0.06, h * 0.58, h * 0.38, pal, rng, 0.2);
  paintPalm(ctx, w * 0.94, h * 0.58, h * 0.38, pal, rng, -0.2);
  // Road.
  ctx.fillStyle = pal.road;
  ctx.beginPath();
  ctx.moveTo(w * 0.32, h * 0.57); ctx.lineTo(w * 0.68, h * 0.57);
  ctx.lineTo(w, h); ctx.lineTo(0, h);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = pal.roadLine;
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.setLineDash([w * 0.03, w * 0.025]);
  ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.59); ctx.lineTo(w * 0.5, h); ctx.stroke();
  ctx.setLineDash([]);
  // Getaway car + crew, in the middle band so the wide hero keeps them.
  paintCar(ctx, w * 0.5, h * 0.74, w * 0.62, pal, { facing: 1 });
  paintStandingFigure(ctx, w * 0.22, h * 0.76, h * 0.28, pal, { lean: 0.05, bag: true, glasses: true });
  paintStandingFigure(ctx, w * 0.86, h * 0.76, h * 0.30, pal, { lean: -0.06, glasses: true });
}

function sceneSkyline(ctx, w, h, pal, rng) {
  paintSky(ctx, w, h, pal, 0.58);
  const sunX = w * 0.62, sunY = h * 0.4;
  paintSun(ctx, sunX, sunY, Math.min(w, h) * 0.17, pal, true);
  paintSkyline(ctx, w, h * 0.68, h * 0.3, pal.far, rng, { windows: false });
  paintSkyline(ctx, w, h * 0.7, h * 0.2, pal.near, rng, { windows: true, windowColor: pal.window });
  paintWater(ctx, 0, h * 0.7, w, h * 0.3, pal, sunX, rng);
  paintPalm(ctx, w * 0.06, h * 0.72, h * 0.36, pal, rng, 0.18);
}

function sceneBeach(ctx, w, h, pal, rng) {
  paintSky(ctx, w, h, pal, 0.55);
  const sunX = w * 0.3, sunY = h * 0.34;
  paintSun(ctx, sunX, sunY, Math.min(w, h) * 0.15, pal, false);
  paintWater(ctx, 0, h * 0.55, w, h * 0.2, pal, sunX, rng);
  // Sand.
  const sand = ctx.createLinearGradient(0, h * 0.75, 0, h);
  sand.addColorStop(0, '#e8a06a'); sand.addColorStop(1, '#b06a4a');
  if (pal === PAL.neon) { sand.addColorStop(0, '#1a1440'); sand.addColorStop(1, '#0d0a24'); }
  ctx.fillStyle = sand;
  ctx.fillRect(0, h * 0.75, w, h * 0.25);
  // Pier posts marching into the sea.
  ctx.fillStyle = pal.silhouette;
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const px = w * (0.06 + t * 0.3);
    const py = h * (0.72 - t * 0.12);
    ctx.fillRect(px, py, w * 0.014, h * 0.1);
  }
  ctx.fillRect(w * 0.05, h * 0.585, w * 0.34, h * 0.014);
  // Umbrella + palm.
  ctx.fillStyle = pal.neonA;
  ctx.beginPath();
  ctx.moveTo(w * 0.72, h * 0.86);
  ctx.quadraticCurveTo(w * 0.72, h * 0.72, w * 0.6, h * 0.8);
  ctx.lineTo(w * 0.84, h * 0.8);
  ctx.quadraticCurveTo(w * 0.72, h * 0.72, w * 0.72, h * 0.86);
  ctx.fill();
  ctx.strokeStyle = pal.silhouette;
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.beginPath(); ctx.moveTo(w * 0.72, h * 0.8); ctx.lineTo(w * 0.72, h * 0.97); ctx.stroke();
  paintPalm(ctx, w * 0.93, h * 0.82, h * 0.4, pal, rng, -0.22);
}

function sceneBoulevard(ctx, w, h, pal, rng) {
  paintSky(ctx, w, h, pal, 0.6);
  const sunX = w * 0.5, sunY = h * 0.44;
  paintSun(ctx, sunX, sunY, Math.min(w, h) * 0.16, pal, true);
  paintSkyline(ctx, w, h * 0.6, h * 0.32, pal.far, rng, { windows: false });
  // Road in perspective.
  ctx.fillStyle = pal.road;
  ctx.beginPath();
  ctx.moveTo(w * 0.38, h * 0.6); ctx.lineTo(w * 0.62, h * 0.6);
  ctx.lineTo(w * 0.95, h); ctx.lineTo(w * 0.05, h);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = pal.roadLine;
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.setLineDash([w * 0.03, w * 0.025]);
  ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.62); ctx.lineTo(w * 0.5, h); ctx.stroke();
  ctx.setLineDash([]);
  // Palms lining the road, shrinking toward the vanishing point.
  const spots = [[0.08, 0.98, 0.5, 0.16], [0.92, 0.98, 0.5, -0.16], [0.22, 0.8, 0.34, 0.14], [0.78, 0.8, 0.34, -0.14], [0.33, 0.68, 0.2, 0.1], [0.67, 0.68, 0.2, -0.1]];
  for (const [px, py, ph, lean] of spots) paintPalm(ctx, w * px, h * py, h * ph, pal, rng, lean);
  // A small car driving away toward the sun.
  paintCar(ctx, w * 0.5, h * 0.7, w * 0.2, pal, { facing: -1, glow: false });
}

function sceneNeonStreet(ctx, w, h, pal, rng) {
  paintSky(ctx, w, h, pal, 0.55);
  paintStars(ctx, w, h, rng, 70, 0.4);
  paintSkyline(ctx, w, h * 0.7, h * 0.45, pal.near, rng, { windows: true, windowColor: pal.window });
  paintNeonSign(ctx, w * 0.12, h * 0.24, w * 0.26, h * 0.09, 'VICE', pal.neonA, 'OCEAN DR');
  paintNeonSign(ctx, w * 0.58, h * 0.16, w * 0.24, h * 0.08, 'NEON', pal.neonB);
  paintNeonSign(ctx, w * 0.38, h * 0.42, w * 0.2, h * 0.07, 'HOTEL', pal.neonA);
  // Wet street.
  const roadY = h * 0.7;
  ctx.fillStyle = pal.road;
  ctx.fillRect(0, roadY, w, h - roadY);
  const cols = [[0.16, pal.neonA], [0.5, pal.neonA], [0.78, pal.neonB]];
  for (const [cx, color] of cols) {
    ctx.fillStyle = color;
    for (let i = 0; i < 20; i++) {
      const t = rng();
      ctx.globalAlpha = 0.1 + (1 - t) * 0.45;
      ctx.fillRect(w * cx + (rng() - 0.5) * w * 0.1, roadY + t * (h - roadY), 3 + rng() * 8, 4 + t * 10);
    }
  }
  ctx.globalAlpha = 1;
  paintPalm(ctx, w * 0.04, h * 0.74, h * 0.4, pal, rng, 0.2);
  paintCar(ctx, w * 0.62, h * 0.9, w * 0.42, pal, { facing: 1 });
}

function sceneCar(ctx, w, h, pal, rng) {
  paintSky(ctx, w, h, pal, 0.62);
  const sunX = w * 0.68, sunY = h * 0.36;
  paintSun(ctx, sunX, sunY, Math.min(w, h) * 0.2, pal, true);
  paintSkyline(ctx, w, h * 0.7, h * 0.18, pal.far, rng, { windows: false });
  ctx.fillStyle = pal.road;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);
  ctx.strokeStyle = pal.roadLine;
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.setLineDash([w * 0.04, w * 0.03]);
  ctx.beginPath(); ctx.moveTo(0, h * 0.85); ctx.lineTo(w, h * 0.85); ctx.stroke();
  ctx.setLineDash([]);
  paintPalm(ctx, w * 0.06, h * 0.72, h * 0.42, pal, rng, 0.2);
  paintCar(ctx, w * 0.52, h * 0.88, w * 0.66, pal, { facing: 1 });
}

function scenePalms(ctx, w, h, pal, rng) {
  paintSky(ctx, w, h, pal, 0.7);
  const sunX = w * 0.5, sunY = h * 0.52;
  paintSun(ctx, sunX, sunY, Math.min(w, h) * 0.22, pal, true);
  // Birds: small "v" strokes.
  ctx.strokeStyle = pal.silhouette;
  ctx.lineWidth = Math.max(1.5, w * 0.003);
  ctx.lineCap = 'round';
  for (const [bx, by, bs] of [[0.24, 0.22, 1], [0.34, 0.16, 0.7], [0.72, 0.2, 0.85], [0.8, 0.3, 0.6]]) {
    const s = w * 0.02 * bs;
    ctx.beginPath();
    ctx.moveTo(w * bx - s, h * by);
    ctx.quadraticCurveTo(w * bx, h * by + s * 0.6, w * bx + s, h * by);
    ctx.stroke();
  }
  // Big fronds crossing in from the corners.
  paintPalm(ctx, w * -0.02, h * 1.02, h * 0.85, pal, rng, 0.35);
  paintPalm(ctx, w * 1.02, h * 1.02, h * 0.75, pal, rng, -0.35);
  paintPalm(ctx, w * 0.5, h * 1.05, h * 0.5, pal, rng, 0.05);
}

const PAINTERS = {
  queen: sceneQueen,
  rider: sceneRider,
  heist: sceneHeist,
  skyline: sceneSkyline,
  beach: sceneBeach,
  boulevard: sceneBoulevard,
  neonstreet: sceneNeonStreet,
  car: sceneCar,
  palms: scenePalms,
};

// Stable per-scene seeds so every paint is identical across reloads.
const SEEDS = {
  queen: 101, rider: 202, heist: 303, skyline: 404, beach: 505,
  boulevard: 606, neonstreet: 707, car: 808, palms: 909,
};

export const SAMPLE_PHOTOS = [
  { id: 'queen', label: 'Boulevard Queen', caption: 'BOULEVARD QUEEN', focal: { x: 0.52, y: 0.55 } },
  { id: 'rider', label: 'Midnight Run', caption: 'MIDNIGHT RUN', focal: { x: 0.5, y: 0.5 } },
  { id: 'heist', label: 'Sunset Heist', caption: 'SUNSET HEIST', focal: { x: 0.5, y: 0.52 } },
];

// Backdrop sets per grade, in the order layouts consume them.
export const BACKDROP_SETS = {
  sunset: ['car', 'palms', 'boulevard', 'skyline', 'beach'],
  neon: ['neonstreet', 'car', 'palms', 'skyline', 'boulevard'],
};

// Paints a scene into a fresh canvas of the given size.
export function makeSceneCanvas(kind, w, h, grade) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(w));
  canvas.height = Math.max(2, Math.round(h));
  const ctx = canvas.getContext('2d');
  const pal = PAL[grade] ?? PAL.sunset;
  PAINTERS[kind](ctx, canvas.width, canvas.height, pal, mulberry32(SEEDS[kind]));
  return canvas;
}
