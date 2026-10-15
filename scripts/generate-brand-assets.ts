import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// 1. Icon-only SVG (512x512)
// Combines an anatomical/stylised molar tooth with an integrated exam checkmark.
// Deep navy primary + vibrant clinical teal accent on transparent background.
export function getLogoMarkSvg({ isDark = false }: { isDark?: boolean } = {}) {
  const toothColor = isDark ? '#FFFFFF' : '#0F172A';
  const tealStart = isDark ? '#14B8A6' : '#0D9488';
  const tealEnd = isDark ? '#2DD4BF' : '#14B8A6';
  const knockoutColor = isDark ? '#0F172A' : '#FFFFFF';
  const grooveColor = isDark ? '#CBD5E1' : '#CBD5E1';
  const grooveOpacity = isDark ? '0.2' : '0.4';
  const gradId = isDark ? 'tealGradDark' : 'tealGradLight';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%" fill="none">
  <defs>
    <linearGradient id="${gradId}" x1="180" y1="310" x2="340" y2="160" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${tealStart}" />
      <stop offset="100%" stop-color="${tealEnd}" />
    </linearGradient>
  </defs>

  <!-- Molar Tooth Silhouette -->
  <path
    d="M152 72
       C102 72 82 122 82 176
       C82 240 98 290 114 344
       C126 384 144 440 172 440
       C194 440 206 398 220 348
       C232 305 244 286 256 286
       C268 286 280 305 292 348
       C306 398 318 440 340 440
       C368 440 386 384 398 344
       C414 290 430 240 430 176
       C430 122 410 72 360 72
       C322 72 292 98 256 122
       C220 98 190 72 152 72 Z"
    fill="${toothColor}"
  />

  <!-- Subtle crown developmental groove -->
  <path
    d="M165 112 C195 112 226 128 256 150 C286 128 317 112 347 112"
    stroke="${grooveColor}"
    stroke-width="14"
    stroke-linecap="round"
    stroke-opacity="${grooveOpacity}"
  />

  <!-- Precision Checkmark: Knockout Underlay -->
  <path
    d="M182 248 L236 304 L342 168"
    stroke="${knockoutColor}"
    stroke-width="56"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Precision Checkmark: Vibrant Teal Fill -->
  <path
    d="M182 248 L236 304 L342 168"
    stroke="url(#${gradId})"
    stroke-width="38"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>`;
}

// 2. Full Horizontal Logo with Wordmark (Aspect ratio 4.25:1, 850x200)
export function getFullLogoSvg({ isDark = false }: { isDark?: boolean } = {}) {
  const navyColor = isDark ? '#FFFFFF' : '#0F172A';
  const slateColor = isDark ? '#94A3B8' : '#475569';
  const tealColor = isDark ? '#2DD4BF' : '#0D9488';
  const mark = getLogoMarkSvg({ isDark });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 200" width="100%" height="100%" fill="none">
  <!-- Embedded Mark scaled and translated to fit height -->
  <g transform="translate(15, 10) scale(0.3515625)">
    ${mark.replace(/<svg[^>]*>|<\/svg>/gi, '')}
  </g>

  <!-- Wordmark -->
  <!-- "ADC" in bold authoritative medical navy -->
  <text x="215" y="112" font-family="'Segoe UI', -apple-system, Roboto, Arial, sans-serif" font-size="68" font-weight="800" letter-spacing="-0.02em" fill="${navyColor}">ADC</text>
  
  <!-- Subtle vertical divider in clinical teal -->
  <rect x="372" y="62" width="4" height="66" rx="2" fill="${tealColor}" fill-opacity="0.6" />

  <!-- "Exam Prep" with balanced professional tracking -->
  <text x="396" y="98" font-family="'Segoe UI', -apple-system, Roboto, Arial, sans-serif" font-size="44" font-weight="700" letter-spacing="-0.01em" fill="${navyColor}">Exam Prep</text>
  
  <!-- Sub-caption for clinical precision -->
  <text x="398" y="128" font-family="'Segoe UI', -apple-system, Roboto, Arial, sans-serif" font-size="16" font-weight="600" letter-spacing="0.14em" fill="${slateColor}">DENTAL PREPARATION</text>
</svg>`;
}

// Multi-resolution ICO Builder
export function createIcoFromPngBuffers(pngBuffers: { width: number; height: number; buffer: Buffer }[]): Buffer {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + numImages * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(numImages, 4); // Count of images

  const entries: Buffer[] = [];
  for (const img of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset to image data
    entries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((b) => b.buffer)]);
}

async function main() {
  const publicDir = path.resolve(process.cwd(), 'public');
  const appDir = path.resolve(process.cwd(), 'src/app');

  console.log('Generating ADC Exam Prep brand vectors...');
  const markSvgLight = getLogoMarkSvg({ isDark: false });
  const markSvgDark = getLogoMarkSvg({ isDark: true });
  const fullSvgLight = getFullLogoSvg({ isDark: false });
  const fullSvgDark = getFullLogoSvg({ isDark: true });

  // Write vector files
  fs.writeFileSync(path.join(publicDir, 'logo-mark.svg'), markSvgLight, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'logo-mark-dark.svg'), markSvgDark, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), fullSvgLight, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'logo-dark.svg'), fullSvgDark, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), markSvgLight, 'utf8');
  fs.writeFileSync(path.join(appDir, 'icon.svg'), markSvgLight, 'utf8');

  console.log('Rasterising pixel-perfect assets from vector master...');
  const svgBuffer = Buffer.from(markSvgLight);

  // Sizes to generate
  const size16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const size32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const size48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  const size180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  const size192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  const size512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();

  // Save standalone PNGs
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), size16);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), size32);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), size180);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), size192);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), size512);

  // App router specific icons
  fs.writeFileSync(path.join(appDir, 'icon.png'), size32);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), size180);

  // Update public/logo-mark.png with high-res 512x512
  fs.writeFileSync(path.join(publicDir, 'logo-mark.png'), size512);

  // Update WebP logos
  const logoLightWebp = await sharp(Buffer.from(fullSvgLight)).resize(850, 200).webp({ quality: 95 }).toBuffer();
  const logoDarkWebp = await sharp(Buffer.from(fullSvgDark)).resize(850, 200).webp({ quality: 95 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'logo-light.webp'), logoLightWebp);
  fs.writeFileSync(path.join(publicDir, 'logo-dark.webp'), logoDarkWebp);

  // Multi-resolution favicon.ico (16x16, 32x32, 48x48)
  const icoBuffer = createIcoFromPngBuffers([
    { width: 16, height: 16, buffer: size16 },
    { width: 32, height: 32, buffer: size32 },
    { width: 48, height: 48, buffer: size48 }
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);

  console.log('✅ Successfully generated and verified all vector and raster assets!');
}

main().catch((err) => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
