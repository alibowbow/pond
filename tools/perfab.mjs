// A/B frame cost and image check for two copies of the page (e.g. before and after an optimisation).
// Usage: node tools/perfab.mjs <outDir> <pageA.html> <pageB.html> [views=all] [w=1280] [h=720] [dpr=1]
// Both pages run with the same seeded Math.random and the fixed test clock, so a change that does not
// alter the picture renders identical frames; the script reports per view the software-rasteriser frame
// time, draw calls and triangles of each page, and the pixel difference between them.
import { open } from './harness.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [out, fileA, fileB] = process.argv.slice(2, 5);
const want = (process.argv[5] || 'all').split(',');
const w = +(process.argv[6] || 1280), h = +(process.argv[7] || 720), dpr = +(process.argv[8] || 1);
const VIEWS = {
  aerial: { p: [9, 14, 16], t: [0, 0, -1] },
  pond: { p: [0.6, 2.4, 10.5], t: [0, -0.3, 0] },
  pondLevel: { p: [-3.5, 0.35, 3.2], t: [1.0, -0.1, -2.5] },
  koiTop: { p: [0.3, 5.5, 1.2], t: [0, 0, 0] },
  pondEdge: { p: [-0.6, 1.4, 8.2], t: [-6.0, 1.2, 5.0] },
  pavilion: { p: [3.4, 1.7, 1.8], t: [8.4, 1.2, -0.8] },
  bamboo: { p: [-6.5, 1.8, -3.0], t: [-11.5, 3.5, -6.5] },
  underwater: { p: [-1.5, -0.55, 1.5], t: [-2.5, -0.5, -2.5] },
};
fs.mkdirSync(out, { recursive: true });
const res = {};
for (const [tag, file] of [['A', fileA], ['B', fileB]]) {
  const s = await open({ width: w, height: h, dpr, seed: 7, file });
  for (const [name, v] of Object.entries(VIEWS)) {
    if (!want.includes('all') && !want.includes(name)) continue;
    await s.eval((v) => { KOI.view(v.p, v.t); KOI.frames(4); }, v);
    await s.shot(path.join(out, `${name}_${tag}.png`));
    const b = await s.eval(() => KOI.bench(3));
    (res[name] ||= {})[tag] = { ms: Math.round(b.ms), calls: b.calls, tris: b.tris };
    console.log(tag, name, JSON.stringify(res[name][tag]));
  }
  (res.errors ||= {})[tag] = s.errors().map((e) => e.text.slice(0, 300));
  await s.close();
}
fs.writeFileSync(path.join(out, 'perfab.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
