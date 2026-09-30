// Hand checks: renders feed and stroke moments and reports the hand metrics.
// Usage: node tools/hand.mjs <outDir> [feed|stroke|both] [w=1280] [h=720]
// A moment is [name, phase, seconds]: the shot is taken that many seconds after
// the session enters the phase ('' = after the session starts).
import { open } from './harness.mjs';
import path from 'node:path';

const out = process.argv[2] || 'shots/hand';
const which = process.argv[3] || 'both';
const w = +(process.argv[4] || 1280), h = +(process.argv[5] || 720);
const res = {};
async function run(kind, moments) {
  const s = await open({ width: w, height: h });
  await s.eval((k) => { k === 'feed' ? KOI.feed() : KOI.stroke(); }, kind);
  const at = {};
  let clock = 0;
  for (const [name, phase, sec] of moments) {
    // step until the phase starts, then on to the moment within it
    const n = await s.eval(([ph, sec, clock, kind]) => {
      const S = kind === 'feed' ? FEED : STROKE;
      let n = 0;
      if (ph) {
        while (S.phase !== ph && n < 60 * 30) { KOI.simStep(1 / 60); n++; }
        const t0 = S.t;
        while (S.phase === ph && S.t - t0 < sec - 1e-6) { KOI.simStep(1 / 60); n++; }
      } else while (clock + n / 60 < sec - 1e-6) { KOI.simStep(1 / 60); n++; }
      return n;
    }, [phase, sec, clock, kind]);
    clock += n / 60;
    await s.eval(() => { KOI.focusNow(); KOI.frames(2); });
    await s.shot(path.join(out, kind + '-' + name + '.png'));
    at[name] = +clock.toFixed(2);
    console.log('shot', kind, name, at[name]);
  }
  res[kind + 'Moments'] = at;
  res[kind + 'Errors'] = s.errors().map((e) => e.text.slice(0, 300));
  await s.close();
  const s2 = await open({ width: 320, height: 180 });
  res[kind] = await s2.eval((k) => KOI.handMetrics(k, k === 'feed' ? 14 : 16, 1 / 60, 3), kind);
  await s2.close();
}
if (which === 'feed' || which === 'both') await run('feed', [['reach', 'reach', 0.7], ['rub', 'rub', 1.2], ['snap', '', 10.5]]);
if (which === 'stroke' || which === 'both') await run('stroke', [['lean', '', 2.0], ['reach', 'reach', 0.9], ['touch', 'stroke', 0.3], ['stroke', 'stroke', 1.0], ['roll', 'stroke', 5.0]]);
console.log(JSON.stringify(res, null, 1));
