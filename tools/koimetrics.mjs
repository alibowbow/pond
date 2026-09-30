import { open } from './harness.mjs';
const s = await open({ width: 320, height: 180 });
const m = await s.eval(() => KOI.koiMetrics(120));
console.log(JSON.stringify(m));
const modes = await s.eval(() => KOI.fish().map((f) => f.mode + ':' + f.speed.toFixed(2)));
console.log(modes.join(' '));
console.log('errors', s.errors().length);
await s.close();
