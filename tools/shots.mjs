// Usage: node tools/shots.mjs <outDir> [views=comma list] [w=1280] [h=720] [query]
import { open } from './harness.mjs';
import path from 'node:path';

const out = process.argv[2] || 'shots';
const want = (process.argv[3] || 'all').split(',');
const w = +(process.argv[4] || 1280), h = +(process.argv[5] || 720);
const query = process.argv[6] || '';

const VIEWS = {
  aerial: { p: [9, 14, 16], t: [0, 0, -1] },
  pond: { p: [0.6, 2.4, 10.5], t: [0, -0.3, 0] },
  low: { p: [-2.5, 0.6, 5.5], t: [0, 0, -2] },
  top: { p: [0.3, 5.5, 1.2], t: [0, 0, 0] },
  north: { p: [0, 3.5, -12], t: [0, 0, 0] },
  west: { p: [-12, 3, 1], t: [0, 0, 0] },
  lantern: { p: [-0.6, 1.4, 8.2], t: [-2.0, 1.0, 5.9] },
  falls: { p: [-0.3, 1.3, -1.8], t: [-0.3, 0.6, -5.3] },
  turtle: { p: [-3.2, 0.9, -0.2], t: [-5.0, 0.1, -1.3] },
  yukimi: { p: [-4.4, 1.2, 2.6], t: [-6.4, 0.5, 0.9] },
  under: { p: [-1.5, -0.55, 1.5], t: [-2.5, -0.5, -2.5] },
  underup: { p: [-1.0, -0.8, 0.5], t: [-1.2, 0.5, -1.0] },
  graze: { p: [-3.5, 0.35, 3.2], t: [1.0, -0.1, -2.5] },
  bridge: { p: [-1.2, 1.3, 1.2], t: [2.6, 0.5, -0.9] },
  pavilion: { p: [3.4, 1.7, 1.8], t: [8.4, 1.2, -0.8] },
  pier: { p: [-1.6, 1.3, 6.2], t: [0.9, 0.2, 3.0] },
  vista: { p: [-9, 5, 12], t: [2, 0, -3] },
  weeping: { p: [-3.2, 1.6, 0.6], t: [-7.2, 2.0, -3.3] },
  cherry: { p: [3.2, 1.8, 7.8], t: [7.6, 2.6, 4.2] },
  maple: { p: [0.2, 1.5, -2.2], t: [1.7, 1.8, -6.2] },
  bamboo: { p: [-6.5, 1.8, -3.0], t: [-11.5, 3.5, -6.5] },
  pine: { p: [-1.5, 1.6, 8.4], t: [-4.6, 2.4, 5.4] },
  lotus: { p: [6.4, 1.05, 2.6], t: [4.9, 0.35, 0.4] },
  lilies: { p: [-2.6, 1.2, 0.2], t: [-4.3, -0.1, -2.4] },
  iris: { p: [3.6, 0.9, 0.3], t: [6.1, 0.4, -0.9] },
  frog: { p: [-4.0, 0.35, -1.6], t: [-4.4, 0.02, -2.4] },
  turtleclose: { p: [-4.35, 0.55, -0.7], t: [-5.0, 0.3, -1.25] },
};

const s = await open({ width: w, height: h, query });
console.log('load ms', s.loadMs);
for (const [name, v] of Object.entries(VIEWS)) {
  if (!want.includes('all') && !want.includes(name)) continue;
  await s.eval((v) => { KOI.view(v.p, v.t); KOI.frames(3); }, v);
  const f = await s.shot(path.join(out, name + '.png'));
  console.log('shot', f);
}
const bench = await s.eval(() => KOI.bench(3));
console.log('bench', JSON.stringify(bench));
console.log('info', JSON.stringify(await s.eval(() => KOI.info())));
const errs = s.errors();
console.log('errors', errs.length);
for (const e of errs.slice(0, 20)) console.log('  ', e.text.slice(0, 2000));
for (const l of s.log.filter((l) => l.type === 'log').slice(0, 40)) console.log('  log:', l.text.slice(0, 300));
await s.close();
