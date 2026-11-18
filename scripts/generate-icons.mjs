import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const half = size / 2;
  const r = size * 0.24; // Apple squircle-ish corner radius
  const pad = size * 0.06;
  const box = half - pad - r;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = Math.abs(x + 0.5 - half) - box;
      const dy = Math.abs(y + 0.5 - half) - box;
      const dist =
        Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;

      // Anti-aliased outer rounded square
      const alpha = Math.max(0, Math.min(1, 0.5 - dist));
      if (alpha <= 0) continue;

      const u = x / size;
      const v = y / size;

      // Soft Apple pearl-to-azure glass gradient
      let cr = Math.round(238 - u * 45 - v * 35);
      let cg = Math.round(244 - u * 28 - v * 22);
      let cb = Math.round(255 - u * 6 - v * 8);

      // Subtle glossy highlight near top-left
      const shine = Math.max(0, 1 - Math.hypot((u - 0.28) * 1.4, (v - 0.16) * 2.1));
      cr = Math.min(255, Math.round(cr + shine * 32));
      cg = Math.min(255, Math.round(cg + shine * 32));
      cb = Math.min(255, Math.round(cb + shine * 28));

      // Crisp inner glass rim
      if (dist > -size * 0.045) {
        cr = Math.min(255, cr + 25);
        cg = Math.min(255, cg + 25);
        cb = Math.min(255, cb + 25);
      }

      // Three layered prism bars (token layers motif) in deep Apple charcoal/blue
      const nx = u - 0.5;
      const ny = v - 0.5;
      const inTop = Math.abs(nx) < 0.23 && Math.abs(ny + 0.15) < 0.055;
      const inMid = Math.abs(nx) < 0.27 && Math.abs(ny) < 0.055;
      const inBot = Math.abs(nx) < 0.20 && Math.abs(ny - 0.15) < 0.055;

      if (inTop) {
        cr = 10;
        cg = 132;
        cb = 255;
      } else if (inMid) {
        cr = 22;
        cg = 26;
        cb = 36;
      } else if (inBot) {
        cr = 94;
        cg = 92;
        cb = 230;
      }

      rgba[idx] = cr;
      rgba[idx + 1] = cg;
      rgba[idx + 2] = cb;
      rgba[idx + 3] = Math.round(alpha * 255);
    }
  }
  return encodePng(size, size, rgba);
}

function encodeIco(pngBuffers, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // ICO
  header.writeUInt16LE(pngBuffers.length, 4);

  let offset = 6 + pngBuffers.length * 16;
  const entries = pngBuffers.map((buf, i) => {
    const e = Buffer.alloc(16);
    const s = sizes[i];
    e[0] = s >= 256 ? 0 : s;
    e[1] = s >= 256 ? 0 : s;
    e[2] = 0;
    e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

const outDir = path.resolve("D:\\projects\\token-glass\\src-tauri\\icons");
fs.mkdirSync(outDir, { recursive: true });

const png32 = renderIcon(32);
const png128 = renderIcon(128);
const png256 = renderIcon(256);

fs.writeFileSync(path.join(outDir, "32x32.png"), png32);
fs.writeFileSync(path.join(outDir, "128x128.png"), png128);
fs.writeFileSync(path.join(outDir, "icon.ico"), encodeIco([png32, png128, png256], [32, 128, 256]));

console.log("Generated Token Glass icons cleanly in", outDir);
