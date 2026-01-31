"use client";

import { useState } from "react";
import { PhotoUploader } from "@/components/add/photo-uploader";
import { AlcoholForm } from "@/components/add/alcohol-form";
import { ReviewForm, type ReviewData } from "@/components/add/review-form";
import { analyzeAlcohol, type AlcoholInfo } from "@/lib/gemini/analyze";
import { saveCollection } from "./actions";

type Step = "select" | "photo" | "manual" | "analyzing" | "review";

export default function AddPage() {
  const [step, setStep] = useState<Step>("select");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [alcoholInfo, setAlcoholInfo] = useState<AlcoholInfo | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 写真アップロード完了時 → Geminiで分析
  const handlePhotoUploaded = async (url: string) => {
    setPhotoUrl(url);
    setStep("analyzing");
    setAnalyzeError(null);

    try {
      const info = await analyzeAlcohol({ imageUrl: url });
      setAlcoholInfo(info);
      setStep("review");
    } catch (err) {
      console.error("Analysis error:", err);
      setAnalyzeError(
        err instanceof Error ? err.message : "分析に失敗しました"
      );
      setStep("photo");
    }
  };

  // 手動入力完了時 → Geminiで詳細情報取得
  const handleManualSubmit = async (name: string, type: string) => {
    setStep("analyzing");
    setAnalyzeError(null);

    try {
      const info = await analyzeAlcohol({ text: name, type });
      setAlcoholInfo(info);
      setStep("review");
    } catch (err) {
      console.error("Analysis error:", err);
      setAnalyzeError(
        err instanceof Error ? err.message : "情報取得に失敗しました"
      );
      setStep("manual");
    }
  };

  // 保存
  const handleSave = async (data: ReviewData) => {
    setIsSaving(true);
    try {
      await saveCollection({
        alcoholInfo: data.alcoholInfo,
        photoUrl: data.photoUrl,
        drinkingDate: data.drinkingDate,
        rating: data.rating,
        memo: data.memo,
      });
      // redirect()がServer Action内で実行されるので、ここには到達しない
    } catch (err) {
      setIsSaving(false);
      throw err;
    }
  };

  // 戻る
  const handleBack = () => {
    if (step === "photo" || step === "manual") {
      setStep("select");
      setAnalyzeError(null);
    } else if (step === "review") {
      setStep(photoUrl ? "photo" : "manual");
      setAlcoholInfo(null);
    }
  };

  return (
    <div className="px-4 pt-4">
      {/* ヘッダー */}
      <header className="flex items-center mb-6">
        {step !== "select" && step !== "analyzing" && (
          <button
            onClick={handleBack}
            className="mr-3 p-1 -ml-1 text-foreground/60 hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>
        )}
        <h1 className="text-2xl font-bold">
          {step === "select" && "お酒を追加"}
          {step === "photo" && "写真を撮影"}
          {step === "manual" && "銘柄を入力"}
          {step === "analyzing" && "分析中..."}
          {step === "review" && "情報を確認"}
        </h1>
      </header>

      {/* エラー表示 */}
      {analyzeError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm">
          {analyzeError}
        </div>
      )}

      {/* 選択画面 */}
      {step === "select" && (
        <div className="space-y-4">
          <p className="text-foreground/60 mb-6">
            お酒のラベルを撮影するか、銘柄を入力してください
          </p>

          {/* 写真を撮る */}
          <button
            onClick={() => setStep("photo")}
            className="w-full flex items-center gap-4 p-4 bg-primary/10 rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-primary"
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
            <div className="text-left">
              <h3 className="font-semibold">写真を撮る</h3>
              <p className="text-sm text-foreground/60">
                ラベルからAIが情報を読み取ります
              </p>
            </div>
          </button>

          {/* 手動入力 */}
          <button
            onClick={() => setStep("manual")}
            className="w-full flex items-center gap-4 p-4 bg-foreground/5 rounded-xl border-2 border-foreground/10 hover:border-foreground/20 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-semibold">銘柄を入力</h3>
              <p className="text-sm text-foreground/60">
                種類と名前を直接入力します
              </p>
            </div>
          </button>
        </div>
      )}

      {/* 写真アップロード */}
      {step === "photo" && <PhotoUploader onUploaded={handlePhotoUploaded} />}

      {/* 手動入力フォーム */}
      {step === "manual" && <AlcoholForm onSubmit={handleManualSubmit} />}

      {/* 分析中 */}
      {step === "analyzing" && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-foreground/60">AIがお酒の情報を分析中...</p>
        </div>
      )}

      {/* レビュー画面 */}
      {step === "review" && alcoholInfo && (
        <ReviewForm
          alcoholInfo={alcoholInfo}
          photoUrl={photoUrl}
          onSave={handleSave}
          isLoading={isSaving}
        />
      )}
    </div>
  );
}
