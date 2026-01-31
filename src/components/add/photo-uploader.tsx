"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Props = {
  onUploaded: (url: string) => void;
};

export function PhotoUploader({ onUploaded }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（10MB以下）
    if (file.size > 10 * 1024 * 1024) {
      setError("ファイルサイズは10MB以下にしてください");
      return;
    }

    // 画像タイプチェック
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }

    setError(null);
    setSelectedFile(file);

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !preview) return;

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();

      // ユーザーIDを取得
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です");

      // ファイル名を生成（ユーザーID + タイムスタンプ + 元の拡張子）
      const ext = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      // Supabase Storageにアップロード
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 公開URLを取得
      const {
        data: { publicUrl },
      } = supabase.storage.from("photos").getPublicUrl(fileName);

      onUploaded(publicUrl);
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error ? err.message : "アップロードに失敗しました"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        // ファイル選択エリア
        <label className="block cursor-pointer">
          <div className="aspect-square bg-foreground/5 rounded-xl border-2 border-dashed border-foreground/20 flex flex-col items-center justify-center gap-3 hover:border-foreground/40 transition-colors">
            <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium">タップして写真を選択</p>
              <p className="text-sm text-foreground/60">
                カメラで撮影またはギャラリーから選択
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      ) : (
        // プレビュー表示
        <div className="space-y-4">
          <div className="aspect-square relative rounded-xl overflow-hidden bg-foreground/5">
            <Image
              src={preview}
              alt="プレビュー"
              fill
              className="object-contain"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={uploading}
              className="flex-1 py-3 px-4 rounded-xl border border-foreground/20 font-medium disabled:opacity-50"
            >
              撮り直す
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  アップロード中...
                </>
              ) : (
                "この写真を使う"
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      <p className="text-xs text-foreground/40 text-center">
        お酒のラベルがはっきり写るように撮影してください
      </p>
    </div>
  );
}
