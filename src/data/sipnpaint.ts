import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'public/images/sipnpaint/thumbs');
const EXT = /\.(webp|jpe?g|png|avif)$/i;

/**
 * Optimized Sip & Paint event photos.
 * Drop resized images in `/public/images/sipnpaint/thumbs/` — they show in the film strip.
 */
export function getSipPaintPhotos(): string[] {
  try {
    if (!fs.existsSync(DIR) || !fs.statSync(DIR).isDirectory()) return [];
    return fs
      .readdirSync(DIR)
      .filter((name) => EXT.test(name) && !name.startsWith('.'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((name) => `/images/sipnpaint/thumbs/${name}`);
  } catch {
    return [];
  }
}
