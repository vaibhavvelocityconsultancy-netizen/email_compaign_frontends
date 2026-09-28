const STYLES: Record<string, { bg: string; dot: string; text: string }> = {
  active: { bg: "bg-brand-soft", dot: "bg-brand", text: "text-brand" },
  sent: { bg: "bg-good/10", dot: "bg-good", text: "text-good" },
  completed: { bg: "bg-good/10", dot: "bg-good", text: "text-good" },
  replied: { bg: "bg-good/10", dot: "bg-good", text: "text-good" },
  paused: { bg: "bg-warn/10", dot: "bg-warn", text: "text-warn" },
  pending: { bg: "bg-warn/10", dot: "bg-warn", text: "text-warn" },
  failed: { bg: "bg-bad/10", dot: "bg-bad", text: "text-bad" },
  new: { bg: "bg-brand-soft", dot: "bg-brand", text: "text-brand" },
  contacted: { bg: "bg-warn/10", dot: "bg-warn", text: "text-warn" },
  unsubscribed: { bg: "bg-ink/5", dot: "bg-ink/40", text: "text-ink/70" },
  draft: { bg: "bg-ink/5", dot: "bg-ink/40", text: "text-ink/70" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? STYLES["draft"]!;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.text}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
