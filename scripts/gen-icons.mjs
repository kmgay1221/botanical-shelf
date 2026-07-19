import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const BG = "#0f1411";
const GLAUCOUS = "#a9c6b4";
const GLAUCOUS_DARK = "#7ba98d";

// アガベロゼット SVG（login/page.tsx の AgaveLogo と同系統の意匠）
// viewBox は 0..100。maskable アイコンとして安全ゾーン（中心から半径40）に収める。
function rosetteSvg({ leaves = 10 } = {}) {
  const cx = 50, cy = 50;
  const rx = 7.5, ry = 25;
  let ellipses = "";
  for (let i = 0; i < leaves; i++) {
    const deg = (360 / leaves) * i;
    const fill = i % 2 === 0 ? GLAUCOUS : GLAUCOUS_DARK;
    ellipses += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" fill-opacity="0.92" transform="rotate(${deg} ${cx} ${cy})" />\n`;
  }
  return `
<svg width="512" height="512" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="${BG}" />
  <g>
    ${ellipses}
    <circle cx="${cx}" cy="${cy}" r="9" fill="${GLAUCOUS}" />
  </g>
</svg>`;
}

const iconsDir = join(root, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

const svg = rosetteSvg();

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, `icon-${size}.png`));
  console.log("wrote", `icon-${size}.png`);
}

await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile(join(iconsDir, "apple-touch-icon.png"));
console.log("wrote apple-touch-icon.png");
