import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const size = 180;
const samples = 4;
const scale = 48 / size;
const background = [17, 24, 39];

const bars = [
  { x: 6, y: 18.5, width: 4, height: 11, color: [96, 165, 250] },
  { x: 14, y: 14, width: 4, height: 20, color: [165, 180, 252] },
  { x: 22, y: 10, width: 4, height: 28, color: [226, 232, 240] },
  { x: 30, y: 14, width: 4, height: 20, color: [165, 180, 252] },
  { x: 38, y: 18.5, width: 4, height: 11, color: [96, 165, 250] },
];

function contains(bar, x, y) {
  const radius = 2;
  const centerX = bar.x + bar.width / 2;

  const centerY = Math.max(
    bar.y + radius,
    Math.min(y, bar.y + bar.height - radius),
  );

  return (x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2;
}

const pixels = Buffer.alloc((size * 3 + 1) * size);

for (let y = 0; y < size; y++) {
  const row = y * (size * 3 + 1);
  pixels[row] = 0;

  for (let x = 0; x < size; x++) {
    const color = [0, 0, 0];

    for (let sy = 0; sy < samples; sy++) {
      for (let sx = 0; sx < samples; sx++) {
        const pointX = (x + (sx + 0.5) / samples) * scale;
        const pointY = (y + (sy + 0.5) / samples) * scale;

        const sample =
          bars.find((bar) => contains(bar, pointX, pointY))?.color ??
          background;

        for (let channel = 0; channel < 3; channel++) {
          color[channel] += sample[channel];
        }
      }
    }

    for (let channel = 0; channel < 3; channel++) {
      pixels[row + 1 + x * 3 + channel] = Math.round(
        color[channel] / samples ** 2,
      );
    }
  }
}

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const content = Buffer.concat([Buffer.from(type, "ascii"), data]);

  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);

  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(content));

  return Buffer.concat([length, content, checksum]);
}

const header = Buffer.alloc(13);

header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 2;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(pixels)),
  chunk("IEND", Buffer.alloc(0)),
]);

const publicDirectory = new URL("../public/", import.meta.url);
const destination = new URL("appleTouchIcon.png", publicDirectory);

mkdirSync(publicDirectory, { recursive: true });
writeFileSync(destination, png);

console.log(`Generado: ${fileURLToPath(destination)} (${size} × ${size})`);
