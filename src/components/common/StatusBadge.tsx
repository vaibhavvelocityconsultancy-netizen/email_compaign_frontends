const STYLES: Record<string, { bg: string; dot: string; text: string }> = {
  active: { bg: "bg-brand-soft", dot: "bg-brand", text: "text-brand" },
  accepted: { bg: "bg-brand-soft", dot: "bg-brand", text: "text-brand" },
  delivered: { bg: "bg-good/10", dot: "bg-good", text: "text-good" },
  opened: { bg: "bg-good/10", dot: "bg-good", text: "text-good" },
  clicked: { bg: "bg-good/10", dot: "bg-good", text: "text-good" },
  completed: { bg: "bg-good/10", dot: "bg-good", text: "text-good" },
  replied: { bg: "bg-good/10", dot: "bg-good", text: "text-good" },
  complained: { bg: "bg-bad/10", dot: "bg-bad", text: "text-bad" },
  unsubscribed: { bg: "bg-ink/5", dot: "bg-ink/40", text: "text-ink/70" },
  paused: { bg: "bg-warn/10", dot: "bg-warn", text: "text-warn" },
  pending: { bg: "bg-warn/10", dot: "bg-warn", text: "text-warn" },
  failed: { bg: "bg-bad/10", dot: "bg-bad", text: "text-bad" },
  new: { bg: "bg-brand-soft", dot: "bg-brand", text: "text-brand" },
  contacted: { bg: "bg-warn/10", dot: "bg-warn", text: "text-warn" },
  draft: { bg: "bg-ink/5", dot: "bg-ink/40", text: "text-ink/70" },
  prospecting: { bg: "bg-brand-soft", dot: "bg-brand", text: "text-brand" },
  qualification: { bg: "bg-warn/10", dot: "bg-warn", text: "text-warn" },
  "needs analysis": { bg: "bg-good/10", dot: "bg-good", text: "text-good" },
  "value proposition": { bg: "bg-brand-soft", dot: "bg-brand", text: "text-brand" },
  "identify decision makers": { bg: "bg-ink/5", dot: "bg-ink/70", text: "text-ink/70" },
  "perception analysis": { bg: "bg-warn/10", dot: "bg-warn", text: "text-warn" },
  "proposal / price quote": { bg: "bg-brand-soft", dot: "bg-brand", text: "text-brand" },
  "negotiation / review": { bg: "bg-warn/10", dot: "bg-warn", text: "text-warn" },
  "closed won": { bg: "bg-good/10", dot: "bg-good", text: "text-good" },
  "closed lost": { bg: "bg-bad/10", dot: "bg-bad", text: "text-bad" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status.toLowerCase()] ?? STYLES["draft"]!;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.text}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
