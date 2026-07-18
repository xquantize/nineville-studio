#!/usr/bin/env node
/**
 * Convert raw series images (jpg/png/heic) → optimized WebP in place.
 * HEIC is decoded via macOS `sips` first, then Sharp writes WebP.
 * Usage: node scripts/optimize-series.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.join(process.cwd(), 'public/images/series');
const exts = /\.(jpe?g|png|heic)$/i;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (exts.test(name)) out.push(full);
  }
  return out;
}

function heicToJpeg(heicPath) {
  const jpg = heicPath.replace(/\.heic$/i, '.jpg');
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '90', heicPath, '--out', jpg], {
    stdio: 'inherit',
  });
  return jpg;
}

const files = walk(root);
if (!files.length) {
  console.log('No jpg/png/heic files under public/images/series — nothing to do.');
  process.exit(0);
}

console.log(`Converting ${files.length} file(s)…`);
for (const input of files) {
  const before = fs.statSync(input).size;
  let source = input;
  let removeSource = true;

  if (/\.heic$/i.test(input)) {
    source = heicToJpeg(input);
    removeSource = true; // remove both heic + intermediate jpg
  }

  const out = input.replace(/\.(jpe?g|png|heic)$/i, '.webp');
  const tmp = `${out}.tmp`;
  await sharp(source)
    .rotate()
    .resize({ width: 1600, height: 2000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toFile(tmp);
  fs.renameSync(tmp, out);

  if (removeSource) {
    fs.unlinkSync(input);
    if (source !== input && fs.existsSync(source)) fs.unlinkSync(source);
  }

  const after = fs.statSync(out).size;
  console.log(
    `${path.relative(root, input)} → ${path.basename(out)}  ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`
  );
}
console.log('Done.');
