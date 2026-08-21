// Intrinsic pixel size of a raster asset, read straight from the file header — no image library.
// Used by the retina / weight gate (build/check-assets.ts): an email image that is not ~2× its
// render width is visibly soft on the screens most mail is read on, and that is invisible in a
// desktop preview. Only local files can be measured; hosted URLs are the CDN's problem.
import { readFileSync, statSync } from 'node:fs';

export interface ImageSize {
  width: number;
  height: number;
  bytes: number;
}

/** PNG: IHDR is always the first chunk — width/height are big-endian u32 at byte 16. */
function png(buf: Buffer): ImageSize | null {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bytes: buf.length };
}

/** JPEG: walk the marker segments to the first SOFn frame header. */
function jpeg(buf: Buffer): ImageSize | null {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1] ?? 0;
    // SOFn (C0..CF) carries the frame size; C4/C8/CC are tables, not frames.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), bytes: buf.length };
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

/** GIF: logical screen descriptor, little-endian u16 pair at byte 6. */
function gif(buf: Buffer): ImageSize | null {
  if (buf.length < 10 || buf.toString('ascii', 0, 3) !== 'GIF') return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8), bytes: buf.length };
}

/**
 * Intrinsic size of a local raster image, or null when it can't be determined — which includes
 * SVG on purpose: a vector has no intrinsic resolution to be soft at. (WEBP is not parsed; it is
 * not safe to send to email clients anyway, and lint-compat flags it separately if it appears.)
 */
export function readImageSize(path: string): ImageSize | null {
  try {
    if (/\.svg$/i.test(path)) return null;
    const buf = readFileSync(path);
    return png(buf) ?? jpeg(buf) ?? gif(buf) ?? { width: 0, height: 0, bytes: statSync(path).size };
  } catch {
    return null;
  }
}
