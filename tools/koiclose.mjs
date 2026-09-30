// close-up of one lined-up koi: node tools/koiclose.mjs out idx [dist] [elev]
import { open } from './harness.mjs';
import path from 'node:path';
const out = process.argv[2];
const list = (process.argv[3] || '0').split(',').map(Number);
const dist = +(process.argv[4] || 0.9), elev = +(process.argv[5] || 0.75);
const s = await open({ width: 1280, height: 720 });
for (const idx of list) {
  await s.eval(([idx, dist, elev]) => {
    KOI.lineup();
    const f = KOI.fish()[idx];
    KOI.view([f.x + 0.05, f.y + dist * elev + 0.1, f.z + dist], [f.x, f.y, f.z]);
    KOI.frames(2);
  }, [idx, dist, elev]);
  await s.shot(path.join(out, `koi_${idx}.png`));
}
console.log('errors', s.errors().length, s.errors().slice(0, 3).map((e) => e.text.slice(0, 500)));
await s.close();
