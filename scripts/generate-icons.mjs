/**
 * Run once to generate PWA icons:  node scripts/generate-icons.mjs
 * Requires sharp: npm install sharp
 */
import sharp from "sharp";
import { mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");

mkdirSync(publicDir, { recursive: true });

const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000000" rx="80"/>
  <text
    x="256"
    y="360"
    font-family="Georgia, serif"
    font-size="300"
    font-weight="400"
    font-style="italic"
    fill="#ffffff"
    text-anchor="middle"
  >E</text>
</svg>
`;

const buf = Buffer.from(svgContent);

await sharp(buf).resize(192, 192).png().toFile(path.join(publicDir, "icon-192.png"));
console.log("✓ icon-192.png");

await sharp(buf).resize(512, 512).png().toFile(path.join(publicDir, "icon-512.png"));
console.log("✓ icon-512.png");
