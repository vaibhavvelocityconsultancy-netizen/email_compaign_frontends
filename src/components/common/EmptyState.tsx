import { Inbox } from "lucide-react";

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
        <Inbox className="size-5" />
      </div>
      <p className="mt-3 font-display text-sm font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, r) => (
        <tr key={r} className="border-b border-line last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${55 + ((r * 13 + c * 17) % 40)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
