// tools/smoke.mjs — loads the app in Playwright Chromium, exercises the
// editor (upload, drag reframe, zoom, caption, grade, format switch, export),
// and dumps PNGs to /tmp for visual review. Exits non-zero on any failure.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = '/tmp/vcs2-smoke';
mkdirSync(OUT, { recursive: true });

const PORT = 8901;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], {
  cwd: ROOT, stdio: 'ignore',
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pngSize(buf) {
  // PNG IHDR: width at bytes 16-19, height at 20-23 (big-endian).
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
};

try {
  await sleep(1200);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const consoleErrors = [];
  const requests = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('request', (r) => requests.push(r.url()));

  const shot = '?shot=editor&photo=queen&caption=BOULEVARD%20QUEEN&format=portrait&grade=sunset';
  await page.goto(`http://localhost:${PORT}/${shot}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', null, { timeout: 30000 });
  check('app boots offline', true);

  const external = requests.filter((u) => !u.startsWith(`http://localhost:${PORT}/`));
  check('no external requests at runtime', external.length === 0, external.join(', ') || `${requests.length} local requests`);

  // Editor screenshot.
  await page.screenshot({ path: `${OUT}/editor.png` });
  check('editor screenshot saved', true);

  // Export at all three formats via the app's own export path.
  async function exportPng(name) {
    const dataUrl = await page.evaluate(() => window.__coverStudio.exportPNGDataURL());
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    writeFileSync(`${OUT}/${name}`, buf);
    return pngSize(buf);
  }
  let size = await exportPng('cover-portrait-sunset.png');
  check('portrait export is 1080x1350', size.w === 1080 && size.h === 1350, `${size.w}x${size.h}`);

  await page.click('[data-format="square"]');
  await sleep(300);
  size = await exportPng('cover-square-sunset.png');
  check('square export is 1080x1080', size.w === 1080 && size.h === 1080, `${size.w}x${size.h}`);

  await page.click('[data-format="landscape"]');
  await sleep(300);
  size = await exportPng('cover-landscape-sunset.png');
  check('landscape export is 1920x1080', size.w === 1920 && size.h === 1080, `${size.w}x${size.h}`);

  // Neon + rider + square (shot 3 setup).
  await page.click('[data-sample="rider"]');
  await page.click('[data-grade="neon"]');
  await page.click('[data-format="square"]');
  await page.fill('#caption', 'MIDNIGHT RUN');
  await page.fill('#subtitle', 'OCEAN DRIVE');
  await sleep(300);
  size = await exportPng('cover-square-neon.png');
  check('neon square export is 1080x1080', size.w === 1080 && size.h === 1080, `${size.w}x${size.h}`);

  // Heist + landscape (shot 4 setup).
  await page.click('[data-sample="heist"]');
  await page.click('[data-grade="sunset"]');
  await page.click('[data-format="landscape"]');
  await page.fill('#caption', 'SUNSET HEIST');
  await page.fill('#subtitle', 'VICE CITY');
  await sleep(300);
  size = await exportPng('cover-landscape-heist.png');
  check('heist landscape export is 1920x1080', size.w === 1920 && size.h === 1080, `${size.w}x${size.h}`);

  // Upload a photo (reuse an exported PNG as the "photo").
  await page.setInputFiles('#upload', `${OUT}/cover-square-sunset.png`);
  await sleep(500);
  const uploaded = await page.evaluate(() => window.__coverStudio.state.uploaded !== null);
  check('photo upload loads', uploaded);
  size = await exportPng('cover-upload.png');
  check('export with uploaded photo', size.w === 1920 && size.h === 1080, `${size.w}x${size.h}`);

  // Drag to reframe: press inside the hero panel, drag, release.
  await page.click('[data-sample="queen"]');
  await page.click('[data-format="portrait"]');
  await sleep(300);
  const before = await page.evaluate(() => ({ ...window.__coverStudio.state.focal }));
  const box = await page.locator('#cover').boundingBox();
  const startX = box.x + box.width * 0.3;
  const startY = box.y + box.height * 0.3;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 60, startY + 30, { steps: 6 });
  await page.mouse.up();
  await sleep(200);
  const after = await page.evaluate(() => ({ ...window.__coverStudio.state.focal }));
  const moved = Math.abs(after.x - before.x) > 0.001 || Math.abs(after.y - before.y) > 0.001;
  check('drag-to-reframe moves focal point', moved, `(${before.x.toFixed(3)},${before.y.toFixed(3)}) -> (${after.x.toFixed(3)},${after.y.toFixed(3)})`);

  // Crop survives a format switch: focal unchanged after switching.
  await page.click('[data-format="square"]');
  await sleep(200);
  const afterSwitch = await page.evaluate(() => ({ ...window.__coverStudio.state.focal }));
  check('crop preserved across format switch',
    Math.abs(afterSwitch.x - after.x) < 1e-9 && Math.abs(afterSwitch.y - after.y) < 1e-9);

  // Zoom slider.
  await page.fill('#zoom', '1.5').catch(() => {});
  await page.evaluate(() => {
    const z = document.getElementById('zoom');
    z.value = '1.5';
    z.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(200);
  const zoom = await page.evaluate(() => window.__coverStudio.state.zoom);
  check('zoom slider sets zoom', Math.abs(zoom - 1.5) < 0.01, `${zoom}`);

  // Swap scenes.
  const offBefore = await page.evaluate(() => window.__coverStudio.state.backdropOffset);
  await page.click('#swap');
  const offAfter = await page.evaluate(() => window.__coverStudio.state.backdropOffset);
  check('swap scenes cycles backdrops', offAfter !== offBefore, `${offBefore} -> ${offAfter}`);

  // Download button triggers a real download.
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('#download'),
  ]);
  const path = await download.path();
  check('Download PNG produces a file', Boolean(path), download.suggestedFilename());

  check('no console/page errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 500));

  await browser.close();
} finally {
  server.kill();
}

console.log(failures.length ? `\n${failures.length} FAILURES` : '\nALL SMOKE CHECKS PASSED');
process.exit(failures.length ? 1 : 0);
