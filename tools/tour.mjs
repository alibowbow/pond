// cinematic tour shots: node tools/tour.mjs out [shot indices]
import { open } from './harness.mjs';
import path from 'node:path';
const out = process.argv[2];
const list = (process.argv[3] || '0,2,4,7').split(',').map(Number);
const s = await open({ width: 1280, height: 720 });
await s.eval(() => { KOI.set('letterbox', true); });
for (const i of list) {
  await s.eval((i) => { KOI.tour(i, 0.45); KOI.frames(2); }, i);
  await s.page.waitForTimeout(1300);
  await s.shot(path.join(out, `tour_${i}.png`));
}
console.log('errors', s.errors().length, s.errors().slice(0, 3).map((e) => e.text.slice(0, 300)));
await s.close();
