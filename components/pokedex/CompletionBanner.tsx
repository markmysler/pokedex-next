import ColorProgress from "@/components/ColorProgress";

interface CompletionBannerProps {
  acquiredCount: number;
  total: number;
}

export default function CompletionBanner({ acquiredCount, total }: CompletionBannerProps) {
  const pct = total > 0 ? (acquiredCount / total) * 100 : 0;

  return (
    <div className="flex items-center gap-4 rounded-xl bg-secondary p-3 px-4">
      <span className="text-sm font-bold whitespace-nowrap">
        Pokédex Completion: {acquiredCount} / {total} ({pct.toFixed(1)}%)
      </span>
      <ColorProgress value={pct} className="flex-1" />
    </div>
  );
}
