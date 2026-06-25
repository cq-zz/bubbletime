const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const SIZES = [16, 32, 180];

function crc32(buf) {
  let c = 0xffffffff;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    table[n] = v;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([t, data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, t, data, c]);
}

function createPNG(w, h) {
  // Raw image data: filter byte (0) + RGB bytes per pixel
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const rowStart = y * (w * 3 + 1);
    raw[rowStart] = 0; // filter byte
    for (let x = 0; x < w; x++) {
      const cx = w / 2,
        cy = h / 2,
        r = Math.min(w, h) / 2 - 2;
      const dx = x - cx,
        dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inside = dist <= r;
      // Dark gradient background
      const bg = Math.round((1 - dist / (w * 0.7)) * 11);
      const pr = inside ? Math.round(108 - dist * 0.3) : Math.max(0, bg);
      const pg = inside ? Math.round(99 - dist * 0.3) : Math.max(0, bg);
      const pb = inside ? Math.round(255 - dist * 0.5) : Math.max(0, bg);
      const off = rowStart + 1 + x * 3;
      raw[off] = pr;
      raw[off + 1] = pg;
      raw[off + 2] = pb;
    }
  }
  const deflated = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflated), chunk("IEND", Buffer.alloc(0))]);
}

const outDir = path.resolve(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

for (const s of SIZES) {
  const p = path.join(outDir, `icon-${s}.png`);
  fs.writeFileSync(p, createPNG(s, s));
  console.log(`Generated ${p} (${s}x${s})`);
}
