#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

const usage = `
Sanitize a Codex screenshot for README assets.

Usage:
  node bin/sanitize-codex-screenshot.mjs --input raw.png --output docs/assets/screenshot.png [options]

Options:
  --input <path>     Source PNG/JPG screenshot.
  --output <path>    Sanitized PNG output.
  --crop <WxH+X+Y>   Crop rectangle passed to ffmpeg crop. Example: 1800:1050:0:80
  --scale <width>    Output width. Default: 1440
  --mask <WxH+X+Y>   Add an opaque mask. Can be repeated.

Default masks hide the macOS menu bar, Codex left sidebar, right progress panel,
and bottom composer area for a 3420x2224 Retina fullscreen screenshot.
`;

function parseArgs(argv) {
  const args = { masks: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') args.input = argv[++i];
    else if (arg === '--output') args.output = argv[++i];
    else if (arg === '--crop') args.crop = argv[++i];
    else if (arg === '--scale') args.scale = Number(argv[++i]);
    else if (arg === '--mask') args.masks.push(argv[++i]);
    else if (arg === '--help' || arg === '-h') {
      console.log(usage.trim());
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} failed\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function assertRect(rect, label) {
  if (!/^\d+:\d+:\d+:\d+$/.test(rect)) {
    throw new Error(`${label} must use ffmpeg WxH+X+Y-as-colons format: width:height:x:y`);
  }
}

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.output) {
  console.error(usage.trim());
  process.exit(1);
}

const input = resolve(args.input);
const output = resolve(args.output);
if (!existsSync(input)) {
  throw new Error(`Input not found: ${input}`);
}

const crop = args.crop ?? '2860:1760:280:90';
assertRect(crop, '--crop');

const masks = args.masks.length > 0 ? args.masks : [
  '2860:72:0:0',
  '310:1760:0:0',
  '560:760:2260:80',
  '1300:320:560:1380',
];
masks.forEach((mask) => assertRect(mask, '--mask'));

mkdirSync(dirname(output), { recursive: true });

const tmp = mkdtempSync(resolve(tmpdir(), 'codex-shot-'));
const cropped = resolve(tmp, 'cropped.png');
const masked = resolve(tmp, 'masked.png');

run('ffmpeg', [
  '-y',
  '-i', input,
  '-vf', `crop=${crop}`,
  '-frames:v', '1',
  cropped,
]);

let filter = 'format=rgba';
for (const rect of masks) {
  const [w, h, x, y] = rect.split(':');
  filter += `,drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=#111827@1:t=fill`;
}

run('ffmpeg', [
  '-y',
  '-i', cropped,
  '-vf', filter,
  '-frames:v', '1',
  masked,
]);

const scaleWidth = Number.isFinite(args.scale) && args.scale > 0 ? args.scale : 1440;
run('ffmpeg', [
  '-y',
  '-i', masked,
  '-vf', `scale=${scaleWidth}:-2`,
  '-frames:v', '1',
  output,
]);

console.log(`Wrote ${output}`);
