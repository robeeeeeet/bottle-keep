import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const SOURCE = join(projectRoot, 'full-size-icon.png');
const OUTPUT_DIR = join(projectRoot, 'public');
const ICONS_DIR = join(OUTPUT_DIR, 'icons');

// 必要なアイコンサイズ
const ICON_SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icons/icon-192.png' },
  { size: 384, name: 'icons/icon-384.png' },
  { size: 512, name: 'icons/icon-512.png' },
];

// Maskable icon用（パディング付き）
const MASKABLE_SIZES = [
  { size: 192, name: 'icons/icon-192-maskable.png' },
  { size: 512, name: 'icons/icon-512-maskable.png' },
];

async function generateIcons() {
  // 出力ディレクトリ作成
  await mkdir(ICONS_DIR, { recursive: true });

  // 元画像を読み込み、正方形にクロップ
  const image = sharp(SOURCE);
  const metadata = await image.metadata();

  const size = Math.min(metadata.width, metadata.height);
  const left = Math.floor((metadata.width - size) / 2);
  const top = Math.floor((metadata.height - size) / 2);

  console.log(`元画像: ${metadata.width}x${metadata.height}`);
  console.log(`クロップ: ${size}x${size} (left: ${left}, top: ${top})`);

  // 正方形にクロップした画像をバッファに
  const croppedBuffer = await image
    .extract({ left, top, width: size, height: size })
    .toBuffer();

  // 通常アイコンを生成
  for (const { size: targetSize, name } of ICON_SIZES) {
    const outputPath = join(OUTPUT_DIR, name);
    await sharp(croppedBuffer)
      .resize(targetSize, targetSize, { fit: 'cover' })
      .png()
      .toFile(outputPath);
    console.log(`✓ ${name} (${targetSize}x${targetSize})`);
  }

  // Maskable アイコンを生成（10%のパディング付き）
  for (const { size: targetSize, name } of MASKABLE_SIZES) {
    const outputPath = join(OUTPUT_DIR, name);
    const innerSize = Math.floor(targetSize * 0.8); // 80%のサイズ
    const padding = Math.floor((targetSize - innerSize) / 2);

    // 背景色を元画像の角から取得（または固定色）
    const backgroundColor = '#2a1810'; // 木目の暗い部分の色

    await sharp(croppedBuffer)
      .resize(innerSize, innerSize, { fit: 'cover' })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: backgroundColor,
      })
      .png()
      .toFile(outputPath);
    console.log(`✓ ${name} (${targetSize}x${targetSize}, maskable)`);
  }

  // favicon.ico 用に複数サイズをまとめる（sharpはICO非対応なのでPNGで代用）
  console.log('\n✅ アイコン生成完了！');
  console.log('\n次のステップ:');
  console.log('1. manifest.json を更新');
  console.log('2. layout.tsx にメタデータを追加');
}

generateIcons().catch(console.error);
