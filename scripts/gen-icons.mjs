// Generates PWA icons (solid design, no image deps): dark bg, emerald circle, down arrow.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const BG = [9, 9, 11]; // zinc-950
const FG = [16, 185, 129]; // emerald-500
const ARROW = [9, 9, 11];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makeIcon(size) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;

  // Down arrow geometry (inside circle)
  const shaftW = size * 0.09;
  const shaftTop = cy - radius * 0.55;
  const shaftBottom = cy + radius * 0.1;
  const headW = size * 0.22;
  const headBottom = cy + radius * 0.55;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let color = BG;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist <= radius) {
        color = FG;
        const inShaft =
          y >= shaftTop && y <= shaftBottom && Math.abs(x - cx) <= shaftW / 2;
        const inHead =
          y > shaftBottom &&
          y <= headBottom &&
          Math.abs(x - cx) <=
            (headW / 2) * (1 - (y - shaftBottom) / (headBottom - shaftBottom));
        if (inShaft || inHead) color = ARROW;
      }
      const offset = 1 + x * 3;
      row[offset] = color[0];
      row[offset + 1] = color[1];
      row[offset + 2] = color[2];
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(join(root, "public", "icons"), { recursive: true });
for (const size of [192, 512]) {
  const file = join(root, "public", "icons", `icon-${size}.png`);
  writeFileSync(file, makeIcon(size));
  console.log(`written ${file}`);
}
