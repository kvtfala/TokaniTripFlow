import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const SVG_PATH = path.join(process.cwd(), "client/public/favicon.svg");
const OUTPUT_DIR = path.join(process.cwd(), "client/public");

const svgContent = fs.readFileSync(SVG_PATH, "utf-8");
const svgBuffer = Buffer.from(svgContent);

async function generatePng(size: number): Promise<Buffer> {
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
  header.writeUInt16LE(0, 0);       // reserved
  header.writeUInt16LE(1, 2);       // type: 1 = ICO
  header.writeUInt16LE(sizes.length, 4); // image count

  // Directory entries (16 bytes each)
  const dirSize = sizes.length * 16;
  let imageOffset = 6 + dirSize;

  const dirs: Buffer[] = [];
  for (let i = 0; i < sizes.length; i++) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 0); // width (0 = 256)
    dir.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 1); // height (0 = 256)
    dir.writeUInt8(0, 2);  // color count (0 = no palette)
    dir.writeUInt8(0, 3);  // reserved
    dir.writeUInt16LE(1, 4); // planes
    dir.writeUInt16LE(32, 6); // bit count
    dir.writeUInt32LE(pngBuffers[i].length, 8);  // bytes in resource
    dir.writeUInt32LE(imageOffset, 12); // image offset
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
    console.log(`Generated ${filename} (${size}×${size})`);
  }

  // Multi-size ICO containing 16, 32, and 48 px images
  const icoBuffer = await createIco([16, 32, 48]);
  fs.writeFileSync(path.join(OUTPUT_DIR, "favicon.ico"), icoBuffer);
  console.log("Generated favicon.ico (16×16, 32×32, 48×48 embedded)");

  console.log("\nAll favicons generated successfully!");
}

main().catch((err) => {
  console.error("Error generating favicons:", err);
  process.exit(1);
});
