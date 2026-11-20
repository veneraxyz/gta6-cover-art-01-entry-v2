// tools/capture.mjs — produces the 4 submission screenshots in screenshots/.
//
// The 3 cover shots are ACTUAL exports from the app's own Download PNG path
// (renderCover at the exact dimensions), downscaled to JPEGs inside the
// gate's caps (long side at most 1280, short side at least 480, at most
// 256 KiB each). The editor shot is a screenshot of the app UI in Chromium.
// Full-size exported PNGs are also kept in /tmp/vcs2-shots for inspection.
import { spawn } from 'node:child_process';
import { writeFileSync, statSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname;
const SHOTS = `${ROOT}screenshots`;
const KEEP = '/tmp/vcs2-shots';
mkdirSync(SHOTS, { recursive: true });
mkdirSync(KEEP, { recursive: true });

const PORT = 8902;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_BYTES = 262144;

const COVERS = [
  {
    name: '1-cover.jpg',
    query: '?shot=cover&photo=queen&caption=BOULEVARD%20QUEEN&subtitle=VICE%20CITY&format=portrait&grade=sunset',
    keep: '1-cover-1080x1350.png',
    w: 1024, h: 1280,
  },
  {
    name: '3-cover.jpg',
    query: '?shot=cover&photo=rider&caption=MIDNIGHT%20RUN&subtitle=OCEAN%20DRIVE&format=square&grade=neon',
    keep: '3-cover-1080x1080.png',
    w: 1080, h: 1080,
  },
  {
    name: '4-cover.jpg',
    query: '?shot=cover&photo=heist&caption=SUNSET%20HEIST&subtitle=VICE%20CITY&format=landscape&grade=sunset',
    keep: '4-cover-1920x1080.png',
    w: 1280, h: 720,
  },
];

const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
};

// Downscale a PNG data URL to a JPEG data URL at w×h inside the page.
async function downscale(page, dataUrl, w, h, quality) {
  return page.evaluate(async ({ dataUrl, w, h, quality }) => {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', quality);
  }, { dataUrl, w, h, quality });
}

try {
  await sleep(1200);
  const browser = await chromium.launch();

  for (const shot of COVERS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    await page.goto(`http://localhost:${PORT}/${shot.query}`, { waitUntil: 'load' });
    await page.waitForFunction('window.__ready === true', null, { timeout: 30000 });
    await sleep(300);
    const png = await page.evaluate(() => window.__coverStudio.exportPNGDataURL());
    writeFileSync(`${KEEP}/${shot.keep}`, Buffer.from(png.split(',')[1], 'base64'));
    // Step the JPEG quality down until the file fits the 256 KiB cap.
    let quality = 0.9;
    let buf = null;
    for (;;) {
      const jpg = await downscale(page, png, shot.w, shot.h, quality);
      buf = Buffer.from(jpg.split(',')[1], 'base64');
      if (buf.length <= MAX_BYTES || quality <= 0.6) break;
      quality -= 0.08;
    }
    writeFileSync(`${SHOTS}/${shot.name}`, buf);
    check(`${shot.name} ${shot.w}x${shot.h} ≤ 256 KiB`, buf.length <= MAX_BYTES,
      `${(buf.length / 1024).toFixed(1)} KiB at q=${quality.toFixed(2)}`);
    await page.close();
  }

  // Editor shot: the app UI with the portrait cover loaded.
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  await page.goto(
    `http://localhost:${PORT}/?shot=editor&photo=queen&caption=BOULEVARD%20QUEEN&subtitle=VICE%20CITY&format=portrait&grade=sunset`,
    { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', null, { timeout: 30000 });
  await sleep(500);
  let quality = 0.88;
  for (;;) {
    await page.screenshot({ path: `${SHOTS}/2-editor.jpg`, type: 'jpeg', quality: Math.round(quality * 100) });
    const size = statSync(`${SHOTS}/2-editor.jpg`).size;
    if (size <= MAX_BYTES || quality <= 0.6) {
      check(`2-editor.jpg 1280x860 ≤ 256 KiB`, size <= MAX_BYTES, `${(size / 1024).toFixed(1)} KiB at q=${quality.toFixed(2)}`);
      break;
    }
    quality -= 0.08;
  }
  await page.close();
  await browser.close();
} finally {
  server.kill();
}

console.log(failures.length ? `\n${failures.length} FAILURES` : '\nALL SCREENSHOTS CAPTURED');
process.exit(failures.length ? 1 : 0);
