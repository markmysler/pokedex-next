import type { RenderedLogLine } from "@/lib/i18n/renderBattleLogEvent";

// The battle feed (redesign wave v9): log lines grouped by round, shown
// newest round first so the latest action is always at the top without
// scrolling.
export interface FeedRound {
  key: string;
  title: string;
  lines: RenderedLogLine[];
}

// Adds lines to the round with this key, or starts that round if it's new.
// The bot's forced switch arrives as a second turn with the same round
// number, so it joins the round it belongs to.
export function addToFeed(feed: FeedRound[], key: string, title: string, lines: RenderedLogLine[]): FeedRound[] {
  const existing = feed.find((r) => r.key === key);
  if (existing) return feed.map((r) => (r.key === key ? { ...r, lines: [...r.lines, ...lines] } : r));
  return [...feed, { key, title, lines }];
}

// Appends to whichever round is current (the last one).
export function addToLastRound(feed: FeedRound[], lines: RenderedLogLine[]): FeedRound[] {
  if (feed.length === 0) return feed;
  const last = feed[feed.length - 1];
  return [...feed.slice(0, -1), { ...last, lines: [...last.lines, ...lines] }];
}

// renderBattleLogEvent marks a move line with "• " and its effects with
// "  -> "; the feed shows that structure with layout instead.
export function feedLineParts(text: string): { main: boolean; text: string } {
  const trimmed = text.replace(/^\s+/, "");
  if (trimmed.startsWith("•")) return { main: true, text: trimmed.replace(/^•\s*/, "") };
  if (trimmed.startsWith("->")) return { main: false, text: trimmed.replace(/^->\s*/, "") };
  return { main: true, text: trimmed };
}
