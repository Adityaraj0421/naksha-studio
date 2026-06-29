#!/usr/bin/env node
// @naksha/reel — render a /design run into a share-able reel.
//
// Usage:
//   node bin/render.mjs --props reel.json [--out ./out] [--only 9x16|16x9]
//
// reel.json shape (produced by the /design-reel command):
//   {
//     "beats":   [ { "role", "fn", "caption", "focus" } ],   // raw from the extraction pass
//     "framing": { "hookTitle","hookSub","beforeTag","briefCaption",
//                  "revealCaption","endHeadline","endSub","endCommand" },  // all optional
//     "beforeImage": "path/to/before.png" | null,   // present => redesign wipe
//     "afterImage":  "path/to/after.png"            // required
//   }
//
// Output: out/reel-9x16.mp4 + out/reel-16x9.mp4
// Exit codes: 0 ok | 1 usage/IO error | 2 min-beat gate failed

import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia} from '@remotion/renderer';
import {normalizeBeats} from '../src/normalize.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

function die(msg, code = 1) {
  console.error(`✖ naksha-reel: ${msg}`);
  process.exit(code);
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function toDataUri(p) {
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) die(`image not found: ${p}`);
  const ext = path.extname(abs).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
}

const DEFAULT_FRAMING = {
  hookTitle: '26 specialists. One screen.',
  hookSub: 'Not one AI voice — watch the whole design team work.',
  beforeTag: 'BEFORE',
  briefCaption: 'What your dev shipped, before the team got to it.',
  revealCaption: 'Same screen. The whole team later.',
  endHeadline: 'Your turn to run the team.',
  endSub: '26 roles redesign your screen, live. One command.',
  endCommand: '/design-reel',
};

async function main() {
  const propsPath = arg('props');
  const outDir = path.resolve(arg('out', path.join(process.cwd(), 'out')));
  const only = arg('only'); // '9x16' | '16x9' | undefined

  if (!propsPath) die('missing --props <reel.json>');
  let input;
  try {
    input = JSON.parse(fs.readFileSync(path.resolve(propsPath), 'utf8'));
  } catch (e) {
    die(`could not read/parse ${propsPath}: ${e.message}`);
  }

  if (!input.afterImage) die('reel.json is missing "afterImage" (the redesigned page screenshot)');

  const norm = normalizeBeats(input.beats);
  if (!norm.ok) die(norm.error, 2); // min-beat gate

  const spec = {...DEFAULT_FRAMING, ...(input.framing || {}), scenes: norm.scenes};
  const inputProps = {
    spec,
    beforeImage: input.beforeImage ? toDataUri(input.beforeImage) : '',
    afterImage: toDataUri(input.afterImage),
  };

  fs.mkdirSync(outDir, {recursive: true});
  console.log(`▸ naksha-reel: ${spec.scenes.length} beats, ${inputProps.beforeImage ? 'before+after wipe' : 'after-only'} mode`);

  console.log('▸ bundling…');
  const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src', 'index.ts')});

  const targets = [
    {id: 'Reel9x16', out: 'reel-9x16.mp4', tag: '9x16'},
    {id: 'Reel16x9', out: 'reel-16x9.mp4', tag: '16x9'},
  ].filter((t) => !only || t.tag === only);

  const written = [];
  for (const t of targets) {
    const composition = await selectComposition({serveUrl, id: t.id, inputProps});
    const outputLocation = path.join(outDir, t.out);
    console.log(`▸ rendering ${t.id} (${composition.durationInFrames} frames)…`);
    await renderMedia({composition, serveUrl, codec: 'h264', outputLocation, inputProps, concurrency: 4});
    written.push(outputLocation);
    console.log(`✓ ${outputLocation}`);
  }
  console.log(`\n✓ reel ready:\n${written.map((w) => '  ' + w).join('\n')}`);
}

main().catch((e) => die(e.stack || e.message));
