import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const assets = path.join(root, 'src', 'assets', 'images');
const pub = path.join(root, 'public');

const specs = [
  { rel: 'hero/patio.jpg', w: 1920, h: 1080, color: { r: 0, g: 48, b: 96 }, label: 'HERO PATIO' },
  { rel: 'hero/retaining-wall.jpg', w: 1920, h: 1080, color: { r: 1, g: 33, b: 65 }, label: 'HERO WALL' },
  { rel: 'services/masonry.jpg', w: 1200, h: 800, color: { r: 150, g: 46, b: 32 }, label: 'MASONRY' },
  { rel: 'services/hardscape.jpg', w: 1200, h: 800, color: { r: 30, g: 90, b: 120 }, label: 'HARDSCAPE' },
  { rel: 'services/patios.jpg', w: 1200, h: 800, color: { r: 70, g: 110, b: 70 }, label: 'PATIOS' },
  { rel: 'services/retaining-walls.jpg', w: 1200, h: 800, color: { r: 90, g: 70, b: 50 }, label: 'RETAINING' },
  { rel: 'gallery/patio-1.jpg', w: 1000, h: 750, color: { r: 60, g: 100, b: 80 }, label: 'GALLERY PATIO' },
  { rel: 'gallery/masonry-1.jpg', w: 1000, h: 750, color: { r: 120, g: 60, b: 40 }, label: 'GALLERY MASONRY' },
  { rel: 'gallery/wall-1.jpg', w: 1000, h: 750, color: { r: 80, g: 80, b: 90 }, label: 'GALLERY WALL' },
  { rel: 'gallery/hardscape-1.jpg', w: 1000, h: 750, color: { r: 40, g: 90, b: 110 }, label: 'GALLERY HARD' },
  { rel: 'blog/patio-planning.jpg', w: 1200, h: 675, color: { r: 50, g: 90, b: 70 }, label: 'BLOG PATIO' },
  { rel: 'blog/retaining-drainage.jpg', w: 1200, h: 675, color: { r: 70, g: 60, b: 50 }, label: 'BLOG DRAIN' },
  { rel: 'about/team.jpg', w: 1200, h: 800, color: { r: 0, g: 48, b: 96 }, label: 'ABOUT TEAM' },
  { rel: 'about/workshop.jpg', w: 1200, h: 800, color: { r: 150, g: 46, b: 32 }, label: 'ABOUT SHOP' },
];

function gradientSvg(w, h, color, label) {
  const end = {
    r: Math.max(0, color.r - 40),
    g: Math.max(0, color.g - 40),
    b: Math.max(0, color.b - 40),
  };
  const fontSize = Math.round(w / 18);
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgb(${color.r},${color.g},${color.b})"/>
      <stop offset="100%" stop-color="rgb(${end.r},${end.g},${end.b})"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="8%" y="40%" width="84%" height="20%" rx="12" fill="rgba(255,255,255,0.12)"/>
  <text x="50%" y="52%" text-anchor="middle" font-family="Arial,sans-serif" font-size="${fontSize}" fill="white" font-weight="700">${label}</text>
</svg>`);
}

async function makeJpeg(spec) {
  const out = path.join(assets, spec.rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(gradientSvg(spec.w, spec.h, spec.color, spec.label))
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  console.log('wrote', spec.rel, fs.statSync(out).size);
}

async function main() {
  for (const spec of specs) {
    await makeJpeg(spec);
  }

  fs.mkdirSync(pub, { recursive: true });

  fs.writeFileSync(
    path.join(pub, 'logo.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="60" viewBox="0 0 240 60" role="img" aria-label="Example Contractor">
  <rect width="240" height="60" rx="8" fill="#003060"/>
  <text x="120" y="38" text-anchor="middle" fill="#ffffff" font-family="Arial,sans-serif" font-size="18" font-weight="700">EXAMPLE CO.</text>
</svg>
`,
  );

  await sharp(
    Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#003060"/>
  <text x="50%" y="50%" text-anchor="middle" fill="white" font-family="Arial" font-size="48" font-weight="700">Example Contractor</text>
</svg>`),
  )
    .jpeg({ quality: 85 })
    .toFile(path.join(pub, 'og-default.jpg'));

  await sharp(
    Buffer.from(`<svg width="180" height="180" xmlns="http://www.w3.org/2000/svg">
  <rect width="180" height="180" rx="32" fill="#003060"/>
  <text x="90" y="105" text-anchor="middle" fill="white" font-family="Arial" font-size="64" font-weight="700">E</text>
</svg>`),
  )
    .png()
    .toFile(path.join(pub, 'apple-touch-icon.png'));

  const png32 = await sharp(
    Buffer.from(`<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="#003060"/>
  <text x="16" y="23" text-anchor="middle" fill="white" font-family="Arial" font-size="18" font-weight="700">E</text>
</svg>`),
  )
    .png()
    .toBuffer();

  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = 32;
  entry[1] = 32;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png32.length, 8);
  entry.writeUInt32LE(6 + 16, 12);
  fs.writeFileSync(path.join(pub, 'favicon.ico'), Buffer.concat([icoHeader, entry, png32]));

  console.log('public brand assets ready');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
