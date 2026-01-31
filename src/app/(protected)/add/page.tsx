"use client";

import { useState, lazy, Suspense } from "react";
import { analyzeAlcohol, type AlcoholInfo } from "@/lib/gemini/analyze";
import { saveCollection } from "./actions";
import type { ReviewData } from "@/components/add/review-form";

// 動的インポート（初期表示に不要なコンポーネントを遅延読み込み）
const PhotoUploader = lazy(() =>
  import("@/components/add/photo-uploader").then((mod) => ({
    default: mod.PhotoUploader,
  }))
);
const AlcoholForm = lazy(() =>
  import("@/components/add/alcohol-form").then((mod) => ({
    default: mod.AlcoholForm,
  }))
);
const ReviewForm = lazy(() =>
  import("@/components/add/review-form").then((mod) => ({
    default: mod.ReviewForm,
  }))
);
const CandidateSelector = lazy(() =>
  import("@/components/add/candidate-selector").then((mod) => ({
    default: mod.CandidateSelector,
  }))
);
const AlcoholConfirm = lazy(() =>
  import("@/components/add/alcohol-confirm").then((mod) => ({
    default: mod.AlcoholConfirm,
  }))
);

// コンポーネント読み込み中のフォールバック
function ComponentLoader() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

type Step = "select" | "photo" | "manual" | "analyzing" | "confirm" | "candidates" | "review";

// 元の検索パラメータを保持する型
type OriginalQuery =
  | { type: "image"; imageUrl: string }
  | { type: "text"; text: string; alcoholType: string };

export default function AddPage() {
  const [step, setStep] = useState<Step>("select");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [alcoholInfo, setAlcoholInfo] = useState<AlcoholInfo | null>(null);
  const [candidates, setCandidates] = useState<AlcoholInfo[]>([]);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // 元の検索クエリを保持（代替候補取得時に使用）
  const [originalQuery, setOriginalQuery] = useState<OriginalQuery | null>(null);

  // 写真アップロード完了時 → Geminiで分析
  const handlePhotoUploaded = async (url: string) => {
    setPhotoUrl(url);
    setStep("analyzing");
    setAnalyzeError(null);
    setOriginalQuery({ type: "image", imageUrl: url });

    try {
      const response = await analyzeAlcohol({ imageUrl: url });

      if (response.unique) {
        // 一意に特定できた場合 → 確認画面へ
        setAlcoholInfo(response.result);
        setStep("confirm");
      } else {
        // 複数候補がある場合 → 候補選択画面へ
        setCandidates(response.candidates);
        setStep("candidates");
      }
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
    setOriginalQuery({ type: "text", text: name, alcoholType: type });

    try {
      const response = await analyzeAlcohol({ text: name, type });

      if (response.unique) {
        // 一意に特定できた場合 → 確認画面へ
        setAlcoholInfo(response.result);
        setStep("confirm");
      } else {
        // 複数候補がある場合 → 候補選択画面へ
        setCandidates(response.candidates);
        setStep("candidates");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setAnalyzeError(
        err instanceof Error ? err.message : "情報取得に失敗しました"
      );
      setStep("manual");
    }
  };

  // 確認画面で「合っている」を選択
  const handleConfirm = () => {
    setStep("review");
  };

  // 確認画面で「違う」を選択 → 代替候補を取得
  const handleReject = async () => {
    if (!alcoholInfo || !originalQuery) return;

    setStep("analyzing");
    setAnalyzeError(null);

    try {
      let response;
      if (originalQuery.type === "image") {
        response = await analyzeAlcohol({
          imageUrl: originalQuery.imageUrl,
          rejectedName: alcoholInfo.name,
        });
      } else {
        response = await analyzeAlcohol({
          text: originalQuery.text,
          type: originalQuery.alcoholType,
          rejectedName: alcoholInfo.name,
        });
      }

      if (response.unique) {
        // まだ一意の結果が返ってきた場合は、それを候補として表示
        setCandidates([response.result]);
      } else {
        setCandidates(response.candidates);
      }
      setAlcoholInfo(null);
      setStep("candidates");
    } catch (err) {
      console.error("Analysis error:", err);
      setAnalyzeError(
        err instanceof Error ? err.message : "代替候補の取得に失敗しました"
      );
      setStep("confirm");
    }
  };

  // 候補選択時
  const handleCandidateSelect = (selected: AlcoholInfo) => {
    setAlcoholInfo(selected);
    setCandidates([]);
    setStep("review");
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
      setOriginalQuery(null);
    } else if (step === "confirm") {
      // 確認画面から戻る → 入力画面に戻る
      setStep(originalQuery?.type === "image" ? "photo" : "manual");
      setAlcoholInfo(null);
    } else if (step === "candidates") {
      // 候補選択画面から戻る → 入力画面に戻る
      setStep(originalQuery?.type === "image" ? "photo" : "manual");
      setCandidates([]);
      setAlcoholInfo(null);
    } else if (step === "review") {
      // レビュー画面から戻る → 確認画面に戻る（候補選択経由の場合は候補選択に）
      if (candidates.length > 0) {
        setStep("candidates");
      } else {
        setStep("confirm");
      }
    }
  };

  return (
    <div className="px-4 pt-4">
      {/* ヘッダー */}
      <header className="flex items-center mb-6">
        {step !== "select" && step !== "analyzing" && (
          <button
            onClick={handleBack}
            className="mr-3 p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
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
        <h1 className="text-2xl font-bold text-primary">
          {step === "select" && "お酒を追加"}
          {step === "photo" && "写真を撮影"}
          {step === "manual" && "銘柄を入力"}
          {step === "analyzing" && "分析中..."}
          {step === "confirm" && "銘柄を確認"}
          {step === "candidates" && "銘柄を選択"}
          {step === "review" && "情報を確認"}
        </h1>
      </header>

      {/* エラー表示 */}
      {analyzeError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm">
          {analyzeError}
        </div>
      )}

      {/* 選択画面 */}
      {step === "select" && (
        <div className="space-y-4">
          <p className="text-muted-foreground mb-6">
            お酒のラベルを撮影するか、銘柄を入力してください
          </p>

          {/* 写真を撮る */}
          <button
            onClick={() => setStep("photo")}
            className="w-full flex items-center gap-4 p-4 bg-primary/5 rounded-lg border-l-4 border-primary hover:bg-primary/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
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
              <p className="text-sm text-muted-foreground">
                ラベルからAIが情報を読み取ります
              </p>
            </div>
          </button>

          {/* 手動入力 */}
          <button
            onClick={() => setStep("manual")}
            className="w-full flex items-center gap-4 p-4 bg-muted rounded-lg border border-border hover:border-primary/40 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-border/50 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-muted-foreground"
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
              <p className="text-sm text-muted-foreground">
                種類と名前を直接入力します
              </p>
            </div>
          </button>
        </div>
      )}

      {/* 写真アップロード */}
      {step === "photo" && (
        <Suspense fallback={<ComponentLoader />}>
          <PhotoUploader onUploaded={handlePhotoUploaded} />
        </Suspense>
      )}

      {/* 手動入力フォーム */}
      {step === "manual" && (
        <Suspense fallback={<ComponentLoader />}>
          <AlcoholForm onSubmit={handleManualSubmit} />
        </Suspense>
      )}

      {/* 分析中 */}
      {step === "analyzing" && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground">AIがお酒の情報を分析中...</p>
        </div>
      )}

      {/* 確認画面 */}
      {step === "confirm" && alcoholInfo && (
        <Suspense fallback={<ComponentLoader />}>
          <AlcoholConfirm
            alcoholInfo={alcoholInfo}
            onConfirm={handleConfirm}
            onReject={handleReject}
          />
        </Suspense>
      )}

      {/* 候補選択画面 */}
      {step === "candidates" && candidates.length > 0 && (
        <Suspense fallback={<ComponentLoader />}>
          <CandidateSelector
            candidates={candidates}
            onSelect={handleCandidateSelect}
          />
        </Suspense>
      )}

      {/* レビュー画面 */}
      {step === "review" && alcoholInfo && (
        <Suspense fallback={<ComponentLoader />}>
          <ReviewForm
            alcoholInfo={alcoholInfo}
            photoUrl={photoUrl}
            onSave={handleSave}
            isLoading={isSaving}
          />
        </Suspense>
      )}
    </div>
  );
}
