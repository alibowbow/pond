// every variety lined up in sunlight: top-down and oblique at 1600x900
import { open } from './harness.mjs';
import path from 'node:path';
const out = process.argv[2];
const s = await open({ width: 1600, height: 900 });
await s.eval(() => { KOI.lineup(-2.1, 0.1, 5, 1.2, 0.9); KOI.view([-2.1, 3.4, 0.12], [-2.1, -0.3, 0.1]); KOI.frames(2); });
await s.shot(path.join(out, 'lineup_top.png'));
await s.eval(() => { KOI.view([-2.1, 2.0, 3.0], [-2.1, -0.35, -0.2]); KOI.frames(2); });
await s.shot(path.join(out, 'lineup_oblique.png'));
console.log('errors', s.errors().length);
await s.close();
