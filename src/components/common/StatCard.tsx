interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "good" | "bad" | "muted";
  delay?: number;
}

export function StatCard({ label, value, sub, tone = "muted", delay = 0 }: StatCardProps) {
  const toneClass = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-muted-foreground";
  return (
    <div className="rise rounded-xl border border-line bg-surface p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className={`mt-1 font-mono text-[11px] ${toneClass}`}>{sub}</div>}
    </div>
  );
}
