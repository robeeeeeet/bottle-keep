/**
 * 画像変換 API Route
 * HEIC/HEIF などブラウザで表示できない形式を JPEG に変換
 */

import { NextRequest, NextResponse } from "next/server";
import heicConvert from "heic-convert";
import sharp from "sharp";

// 変換設定
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 80;

// HEIC/HEIF形式かどうかを判定
function isHeicFile(file: File): boolean {
  const ext = file.name.toLowerCase();
  return ext.endsWith(".heic") || ext.endsWith(".heif");
}

// その他のサーバー変換が必要な形式
function needsSharpConversion(file: File): boolean {
  const ext = file.name.toLowerCase();
  return [".avif", ".tiff", ".tif"].some((e) => ext.endsWith(e));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "画像ファイルが必要です" },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（20MB以下）
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "ファイルサイズは20MB以下にしてください" },
        { status: 400 }
      );
    }

    console.log(
      `[convert-image] Converting: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`
    );

    // ファイルをバッファに変換
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    let jpegBuffer: Buffer;

    if (isHeicFile(file)) {
      // HEIC/HEIF → heic-convert で JPEG に変換
      console.log("[convert-image] Using heic-convert for HEIC file");

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
    } else if (needsSharpConversion(file)) {
      // その他の形式 → Sharp で変換
      console.log("[convert-image] Using sharp for conversion");

      jpegBuffer = await sharp(inputBuffer)
        .rotate()
        .resize(MAX_WIDTH, MAX_HEIGHT, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
    } else {
      return NextResponse.json(
        { success: false, error: "この形式は変換不要です" },
        { status: 400 }
      );
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
      {
        success: false,
        error: error instanceof Error ? error.message : "変換に失敗しました",
      },
      { status: 500 }
    );
  }
}
