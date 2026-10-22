// Shrinks the hero photos: resizes them to 900px wide and saves them as WebP.
// Your originals are NOT touched. The new files go to src/assets/hero-optimized/
//
// Run once:   npm i -D sharp   then   node scripts/optimize-images.mjs
import sharp from "sharp";
import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const SRC = "src/assets/hero";
const OUT = "src/assets/hero-optimized";
const MAX_WIDTH = 900; // the tiles are never shown wider than this
const QUALITY = 72;

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
if (files.length === 0) {
  console.log(`No images found in ${SRC}`);
  process.exit(0);
}

let before = 0;
let after = 0;
for (const file of files) {
  const input = path.join(SRC, file);
  const output = path.join(OUT, `${path.parse(file).name}.webp`);
  await sharp(input)
    .rotate() // keeps phone photos the right way up
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(output);
  const a = (await stat(input)).size;
  const b = (await stat(output)).size;
  before += a;
  after += b;
  console.log(`${file}: ${(a / 1024).toFixed(0)} KB -> ${(b / 1024).toFixed(0)} KB`);
}
console.log(`\nTotal: ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB`);
