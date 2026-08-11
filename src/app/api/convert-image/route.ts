/**
 * 画像変換 API Route
 * HEIC/HEIF などブラウザで表示できない形式を JPEG に変換
 */

import { NextRequest, NextResponse } from "next/server";
import heicConvert from "heic-convert";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

// 重い変換処理のため実行時間の上限を明示
export const maxDuration = 30;

// 変換設定
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 80;

// アップロード可能な最大サイズ（10MB）
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// マジックナンバーから判定する対応形式
type SupportedFormat = "heic" | "avif" | "tiff";

// ISO BMFF (HEIF系) のブランド
const HEIC_BRANDS = [
  "heic",
  "heix",
  "heim",
  "heis",
  "hevc",
  "hevx",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
];
const AVIF_BRANDS = ["avif", "avis"];

/**
 * ファイル先頭バイト（マジックナンバー）から形式を判定する
 * 拡張子は偽装できるため、必ずバイト列で検証する
 */
function detectFormat(buffer: Buffer): SupportedFormat | null {
  if (buffer.length < 12) return null;

  // TIFF: "II*\0"（リトルエンディアン） / "MM\0*"（ビッグエンディアン）
  if (
    (buffer[0] === 0x49 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x2a &&
      buffer[3] === 0x00) ||
    (buffer[0] === 0x4d &&
      buffer[1] === 0x4d &&
      buffer[2] === 0x00 &&
      buffer[3] === 0x2a)
  ) {
    return "tiff";
  }

  // ISO BMFF: 4バイトのボックスサイズ + "ftyp" + メジャーブランド + 互換ブランド
  if (buffer.toString("ascii", 4, 8) === "ftyp") {
    const declaredSize = buffer.readUInt32BE(0);
    const boxEnd = Math.min(
      declaredSize >= 16 ? declaredSize : 64,
      64,
      buffer.length
    );

    const brands: string[] = [];
    for (let offset = 8; offset + 4 <= boxEnd; offset += 4) {
      brands.push(buffer.toString("ascii", offset, offset + 4).toLowerCase());
    }

    // AVIF は mif1 を含むことがあるため先に判定する
    if (brands.some((brand) => AVIF_BRANDS.includes(brand))) return "avif";
    if (brands.some((brand) => HEIC_BRANDS.includes(brand))) return "heic";
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // 認証必須（重い変換処理を未認証で叩けないようにする）
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims.sub;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "画像ファイルが必要です" },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（10MB以下）
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "ファイルサイズは10MB以下にしてください" },
        { status: 400 }
      );
    }

    // ファイルをバッファに変換
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 拡張子ではなく先頭バイトで形式を判定
    const format = detectFormat(inputBuffer);

    if (!format) {
      return NextResponse.json(
        { success: false, error: "この形式は変換不要です" },
        { status: 400 }
      );
    }

    console.log(
      `[convert-image] Converting: ${format} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
    );

    let jpegBuffer: Buffer;

    if (format === "heic") {
      // HEIC/HEIF → heic-convert で JPEG に変換
      const convertedBuffer = await heicConvert({
        buffer: inputBuffer,
        format: "JPEG",
        quality: 0.9,
      });

      // Uint8Array を Buffer に変換
      const tempBuffer = Buffer.from(convertedBuffer);

      // Sharp でリサイズ
      jpegBuffer = await sharp(tempBuffer)
        .rotate() // EXIFの回転情報を適用
        .resize(MAX_WIDTH, MAX_HEIGHT, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
    } else {
      // AVIF / TIFF → Sharp で変換
      jpegBuffer = await sharp(inputBuffer)
        .rotate()
        .resize(MAX_WIDTH, MAX_HEIGHT, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
    }

    // Base64に変換
    const base64 = jpegBuffer.toString("base64");

    console.log(
      `[convert-image] Converted: ${(inputBuffer.length / 1024 / 1024).toFixed(2)}MB -> ${(jpegBuffer.length / 1024 / 1024).toFixed(2)}MB`
    );

    return NextResponse.json({
      success: true,
      base64,
      mimeType: "image/jpeg",
      originalSize: file.size,
      convertedSize: jpegBuffer.length,
    });
  } catch (error) {
    console.error("[convert-image] Error:", error);
    return NextResponse.json(
      { success: false, error: "変換に失敗しました" },
      { status: 500 }
    );
  }
}
