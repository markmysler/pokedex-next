interface CompletionBannerProps {
  acquiredCount: number;
  total: number;
}

export default function CompletionBanner({ acquiredCount, total }: CompletionBannerProps) {
  const pct = total > 0 ? (acquiredCount / total) * 100 : 0;

  return (
    <div className="header-banner">
      <span className="completion-label">
        Pokédex Completion: {acquiredCount} / {total} ({pct.toFixed(1)}%)
      </span>
      <div className="progress-bar completion">
        <div className="progress-fill completion" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
