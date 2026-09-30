// quick weather-state screenshots: node tools/wx.mjs outDir
import { open } from './harness.mjs';
import path from 'node:path';
const out = process.argv[2];
const s = await open({ width: 1280, height: 720 });
const cases = [
  ['rain', { rain: 1, wet: 1, cloud: 1, overcast: 0.85, sunMul: 0.1, hemiMul: 2.1, turbidity: 6, fog: 0.02 }],
  ['ice', { rain: 0, wet: 0, ice: 1, snowCover: 1, cloud: 0.95, overcast: 0.7, sunMul: 0.3, hemiMul: 1.9, turbidity: 3, fog: 0.024 }],
];
for (const [name, e] of cases) {
  await s.eval((e) => { Object.assign(KOI.env, e); KOI.view([0.6, 2.4, 7.5], [0, -0.3, 0]); KOI.frames(40); }, e);
  await s.shot(path.join(out, name + '.png'));
}
console.log('errors', s.errors().length, s.errors().slice(0, 5).map((e) => e.text.slice(0, 400)));
await s.close();
