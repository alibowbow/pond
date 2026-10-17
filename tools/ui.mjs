// UI checks: dock, guide, glass panel, shortcuts, persistence, click-to-splash, audio graph.
// Usage: node tools/ui.mjs <outDir>
import { open } from './harness.mjs';
import path from 'node:path';

const out = process.argv[2] || 'shots/ui';
const res = {};
let s = await open({ width: 1280, height: 720, query: 'ui' });
const { page } = s;
await s.eval(() => { KOI.view([0.6, 2.4, 10.5], [0, -0.3, 0]); KOI.frames(2); });
await s.shot(path.join(out, 'ui-desktop.png'));
// open the Rendering and Camera folders to see sliders, toggles and selects
await page.evaluate(() => { for (const li of document.querySelectorAll('.koi-gui li.title')) if (/렌더링|렌즈/.test(li.textContent)) li.click(); });
await page.waitForTimeout(400);
await s.shot(path.join(out, 'ui-panel.png'), { x: 900, y: 0, width: 380, height: 720 });
// shortcuts
await page.keyboard.press('KeyT');
res.weatherAfterT = await s.eval(() => KOI.P.weather);
await page.keyboard.press('KeyM');
res.mutedAfterM = await s.eval(() => AUDIO.muted);
res.audioStarted = await s.eval(() => AUDIO.started && AUDIO.ctx.state);
await page.keyboard.press('KeyI');
res.guideHiddenAfterI = await s.eval(() => document.getElementById('guide').classList.contains('hidden'));
await page.keyboard.press('KeyP');
res.holdAfterP = await s.eval(() => KOI.P.hold);
res.dockHoldOn = await s.eval(() => document.getElementById('bHold').classList.contains('on'));
await page.keyboard.press('KeyP');
await page.keyboard.press('KeyC');
res.modeAfterC = await s.eval(() => CAM.mode);
await page.keyboard.press('KeyC'); await page.keyboard.press('KeyC');
res.modeAfter3C = await s.eval(() => CAM.mode);
await s.eval(() => { KOI.mode('Manual'); KOI.view([0.6, 2.4, 10.5], [0, -0.3, 0]); KOI.frames(1); });
await s.shot(path.join(out, 'ui-guide-closed.png'), { x: 0, y: 0, width: 360, height: 200 });
// click the water: ripples + droplets
await page.mouse.click(640, 420);
res.splashDrops = await s.eval(() => SPLASH.list.length);
await s.eval(() => KOI.frames(4));
await s.shot(path.join(out, 'ui-splash.png'));
res.splashAfter = await s.eval(() => SPLASH.list.length);
// audio produces signal
res.rms = await s.eval(async () => {
  AUDIO.setMuted(false);
  const an = AUDIO.ctx.createAnalyser(); an.fftSize = 2048; AUDIO.master.connect(an);
  AUDIO.splash(0.8); AUDIO.knock(); AUDIO.bird(); AUDIO.croak(1);
  await new Promise((r) => setTimeout(r, 250));
  const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d);
  let e = 0; for (const v of d) e += v * v; return Math.sqrt(e / d.length);
});
await page.keyboard.press('KeyM');
// clean view
await page.keyboard.press('KeyV');
res.clean = await s.eval(() => document.body.classList.contains('clean'));
await page.keyboard.press('Escape');
res.cleanAfterEsc = await s.eval(() => document.body.classList.contains('clean'));
// persistence across reloads
res.lsGuide = await s.eval(() => localStorage.getItem('koi.guide'));
res.lsMuted = await s.eval(() => localStorage.getItem('koi.muted'));
await page.reload();
await page.waitForFunction(() => window.KOI && window.KOI.ready === true, null, { timeout: 600000 });
res.guideHiddenAfterReload = await s.eval(() => document.getElementById('guide').classList.contains('hidden'));
res.mutedAfterReload = await s.eval(() => AUDIO.muted);
await s.eval(() => { KOI.view([0.6, 2.4, 10.5], [0, -0.3, 0]); KOI.frames(1); });
await page.keyboard.press('KeyI');
res.errors = s.errors().map((e) => e.text.slice(0, 400));
await s.close();
// narrow and phone layouts
for (const [name, w, h, dpr] of [['tablet', 820, 700, 1], ['phone', 390, 844, 2]]) {
  s = await open({ width: w, height: h, dpr, query: 'ui' });
  await s.eval(() => { KOI.view([0.6, 2.4, 10.5], [0, -0.3, 0]); KOI.frames(1); });
  await s.shot(path.join(out, 'ui-' + name + '.png'));
  res[name + 'Errors'] = s.errors().length;
  await s.close();
}
console.log(JSON.stringify(res, null, 1));
