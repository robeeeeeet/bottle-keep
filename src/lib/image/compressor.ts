/**
 * 画像圧縮・変換ユーティリティ
 * - HEIC/HEIF → サーバーサイドでJPEGに変換
 * - 大きな画像は圧縮
 * - Base64変換
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export type CompressionResult =
  | {
      success: true;
      base64: string;
      mimeType: string;
      originalSize: number;
      compressedSize: number;
    }
  | {
      success: false;
      error: string;
    };

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
};

// サーバーサイド変換が必要な拡張子
const SERVER_CONVERT_EXTENSIONS = [".heic", ".heif", ".avif", ".tiff", ".tif"];

/**
 * サーバーサイド変換が必要かチェック
 */
export function needsServerConversion(file: File): boolean {
  const ext = file.name.toLowerCase();
  return SERVER_CONVERT_EXTENSIONS.some((e) => ext.endsWith(e));
}

/**
 * Check if compression is needed (file larger than threshold)
 */
function needsCompression(file: File, thresholdMB: number = 2): boolean {
  return file.size > thresholdMB * 1024 * 1024;
}

/**
 * Load image from File object
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;

    if (width > height) {
      width = maxWidth;
      height = Math.round(width / aspectRatio);
    } else {
      height = maxHeight;
      width = Math.round(height * aspectRatio);
    }

    if (width > maxWidth) {
      width = maxWidth;
      height = Math.round(width / aspectRatio);
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = Math.round(height * aspectRatio);
    }
  }

  return { width, height };
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/**
 * Compress an image file by resizing and converting to JPEG
 */
async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const img = await loadImage(file);

  const { width, height } = calculateDimensions(
    img.width,
    img.height,
    opts.maxWidth!,
    opts.maxHeight!
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", opts.quality);
  });

  if (!blob) {
    throw new Error("Failed to create compressed blob");
  }

  return blob;
}

/**
 * サーバーサイドでHEIC/HEIF等を変換
 */
async function convertWithServer(file: File): Promise<{
  base64: string;
  mimeType: string;
  convertedSize: number;
}> {
  console.log(`[ImageCompressor] Server converting: ${formatBytes(file.size)}`);

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/convert-image", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "サーバーでの変換に失敗しました");
  }

  console.log(
    `[ImageCompressor] Server converted: ${formatBytes(file.size)} -> ${formatBytes(result.convertedSize)}`
  );

  return {
    base64: result.base64,
    mimeType: result.mimeType,
    convertedSize: result.convertedSize,
  };
}

/**
 * BlobをBase64に変換
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

/**
 * 画像ファイルを圧縮してBase64に変換
 * - HEIC/HEIF等はサーバーサイドで変換
 * - 大きな画像は圧縮
 */
export async function compressAndConvertToBase64(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const originalSize = file.size;

  try {
    // サーバーサイド変換が必要な形式
    if (needsServerConversion(file)) {
      const result = await convertWithServer(file);
      return {
        success: true,
        base64: result.base64,
        mimeType: result.mimeType,
        originalSize,
        compressedSize: result.convertedSize,
      };
    }

    // 通常の画像処理（クライアントサイド）
    let processedBlob: Blob;
    let mimeType: string;

    if (needsCompression(file)) {
      console.log(`[ImageCompressor] Compressing: ${formatBytes(file.size)}`);
      processedBlob = await compressImage(file, options);
      mimeType = "image/jpeg";
      console.log(
        `[ImageCompressor] Compressed: ${formatBytes(file.size)} -> ${formatBytes(processedBlob.size)}`
      );
    } else {
      processedBlob = file;
      mimeType = file.type || "image/jpeg";
    }

    const base64 = await blobToBase64(processedBlob);

    return {
      success: true,
      base64,
      mimeType,
      originalSize,
      compressedSize: processedBlob.size,
    };
  } catch (error) {
    console.error("[ImageCompressor] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "画像の処理に失敗しました",
    };
  }
}
