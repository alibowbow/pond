// koi screenshots: lineup (top-down + oblique), close-ups, behaviour sampling
import { open } from './harness.mjs';
import path from 'node:path';
const out = process.argv[2];
const which = (process.argv[3] || 'lineup,oblique,close,swim').split(',');
const s = await open({ width: +(process.argv[4] || 1280), height: +(process.argv[5] || 720) });
console.log('load', s.loadMs);
if (which.includes('lineup')) {
  await s.eval(() => { KOI.lineup(); KOI.view([-2.1, 4.6, 0.12], [-2.1, -0.3, 0.1]); KOI.frames(2); });
  await s.shot(path.join(out, 'lineup.png'));
}
if (which.includes('oblique')) {
  await s.eval(() => { KOI.lineup(); KOI.view([-2.1, 2.2, 3.6], [-2.1, -0.3, 0.0]); KOI.frames(2); });
  await s.shot(path.join(out, 'lineup_oblique.png'));
}
if (which.includes('close')) {
  await s.eval(() => { KOI.lineup(); KOI.view([-3.3, 0.9, -0.4], [-3.35, -0.25, -1.3]); KOI.frames(2); });
  await s.shot(path.join(out, 'close.png'));
}
if (which.includes('under')) {
  await s.eval(() => { KOI.lineup(); KOI.view([-3.3, -0.45, 0.6], [-3.3, -0.3, -1.3]); KOI.frames(2); });
  await s.shot(path.join(out, 'under_koi.png'));
}
if (which.includes('swim')) {
  await s.eval(() => { KOI.release(); KOI.simulate(20); KOI.view([0.3, 5.5, 1.2], [0, 0, 0]); KOI.frames(2); });
  await s.shot(path.join(out, 'swim_top.png'));
  const f = await s.eval(() => KOI.fish());
  console.log(JSON.stringify(f.slice(0, 6)));
}
console.log('errors', s.errors().length);
for (const e of s.errors().slice(0, 8)) console.log(e.text.slice(0, 3000));
await s.close();
