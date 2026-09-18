import type { Dictionary } from "@/lib/i18n/getDictionary";

interface CompletionBannerProps {
  acquiredCount: number;
  total: number;
  dict: Dictionary;
}

export default function CompletionBanner({ acquiredCount, total, dict }: CompletionBannerProps) {
  const pct = total > 0 ? (acquiredCount / total) * 100 : 0;

  return (
    <div className="header-banner">
      <span className="completion-label">
        {dict.collection.pokedex.completion(acquiredCount, total, pct.toFixed(1))}
      </span>
      <div className="progress-bar completion">
        <div className="progress-fill completion" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
