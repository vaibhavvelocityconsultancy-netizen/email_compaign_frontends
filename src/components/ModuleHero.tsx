import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface ModuleHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  status?: string;
}

export function ModuleHero({ eyebrow, title, description, icon, status = "Workspace active" }: ModuleHeroProps) {
  return (
    <section className="relative isolate mb-6 overflow-hidden rounded-[22px] border border-border/70 bg-gradient-to-br from-card via-card to-brand/10 px-6 py-6 shadow-sm sm:px-8 sm:py-7">
      <div className="pointer-events-none absolute -right-12 -top-20 size-56 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            <span className="grid size-7 place-items-center rounded-lg bg-brand/10">{icon}</span>
            {eyebrow}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="w-fit shrink-0 gap-1.5 rounded-full bg-background/60 px-3 py-1.5 text-xs font-medium">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          {status}
          <ArrowUpRight data-icon="inline-end" />
        </Badge>
      </div>
    </section>
  );
}
