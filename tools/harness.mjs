// Test harness for koi-pond.html (dev tool, not part of the app).
// Launches headless Chromium, serves the two CDN scripts from identical npm copies
// (cdnjs may be unreachable from CI sandboxes), collects console errors and
// exposes helpers for scripted screenshots and measurements.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch {
  pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
}
const { chromium } = pw;
export const ROOT = path.resolve(here, '..');
const LIBS = process.env.KOI_LIBS || path.join(here, '.libs');

function ensureLibs() {
  const three = path.join(LIBS, 'three.min.js');
  const dat = path.join(LIBS, 'dat.gui.min.js');
  if (fs.existsSync(three) && fs.existsSync(dat)) return { three, dat };
  fs.mkdirSync(LIBS, { recursive: true });
  execSync('npm pack three@0.160.0 dat.gui@0.7.9 --silent', { cwd: LIBS });
  execSync('tar xzf three-0.160.0.tgz package/build/three.min.js && mv package/build/three.min.js . && rm -rf package', { cwd: LIBS });
  execSync('tar xzf dat.gui-0.7.9.tgz package/build/dat.gui.min.js && mv package/build/dat.gui.min.js . && rm -rf package', { cwd: LIBS });
  return { three, dat };
}

// file: another copy of the page to open (A/B runs); seed: replace Math.random with a seeded generator
// so two runs of the same page render identical frames
export async function open({ width = 1280, height = 720, dpr = 1, query = '', headless = true, file = null, seed = null } = {}) {
  const libs = ensureLibs();
  const browser = await chromium.launch({
    headless,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'],
  });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  if (seed !== null) {
    await context.addInitScript((sd) => {
      let a = sd >>> 0;
      Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      // three.js draws UUIDs from Math.random, so pages that build different numbers of materials drift apart;
      // reseeding once the page is ready lines the simulations up again
      window.__reseed = (s = sd) => { a = s >>> 0; };
    }, seed);
  }
  const page = await context.newPage();
  const log = [];
  page.on('console', (m) => log.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', (e) => log.push({ type: 'pageerror', text: String(e && e.stack || e) }));
  await page.route('**/cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js', (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(libs.three) }));
  await page.route('**/cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.9/dat.gui.min.js', (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(libs.dat) }));
  // the page's Korean web fonts: tests use locally installed copies (if any), so the stylesheet is served empty
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const url = 'file://' + (file ? path.resolve(file) : path.join(ROOT, 'koi-pond.html')) + '?test' + (query ? '&' + query : '');
  const t0 = Date.now();
  await page.goto(url);
  // fail fast when the script throws while loading
  const died = new Promise((_, rej) => page.on('pageerror', (e) => rej(new Error('page error while loading: ' + (e && e.message || e)))));
  await Promise.race([page.waitForFunction(() => window.KOI && window.KOI.ready === true, null, { timeout: 600000 }), died]);
  const loadMs = Date.now() - t0;
  if (seed !== null) await page.evaluate((sd) => window.__reseed(sd), seed);
  return {
    browser, page, log, loadMs,
    errors: () => log.filter((l) => l.type === 'error' || l.type === 'pageerror'),
    warnings: () => log.filter((l) => l.type === 'warning'),
    async shot(file, clip) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await page.screenshot({ path: file, clip });
      return file;
    },
    eval: (fn, arg) => page.evaluate(fn, arg),
    close: () => browser.close(),
  };
}
