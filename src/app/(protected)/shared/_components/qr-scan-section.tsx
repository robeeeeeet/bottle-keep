"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * BarcodeDetector の最小型定義。
 * TypeScriptのDOM libに未収録のため、使う分だけ宣言する。
 */
type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
};
type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

/** jsQRに渡す前の最大辺サイズ（大きすぎる写真は縮小して処理時間を抑える） */
const MAX_DECODE_SIZE = 1400;

/** 招待コードの形式（生成側と同じ8文字） */
const INVITE_CODE_PATTERN = /^[A-Za-z0-9]{8}$/;

const GENERIC_ERROR =
  "QRコードを読み取れませんでした。明るい場所で、QRコード全体が写るように撮影してください。";

/** ファイルを描画可能な画像に変換する */
async function loadImage(
  file: File
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // 一部フォーマットで失敗するため <img> にフォールバック
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image decode failed"));
      image.src = objectUrl;
    });
  } finally {
    // onload後は描画に必要なデータがデコード済みなので解放してよい
    URL.revokeObjectURL(objectUrl);
  }
}

function getSize(source: ImageBitmap | HTMLImageElement): {
  width: number;
  height: number;
} {
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }
  return { width: source.width, height: source.height };
}

/** 画像をcanvasに描いて ImageData を取り出す */
function toImageData(
  source: ImageBitmap | HTMLImageElement
): ImageData | null {
  const { width, height } = getSize(source);
  if (!width || !height) return null;

  const scale = Math.min(1, MAX_DECODE_SIZE / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(source, 0, 0, targetWidth, targetHeight);
  return context.getImageData(0, 0, targetWidth, targetHeight);
}

/**
 * 写真からQRコードの文字列をデコードする。
 * BarcodeDetectorがあればそれを使い、無い場合のみ jsQR を動的importする。
 */
async function decodeQrFromFile(file: File): Promise<string | null> {
  const source = await loadImage(file);

  try {
    const detectorCtor = (
      window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
    ).BarcodeDetector;

    if (detectorCtor) {
      try {
        const detector = new detectorCtor({ formats: ["qr_code"] });
        const results = await detector.detect(source);
        const value = results[0]?.rawValue;
        if (value) return value;
      } catch (error) {
        // 未対応フォーマット等で失敗した場合は jsQR にフォールバックする
        console.warn("BarcodeDetector failed, falling back to jsQR:", error);
      }
    }

    const imageData = toImageData(source);
    if (!imageData) return null;

    // 初期表示のバンドルに含めないため動的import
    const jsQR = (await import("jsqr")).default;
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    return result?.data ?? null;
  } finally {
    if (!(source instanceof HTMLImageElement)) {
      source.close();
    }
  }
}

type ExtractResult = { code: string } | { error: string };

/**
 * 読み取った文字列から招待コードを取り出す。
 * 自サイトの /invite/<code> 形式のURL、または招待コードそのものだけを受け付ける。
 */
function extractInviteCode(raw: string): ExtractResult {
  const value = raw.trim();

  if (INVITE_CODE_PATTERN.test(value)) {
    return { code: value };
  }

  let url: URL;
  try {
    url = new URL(value, window.location.origin);
  } catch {
    return { error: "招待用のQRコードではありません。" };
  }

  if (url.origin !== window.location.origin) {
    return {
      error: "別のサイトのQRコードです。Bottle Keepの招待QRを読み取ってください。",
    };
  }

  const match = /^\/invite\/([^/]+)\/?$/.exec(url.pathname);
  const code = match ? decodeURIComponent(match[1]) : null;
  if (!code || !INVITE_CODE_PATTERN.test(code)) {
    return { error: "招待用のQRコードではありません。" };
  }

  return { code };
}

export function QrScanSection() {
  const router = useRouter();
  const [isDecoding, setIsDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    // 同じ写真を選び直せるよう、読み取り前に必ずvalueをリセットする
    event.target.value = "";
    if (!file) return;

    setError(null);
    setNotice(null);
    setIsDecoding(true);

    try {
      const raw = await decodeQrFromFile(file);
      if (!raw) {
        setError(GENERIC_ERROR);
        return;
      }

      const extracted = extractInviteCode(raw);
      if ("error" in extracted) {
        setError(extracted.error);
        return;
      }

      setNotice("招待を確認しています");
      // 確認画面は /invite/[code] に集約する
      router.push(`/invite/${extracted.code}`);
    } catch (decodeError) {
      console.error("QR decode failed:", decodeError);
      setError(GENERIC_ERROR);
    } finally {
      setIsDecoding(false);
    }
  };

  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-4">
        QRコードを読み取る
      </h2>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-vermilion/10 border border-vermilion/20"
        >
          <p className="text-sm text-vermilion">{error}</p>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {notice ?? ""}
      </p>

      <label className="block cursor-pointer">
        <div className="py-4 px-4 bg-primary/5 rounded-xl border-2 border-primary/20 flex items-center gap-4 hover:border-primary/40 hover:bg-primary/10 transition-colors">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            {isDecoding ? (
              <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-7 h-7 text-primary"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM13.5 14.25h2.25m0 0v2.25m0-2.25h4.5m-4.5 2.25v4.5m4.5-6.75v6.75m0 0h-2.25"
                />
              </svg>
            )}
          </div>
          <div>
            <p className="font-medium text-lg text-primary">
              {isDecoding ? "読み取り中..." : "QRコードを撮影"}
            </p>
            <p className="text-sm text-muted-foreground">
              相手の招待QRをカメラで撮ってフォロー
            </p>
          </div>
        </div>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={isDecoding}
          aria-label="QRコードの写真を撮影する"
          className="hidden"
        />
      </label>

      <p className="mt-3 text-xs text-muted-foreground">
        うまく読み取れないときは、明るい場所でQRコード全体が画面に入るように撮り直してください。
        <br />
        読み取れない場合は、相手からリンクを送ってもらう方法でもフォローできます。
      </p>
    </section>
  );
}
