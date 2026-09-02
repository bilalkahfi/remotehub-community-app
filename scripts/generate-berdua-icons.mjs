// Bikin ikon PWA Berdua tanpa dependency gambar - cukup zlib bawaan Node.
// Jalanin ulang kalau mau ganti warna: node scripts/generate-berdua-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "berdua");

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => Math.round(a + (b - a) * Math.min(1, Math.max(0, t)));

/** Persamaan hati klasik: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0 */
function insideHeart(x, y) {
  const t = x * x + y * y - 1;
  return t * t * t - x * x * y * y * y <= 0;
}

function render(size, { padding, rounded }) {
  const SS = 3; // supersample biar pinggirannya gak jagged
  const pixels = Buffer.alloc(size * size * 4);
  const radius = rounded ? size * 0.22 : 0;
  const heartScale = (1 - padding) * 0.78;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let bgAlpha = 0;
      let heartAlpha = 0;

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;

          if (rounded) {
            const cx = Math.min(Math.max(px, radius), size - radius);
            const cy = Math.min(Math.max(py, radius), size - radius);
            if (Math.hypot(px - cx, py - cy) <= radius) bgAlpha += 1;
          } else {
            bgAlpha += 1;
          }

          const hx = (px / size - 0.5) * 2 / heartScale;
          const hy = ((0.5 - py / size) * 2 / heartScale + 0.2) * 1.16;
          if (insideHeart(hx * 1.12, hy)) heartAlpha += 1;
        }
      }

      const total = SS * SS;
      bgAlpha /= total;
      heartAlpha /= total;

      // Gradien diagonal rose -> violet.
      const t = (x / size + y / size) / 2;
      let r = mix(0xf4, 0x7c, t);
      let g = mix(0x3f, 0x3a, t);
      let b = mix(0x5e, 0xed, t);

      if (heartAlpha > 0) {
        r = mix(r, 0xff, heartAlpha);
        g = mix(g, 0xf5, heartAlpha);
        b = mix(b, 0xf7, heartAlpha);
      }

      const i = (y * size + x) * 4;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = Math.round(bgAlpha * 255);
    }
  }

  return encodePng(size, size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  ["icon-192.png", 192, { padding: 0.1, rounded: true }],
  ["icon-512.png", 512, { padding: 0.1, rounded: true }],
  // Maskable butuh safe zone ~20% karena Android bisa motong jadi lingkaran.
  ["icon-maskable-512.png", 512, { padding: 0.36, rounded: false }],
  ["apple-touch-icon.png", 180, { padding: 0.1, rounded: false }],
];

for (const [name, size, options] of targets) {
  writeFileSync(join(OUT_DIR, name), render(size, options));
  console.log(`✓ ${name} (${size}x${size})`);
}
