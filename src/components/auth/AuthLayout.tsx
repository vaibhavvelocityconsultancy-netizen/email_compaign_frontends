import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(340px,0.9fr)_1.1fr]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-ink px-10 py-9 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div
          className="absolute -right-24 top-24 size-80 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute -right-8 top-40 size-48 rounded-full border border-brand/50"
          aria-hidden="true"
        />
        <Link
          to="/login"
          className="relative z-10 inline-flex w-fit items-center gap-3"
          aria-label="Vantage home"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-brand font-display text-xl font-bold">
            V
          </span>
          <span>
            <span className="block font-display text-lg font-bold leading-none">Vantage</span>
            <span className="mt-1 block font-mono text-[10px] tracking-[0.18em] text-white/45">
              CRM · OPS
            </span>
          </span>
        </Link>

        <div className="relative z-10 max-w-lg py-16">
          <div className="mb-5 flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-brand">
            <ShieldCheck className="size-4" /> PRIVATE WORKSPACE
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.08] xl:text-6xl">
            A clearer view of every relationship.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-6 text-white/60">
            Keep customer conversations, campaign activity, and follow-ups moving in one place.
          </p>
          <div className="mt-12 grid max-w-md grid-cols-3 border-y border-white/10 py-5">
            <div>
              <p className="font-display text-2xl font-semibold">01</p>
              <p className="mt-1 text-xs text-white/45">Know the context</p>
            </div>
            <div className="border-x border-white/10 px-5">
              <p className="font-display text-2xl font-semibold">02</p>
              <p className="mt-1 text-xs text-white/45">Plan the next step</p>
            </div>
            <div className="pl-5">
              <p className="font-display text-2xl font-semibold">03</p>
              <p className="mt-1 text-xs text-white/45">Keep momentum</p>
            </div>
          </div>
        </div>
        <p className="relative z-10 font-mono text-[10px] tracking-[0.14em] text-white/35">
          VANTAGE CUSTOMER OPERATIONS
        </p>
      </aside>

      <section className="flex min-h-screen flex-col px-5 py-8 sm:px-10 lg:px-14">
        <div className="mb-10 flex items-center gap-2 lg:hidden">
          <span className="grid size-9 place-items-center rounded-lg bg-brand font-display text-lg font-bold text-white">
            V
          </span>
          <span className="font-display font-bold">Vantage</span>
        </div>
        <div className="my-auto w-full max-w-[440px] self-center py-10">
          <div className="mb-8">
            <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-brand">
              CUSTOMER OPERATIONS
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
          <p className="mt-8 border-t border-line pt-5 text-center text-sm text-muted-foreground">
            {footer}
          </p>
        </div>
        <p className="text-center font-mono text-[10px] tracking-wide text-muted-foreground/70">
          SECURE ACCESS · VANTAGE CRM
        </p>
      </section>
    </main>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
  hint?: ReactNode;
};

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  error,
}: FieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`h-11 w-full rounded-md border bg-white px-3.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand/30 ${error ? "border-destructive" : "border-line focus:border-brand"}`}
      />
      {error && (
        <p id={`${name}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordField({ label, name, autoComplete, placeholder, error, hint }: FieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={name} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {hint}
      </div>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`h-11 w-full rounded-md border bg-white px-3.5 pr-11 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand/30 ${error ? "border-destructive" : "border-line focus:border-brand"}`}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && (
        <p id={`${name}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

export const buttonClass =
  "inline-flex h-11 w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-60";
