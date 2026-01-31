"use client";

import type { AlcoholInfo } from "@/lib/gemini/analyze";

type Props = {
  candidates: AlcoholInfo[];
  onSelect: (selected: AlcoholInfo) => void;
};

export function CandidateSelector({ candidates, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        複数の候補が見つかりました。該当するものを選択してください。
      </p>

      <div className="space-y-3">
        {candidates.map((candidate, index) => (
          <button
            key={index}
            onClick={() => onSelect(candidate)}
            className="w-full text-left p-4 bg-muted rounded-lg border-l-4 border-transparent hover:border-primary transition-colors shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🍶</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{candidate.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {candidate.type}
                  {candidate.subtype && ` / ${candidate.subtype}`}
                </p>
                {candidate.origin_country && (
                  <p className="text-sm text-muted-foreground">
                    {candidate.origin_country}
                    {candidate.origin_region && ` ${candidate.origin_region}`}
                  </p>
                )}
                {candidate.characteristics &&
                  candidate.characteristics.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {candidate.characteristics.slice(0, 3).map((char, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full"
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
              <div className="flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 text-muted-foreground"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        見つからない場合は、戻って別の銘柄名で検索してください
      </p>
    </div>
  );
}
