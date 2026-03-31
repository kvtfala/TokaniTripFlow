import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const SVG_PATH = path.join(process.cwd(), "client/public/favicon.svg");
const OUTPUT_DIR = path.join(process.cwd(), "client/public");

const SHARP_SIZES = [16, 32, 48]; // no rounding — browser tab sizes must be pixel-sharp
const ROUNDED_SIZES = [64, 180, 192, 512]; // rounded like iOS app icons

/**
 * Build an SVG buffer for the given output size.
 * Sharp sizes (< 64px): no border-radius — sharp corners are crisper at small pixel counts.
 * Rounded sizes (>= 64px): rx proportional to size (~15% of dimension) to match iOS/Android
 * app icon rounding conventions.
 */
function buildSvg(size: number): Buffer {
  const isRounded = ROUNDED_SIZES.includes(size);
  const rx = isRounded ? Math.round(size * 0.15) : 0;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <!-- Navy background tile${isRounded ? ` (rx=${rx} → ${Math.round((rx / size) * 100)}% rounding)` : " (sharp corners)"} -->
  <rect width="512" height="512" rx="${Math.round((rx / size) * 512)}" ry="${Math.round((rx / size) * 512)}" fill="#111B3F"/>

  <!-- White vertical stem of T (centered: 206–306, y: 75–435) -->
  <rect x="206" y="75" width="100" height="360" fill="#FFFFFF"/>

  <!-- Teal horizontal crossbar of T (x: 75–437, y: 75–155) -->
  <rect x="75" y="75" width="362" height="80" fill="#1FBED6"/>
</svg>`;

  return Buffer.from(svg);
}

async function generatePng(size: number): Promise<Buffer> {
  const svgBuffer = buildSvg(size);
  return sharp(svgBuffer).resize(size, size).png().toBuffer();
}

async function createIco(sizes: number[]): Promise<Buffer> {
  const pngBuffers: Buffer[] = [];
  for (const size of sizes) {
    const png = await generatePng(size);
    pngBuffers.push(png);
  }

  // ICO header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);            // reserved
  header.writeUInt16LE(1, 2);            // type: 1 = ICO
  header.writeUInt16LE(sizes.length, 4); // image count

  // Directory entries (16 bytes each)
  const dirSize = sizes.length * 16;
  let imageOffset = 6 + dirSize;

  const dirs: Buffer[] = [];
  for (let i = 0; i < sizes.length; i++) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 0); // width (0 = 256 in ICO spec)
    dir.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 1); // height (0 = 256 in ICO spec)
    dir.writeUInt8(0, 2);   // color count (0 = no palette, true-color)
    dir.writeUInt8(0, 3);   // reserved
    dir.writeUInt16LE(1, 4); // planes
    dir.writeUInt16LE(32, 6); // bit count
    dir.writeUInt32LE(pngBuffers[i].length, 8);  // bytes in resource
    dir.writeUInt32LE(imageOffset, 12);           // image offset
    imageOffset += pngBuffers[i].length;
    dirs.push(dir);
  }

  return Buffer.concat([header, ...dirs, ...pngBuffers]);
}

async function main() {
  const sizeMap: Array<{ size: number; filename: string }> = [
    { size: 16,  filename: "favicon-16.png" },
    { size: 32,  filename: "favicon-32.png" },
    { size: 48,  filename: "favicon-48.png" },
    { size: 64,  filename: "favicon-64.png" },
    { size: 180, filename: "apple-touch-icon.png" },
    { size: 192, filename: "favicon-192.png" },
    { size: 512, filename: "favicon-512.png" },
  ];

  for (const { size, filename } of sizeMap) {
    const png = await generatePng(size);
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, png);
    const isRounded = ROUNDED_SIZES.includes(size);
    console.log(`Generated ${filename} (${size}×${size}${isRounded ? ", rounded corners" : ", sharp corners"})`);
  }

  // Multi-size ICO containing 16, 32, and 48 px images — all sharp-cornered
  const icoBuffer = await createIco([16, 32, 48]);
  fs.writeFileSync(path.join(OUTPUT_DIR, "favicon.ico"), icoBuffer);
  console.log("Generated favicon.ico (16×16, 32×32, 48×48 embedded — sharp corners)");

  console.log("\nAll favicons generated successfully!");
}

main().catch((err) => {
  console.error("Error generating favicons:", err);
  process.exit(1);
});
