// weather presets from the pond view: node tools/weather.mjs out
import { open } from './harness.mjs';
import path from 'node:path';
const out = process.argv[2];
const list = (process.argv[3] || 'Sunny,Rain,Autumn,Winter').split(',');
const s = await open({ width: 1280, height: 720 });
for (const w of list) {
  await s.eval((w) => { KOI.setWeather(w, true); KOI.view([0.6, 2.4, 10.5], [0, -0.3, 0]); KOI.simulate(1); KOI.frames(3); }, w);
  await s.shot(path.join(out, `wx_${w}.png`));
}
console.log('errors', s.errors().length, s.errors().slice(0, 3).map((e) => e.text.slice(0, 300)));
await s.close();
