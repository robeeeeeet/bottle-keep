import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const OUTPUT_DIR = join(projectRoot, 'public', 'splash');

/**
 * iOS の起動画面（apple-touch-startup-image）を生成する。
 *
 * 未設定だと iOS は真っ暗な画面を出すため、アプリ本体と同じ紙色の地に
 * 印鑑風の「酒」ロゴを置いた画像を用意して、起動時の色の飛びを無くす。
 * ここでのレイアウトは globals.css の .launch-splash と一致させること
 * （静止画 → アニメーションの継ぎ目を消すため）。
 */

// ブランドカラー（globals.css のライトテーマと一致）
const COLORS = {
  bgTop: '#faf8f5', // --background
  bgBottom: '#f7f3ed', // --background-warm
  primary: '#1e4d78', // --primary
  gold: '#c7a252', // --gold
};

// CSSピクセル基準のレイアウト（.launch-splash と同じ値）
const LAYOUT = {
  sealSize: 88,
  sealRadius: 18,
  sealGlyphSize: 44,
  titleSize: 22,
  gapSealToTitle: 24,
  gapTitleToRule: 18,
  ruleHalfWidth: 46,
  ruleGapFromDiamond: 12,
  diamondSize: 5,
};

// 対象デバイス（縦向き）: CSSピクセルの幅・高さとデバイスピクセル比
const DEVICES = [
  // iPhone
  { w: 375, h: 667, dpr: 2, label: 'iphone-se-8-7-6s' },
  { w: 414, h: 736, dpr: 3, label: 'iphone-8-plus' },
  { w: 375, h: 812, dpr: 3, label: 'iphone-x-xs-11pro-12mini-13mini' },
  { w: 414, h: 896, dpr: 2, label: 'iphone-xr-11' },
  { w: 414, h: 896, dpr: 3, label: 'iphone-xsmax-11promax' },
  { w: 360, h: 780, dpr: 3, label: 'iphone-12mini-13mini' },
  { w: 390, h: 844, dpr: 3, label: 'iphone-12-13-14' },
  { w: 428, h: 926, dpr: 3, label: 'iphone-12promax-13promax-14plus' },
  { w: 393, h: 852, dpr: 3, label: 'iphone-14pro-15-16' },
  { w: 430, h: 932, dpr: 3, label: 'iphone-14promax-15plus-16plus' },
  { w: 402, h: 874, dpr: 3, label: 'iphone-16pro' },
  { w: 440, h: 956, dpr: 3, label: 'iphone-16promax' },
  // iPad
  { w: 744, h: 1133, dpr: 2, label: 'ipad-mini-83' },
  { w: 768, h: 1024, dpr: 2, label: 'ipad-102' },
  { w: 820, h: 1180, dpr: 2, label: 'ipad-air-109' },
  { w: 834, h: 1194, dpr: 2, label: 'ipad-pro-11' },
  { w: 1024, h: 1366, dpr: 2, label: 'ipad-pro-129' },
];

function buildSvg(cssWidth, cssHeight, dpr) {
  const W = cssWidth * dpr;
  const H = cssHeight * dpr;
  const s = (v) => v * dpr; // CSSピクセル → デバイスピクセル

  const L = LAYOUT;
  // 全体を縦中央に配置（.launch-splash の justify-content: center と一致）
  const blockHeight =
    L.sealSize + L.gapSealToTitle + L.titleSize + L.gapTitleToRule + L.diamondSize * 2;
  const blockTop = (cssHeight - blockHeight) / 2;
  const cx = cssWidth / 2;

  const sealX = cx - L.sealSize / 2;
  const sealY = blockTop;
  const glyphY = sealY + L.sealSize / 2;
  const titleY = sealY + L.sealSize + L.gapSealToTitle + L.titleSize * 0.78;
  const ruleY = titleY + L.gapTitleToRule;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.bgTop}"/>
      <stop offset="100%" stop-color="${COLORS.bgBottom}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#ground)"/>

  <!-- 印鑑風の座 -->
  <rect x="${s(sealX)}" y="${s(sealY)}" width="${s(L.sealSize)}" height="${s(L.sealSize)}"
        rx="${s(L.sealRadius)}" ry="${s(L.sealRadius)}"
        fill="${COLORS.primary}" fill-opacity="0.10"
        stroke="${COLORS.primary}" stroke-opacity="0.22" stroke-width="${s(1.5)}"/>
  <text x="${s(cx)}" y="${s(glyphY)}"
        font-family="Noto Serif CJK JP, Noto Serif JP, serif" font-weight="700"
        font-size="${s(L.sealGlyphSize)}" fill="${COLORS.primary}"
        text-anchor="middle" dominant-baseline="central">酒</text>

  <!-- ワードマーク -->
  <text x="${s(cx)}" y="${s(titleY)}"
        font-family="Noto Serif CJK JP, Noto Serif JP, serif" font-weight="700"
        font-size="${s(L.titleSize)}" fill="${COLORS.primary}"
        letter-spacing="${s(1.6)}" text-anchor="middle">Bottle Keep</text>

  <!-- 金の罫と菱形 -->
  <line x1="${s(cx - L.ruleHalfWidth)}" y1="${s(ruleY)}"
        x2="${s(cx - L.ruleGapFromDiamond)}" y2="${s(ruleY)}"
        stroke="${COLORS.gold}" stroke-opacity="0.5" stroke-width="${s(1)}"/>
  <line x1="${s(cx + L.ruleGapFromDiamond)}" y1="${s(ruleY)}"
        x2="${s(cx + L.ruleHalfWidth)}" y2="${s(ruleY)}"
        stroke="${COLORS.gold}" stroke-opacity="0.5" stroke-width="${s(1)}"/>
  <rect x="${s(cx - L.diamondSize / 2)}" y="${s(ruleY - L.diamondSize / 2)}"
        width="${s(L.diamondSize)}" height="${s(L.diamondSize)}"
        fill="${COLORS.gold}" fill-opacity="0.85"
        transform="rotate(45 ${s(cx)} ${s(ruleY)})"/>
</svg>`;
}

async function generate() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('iOS起動画面を生成します...\n');

  for (const device of DEVICES) {
    const W = device.w * device.dpr;
    const H = device.h * device.dpr;
    const filename = `splash-${W}x${H}.png`;
    const svg = buildSvg(device.w, device.h, device.dpr);

    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(join(OUTPUT_DIR, filename));

    console.log(`  ✓ ${filename.padEnd(22)} ${device.label}`);
  }

  console.log(`\n完了: ${DEVICES.length}件を public/splash/ に生成しました。`);
  console.log('layout.tsx の apple-touch-startup-image と対応させてください。');
}

generate().catch((error) => {
  console.error('生成に失敗しました:', error);
  process.exit(1);
});
