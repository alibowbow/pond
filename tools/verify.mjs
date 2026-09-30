// Section 13 verification pass: screenshots, native-res koi crops, hand and koi metrics,
// frame-cost figures, console errors and a parse check. Writes <outDir>/report.json.
// Usage: node tools/verify.mjs <outDir> [parts=parse,views,weather,koi,crops,metrics,perf]
// Note: headless runs use SwiftShader (CPU rasteriser), so frame times here are not GPU
// timings; the JS cost per frame (cpuMs) and draw-call / triangle counts are the useful proxies.
import { open, ROOT } from './harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const out = process.argv[2] || 'verify';
const parts = (process.argv[3] || 'parse,views,weather,koi,crops,metrics,perf').split(',');
fs.mkdirSync(out, { recursive: true });
const report = { when: new Date().toISOString(), errors: {} };
const save = () => fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
const errs = (s) => s.errors().map((e) => e.text.slice(0, 400));

if (parts.includes('parse')) {
  const html = fs.readFileSync(path.join(ROOT, 'koi-pond.html'), 'utf8');
  const code = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  const tmp = path.join(out, 'inline.js');
  fs.writeFileSync(tmp, code);
  try { execSync(`node --check "${tmp}"`, { stdio: 'pipe' }); report.parse = 'ok'; } catch (e) { report.parse = String(e.stderr || e).slice(0, 600); }
  fs.unlinkSync(tmp);
  report.htmlBytes = Buffer.byteLength(html);
  save();
}

if (parts.some((p) => ['views', 'weather', 'koi'].includes(p))) {
  const s = await open({ width: 1280, height: 720 });
  report.loadMs = s.loadMs;
  const shot = async (name, fn, arg) => { await s.eval(fn, arg); await s.eval(() => KOI.frames(3)); await s.shot(path.join(out, name + '.png')); console.log('shot', name); };
  if (parts.includes('views')) {
    await shot('aerial', () => KOI.view([9, 14, 16], [0, 0, -1]));
    await shot('pond_level', () => KOI.view([-3.5, 0.35, 3.2], [1.0, -0.1, -2.5]));
    await shot('pond', () => KOI.view([0.6, 2.4, 10.5], [0, -0.3, 0]));
    await shot('koi_topdown', () => { KOI.release(); KOI.simulate(8); KOI.view([0.3, 5.5, 1.2], [0, 0, 0]); });
    await shot('koi_closeup_topdown', () => { const f = FISH[3]; KOI.view([f.pos.x + 0.01, WATER_Y + 1.3, f.pos.z + 0.02], [f.pos.x, f.pos.y, f.pos.z]); });
    await shot('underwater', () => KOI.view([-1.5, -0.55, 1.5], [-2.5, -0.5, -2.5]));
    // a film-tour frame with its caption (captions are timed on frame time)
    await shot('tour_caption', () => { KOI.tour(0, 0); KOI.frames(40); });
    report.captionShown = await s.eval(() => document.getElementById('caption').classList.contains('on'));
    await s.eval(() => { KOI.mode('Manual'); CAM.letterbox = 0; });
  }
  if (parts.includes('weather')) {
    for (const w of await s.eval(() => WEATHER_NAMES)) {
      await shot('weather_' + w, (w) => { KOI.setWeather(w, true); KOI.view([0.6, 2.4, 10.5], [0, -0.3, 0]); KOI.simulate(1); }, w);
    }
    await s.eval(() => KOI.setWeather('Sunny', true));
  }
  if (parts.includes('koi')) {
    await shot('koi_lineup', () => { KOI.lineup(); KOI.view([-2.1, 4.6, 0.12], [-2.1, -0.3, 0.1]); });
    await shot('koi_lineup_oblique', () => { KOI.lineup(); KOI.view([-2.1, 2.2, 3.6], [-2.1, -0.3, 0.0]); });
  }
  report.errors.views = errs(s);
  await s.close();
  save();
}

if (parts.includes('crops')) {
  // native-resolution outline crops at a 2x device pixel ratio, straight from the frame buffer
  const s = await open({ width: 1600, height: 900, dpr: 2 });
  const picks = [0, 3, 6, 9, 12, 14];
  report.crops = [];
  for (const i of picks) {
    const clip = await s.eval((i) => {
      KOI.lineup(-2.1, 0.1, 5, 1.25, 0.95, 0.35);
      const f = FISH[i];
      // move it to the most open deep water: clear of rocks, posts, banks and the other fish
      let best = null;
      for (let x = -5; x <= 5; x += 0.2) for (let z = -4; z <= 4; z += 0.2) {
        let ok = true;
        for (let a = 0; a < 8 && ok; a++) ok = WATER_Y - floorHeight(x + Math.cos(a) * 0.7, z + Math.sin(a) * 0.7) > 0.4;
        if (!ok || WATER_Y - floorHeight(x, z) < 0.45) continue;
        let clear = 9;
        for (const o of OBSTACLES) clear = Math.min(clear, Math.hypot(x - o.x, z - o.z) - o.r);
        for (const g of FISH) if (g !== f) clear = Math.min(clear, Math.hypot(x - g.pos.x, z - g.pos.z) - 0.5 * g.size);
        if (!best || clear > best.c) best = { x, z, c: clear };
      }
      f.pos.x = best.x; f.pos.z = best.z; f.pos.y = koiCapY(f) - 0.01;
      writeKoiInstances(P.fishCount);
      KOI.view([f.pos.x + 0.1, f.pos.y + 0.55, f.pos.z + 0.55], [f.pos.x, f.pos.y, f.pos.z]);
      KOI.frames(3);
      // box around the fish from its nose, tail tip and flanks
      const d = new THREE.Vector3(Math.cos(f.heading), 0, -Math.sin(f.heading)), sd = new THREE.Vector3(d.z, 0, -d.x);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const a of [-0.62, 0.5]) for (const b of [-0.2, 0.2]) for (const c of [-0.08, 0.1]) {
        const p = f.pos.clone().addScaledVector(d, a * f.size).addScaledVector(sd, b * f.size).add(new THREE.Vector3(0, c * f.size, 0)).project(camera);
        const x = (p.x + 1) * 0.5 * innerWidth, y = (1 - p.y) * 0.5 * innerHeight;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
      return { x: x0, y: y0, width: Math.min(innerWidth, Math.ceil(x1)) - x0, height: Math.min(innerHeight, Math.ceil(y1)) - y0, variety: f.variety };
    }, i);
    const file = path.join(out, `koi_crop_${i}.png`);
    await s.shot(file, { x: clip.x, y: clip.y, width: clip.width, height: clip.height });
    report.crops.push({ i, variety: clip.variety, file: path.basename(file), cssBox: [clip.width, clip.height] });
    console.log('crop', i, clip.variety);
  }
  report.errors.crops = errs(s);
  await s.close();
  save();
}

if (parts.includes('metrics')) {
  const s = await open({ width: 320, height: 180 });
  report.feed = await s.eval(() => KOI.handMetrics('feed', 14, 1 / 60, 3));
  console.log('feed', JSON.stringify(report.feed));
  await s.close();
  const s2 = await open({ width: 320, height: 180 });
  report.stroke = await s2.eval(() => KOI.handMetrics('stroke', 18, 1 / 60, 3));
  console.log('stroke', JSON.stringify(report.stroke));
  report.koi = await s2.eval(() => KOI.koiMetrics(90, 1 / 30));
  console.log('koi', JSON.stringify(report.koi));
  report.errors.metrics = [...errs(s), ...errs(s2)];
  await s2.close();
  save();
}

if (parts.includes('perf')) {
  // 1280x720 CSS at 1.6x DPR, the target laptop set-up
  const s = await open({ width: 1280, height: 720, dpr: 1.6 });
  report.perf = {};
  for (const q of ['High', 'Low']) {
    report.perf[q] = await s.eval((q) => {
      P.autoDrop = false; setQuality(q);
      KOI.view([0.6, 2.4, 10.5], [0, -0.3, 0]);
      KOI.frames(4);
      const b = KOI.bench(6);
      let cpu = 0, sim = 0; for (let i = 0; i < 6; i++) { KOI.frames(1); cpu += perf.cpuMs; sim += perf.simMs; }
      const info = KOI.info();
      return { swiftshaderMs: +b.ms.toFixed(1), jsMsPerFrame: +(cpu / 6).toFixed(2), simMsPerFrame: +(sim / 6).toFixed(2), calls: info.calls, tris: info.tris, programs: info.programs, mainRT: [b.w, b.h], canvas: [renderer.domElement.width, renderer.domElement.height] };
    }, q);
    console.log('perf', q, JSON.stringify(report.perf[q]));
  }
  report.errors.perf = errs(s);
  await s.close();
  save();
}
console.log(JSON.stringify(report, null, 1));
