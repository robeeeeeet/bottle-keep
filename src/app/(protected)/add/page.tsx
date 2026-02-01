"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { analyzeAlcohol, type AlcoholInfo } from "@/lib/gemini/analyze";
import { saveCollection, getAlcoholById } from "./actions";
import type { ReviewData } from "@/components/add/review-form";
import { HeaderActions } from "@/components/layout/header-actions";

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

type Step =
  | "select"
  | "photo"
  | "manual"
  | "analyzing"
  | "confirm"
  | "candidates"
  | "review";

// 元の検索パラメータを保持する型
type OriginalQuery =
  | { type: "image"; imageBase64: string }
  | { type: "text"; text: string; alcoholType: string };

export default function AddPage() {
  const searchParams = useSearchParams();
  const existingAlcoholId = searchParams.get("alcoholId");

  const [step, setStep] = useState<Step>("select");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [alcoholInfo, setAlcoholInfo] = useState<AlcoholInfo | null>(null);
  const [candidates, setCandidates] = useState<AlcoholInfo[]>([]);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAlcohol, setIsLoadingAlcohol] = useState(false);
  // 元の検索クエリを保持（代替候補取得時に使用）
  const [originalQuery, setOriginalQuery] = useState<OriginalQuery | null>(
    null
  );

  // 既存のお酒に対するレビュー追加の場合、お酒情報を取得して直接レビュー画面へ
  useEffect(() => {
    if (existingAlcoholId && !alcoholInfo && !isLoadingAlcohol) {
      setIsLoadingAlcohol(true);
      getAlcoholById(existingAlcoholId).then((info) => {
        if (info) {
          setAlcoholInfo(info);
          setStep("review");
        } else {
          setAnalyzeError("お酒情報の取得に失敗しました");
        }
        setIsLoadingAlcohol(false);
      });
    }
  }, [existingAlcoholId, alcoholInfo, isLoadingAlcohol]);

  // 写真アップロード完了時 → Geminiで分析
  const handlePhotoUploaded = async (url: string, base64: string) => {
    setPhotoUrl(url);
    setStep("analyzing");
    setAnalyzeError(null);
    setOriginalQuery({ type: "image", imageBase64: base64 });

    try {
      // Base64を使って分析（スタックオーバーフロー回避）
      const response = await analyzeAlcohol({ imageBase64: base64 });

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
          imageBase64: originalQuery.imageBase64,
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
        existingAlcoholId: existingAlcoholId, // フレンドのお酒にレビュー追加時のID
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
      // 既存のお酒への追加の場合は棚に戻る
      if (existingAlcoholId) {
        window.location.href = "/shelf";
        return;
      }
      // レビュー画面から戻る → 確認画面に戻る（候補選択経由の場合は候補選択に）
      if (candidates.length > 0) {
        setStep("candidates");
      } else {
        setStep("confirm");
      }
    }
  };

  // ステップに応じたヘッダータイトル
  const getHeaderTitle = () => {
    // 既存のお酒への追加の場合
    if (existingAlcoholId) {
      if (isLoadingAlcohol) return "読み込み中";
      return "自分の記録を追加";
    }
    switch (step) {
      case "select":
        return "お酒を追加";
      case "photo":
        return "写真を撮影";
      case "manual":
        return "銘柄を入力";
      case "analyzing":
        return "分析中";
      case "confirm":
        return "銘柄を確認";
      case "candidates":
        return "銘柄を選択";
      case "review":
        return "情報を確認";
      default:
        return "お酒を追加";
    }
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="header-japanese sticky top-0 z-40 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {step !== "select" && step !== "analyzing" && (
              <button
                onClick={handleBack}
                className="mr-3 p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-sm">
                  {step === "analyzing" ? "⏳" : "＋"}
                </span>
              </div>
              <h1 className="text-xl font-bold text-primary">{getHeaderTitle()}</h1>
            </div>
          </div>
          <HeaderActions />
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 pt-6 pb-24">
        {/* エラー表示 */}
        {analyzeError && (
          <div className="mb-6 p-4 bg-vermilion/10 border border-vermilion/20 rounded-lg animate-in scale-in">
            <div className="flex items-start gap-3">
              <span className="text-vermilion text-lg">⚠</span>
              <div>
                <p className="text-vermilion font-medium text-sm">エラーが発生しました</p>
                <p className="text-vermilion/80 text-sm mt-1">{analyzeError}</p>
              </div>
            </div>
          </div>
        )}

        {/* 既存のお酒読み込み中 */}
        {isLoadingAlcohol && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
              <div className="absolute inset-0 border-2 border-transparent border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl animate-float">🍶</span>
              </div>
            </div>
            <p className="text-foreground font-medium mb-2">お酒情報を読み込み中...</p>
          </div>
        )}

        {/* 選択画面 */}
        {step === "select" && !isLoadingAlcohol && (
          <div className="space-y-6 animate-in fade-in">
            {/* イントロテキスト */}
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/5 mb-4">
                <span className="text-3xl">🍶</span>
              </div>
              <p className="text-muted-foreground">
                お酒のラベルを撮影するか、
                <br />
                銘柄名を入力してください
              </p>
            </div>

            {/* オプションカード */}
            <div className="space-y-4">
              {/* 写真を撮る - プライマリオプション */}
              <button
                onClick={() => setStep("photo")}
                className="w-full card-tatami p-5 text-left group transition-all hover:shadow-lg active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/10 transition-all">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-7 h-7 text-primary"
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
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">
                      写真を撮る
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      ラベルからAIが情報を読み取ります
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                {/* おすすめバッジ */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-gold/10 text-gold text-xs font-medium rounded">
                    おすすめ
                  </span>
                  <span className="text-xs text-muted-foreground">
                    最も簡単な方法です
                  </span>
                </div>
              </button>

              {/* 手動入力 - セカンダリオプション */}
              <button
                onClick={() => setStep("manual")}
                className="w-full p-5 bg-muted rounded-lg border border-border text-left group transition-all hover:border-primary/30 hover:bg-muted/80 active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-border/50 flex items-center justify-center group-hover:bg-border transition-all">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-7 h-7 text-muted-foreground group-hover:text-foreground transition-colors"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">
                      銘柄を入力
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      種類と名前を直接入力します
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            </div>

            {/* ヒントセクション */}
            <div className="mt-8 p-4 bg-background rounded-lg border border-border-light">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                <span className="text-gold">💡</span>
                撮影のコツ
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  ラベル全体が映るように撮影してください
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  明るい場所で撮影すると認識精度が上がります
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  ぼやけないようにピントを合わせてください
                </li>
              </ul>
            </div>
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
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
            {/* 和風ローディング */}
            <div className="relative w-24 h-24 mb-6">
              {/* 外側の円 */}
              <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
              {/* 回転する円弧 */}
              <div className="absolute inset-0 border-2 border-transparent border-t-primary rounded-full animate-spin" />
              {/* 中央のアイコン */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl animate-float">🍶</span>
              </div>
            </div>
            <p className="text-foreground font-medium mb-2">AIが分析中...</p>
            <p className="text-sm text-muted-foreground">
              お酒の情報を読み取っています
            </p>
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
              submitLabel={existingAlcoholId ? "自分の記録を追加" : "棚に追加する"}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}
