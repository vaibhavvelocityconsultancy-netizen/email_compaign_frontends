export function ComingSoon({ eyebrow, title, hint }: { eyebrow: string; title: string; hint: string }) {
  return (
    <div className="space-y-6">
      <div className="rise">
        <div className="font-mono text-[11px] tracking-wide text-muted-foreground">{eyebrow}</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      <div className="rise grid place-items-center rounded-xl border border-dashed border-line bg-surface px-6 py-20 text-center">
        <div className="font-display text-lg font-semibold">Coming soon</div>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
