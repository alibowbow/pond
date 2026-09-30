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
