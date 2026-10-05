import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useNavigate,
  useRouterState,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { RecoilRoot } from "recoil";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppLayout } from "../components/AppLayout";
import { AuthProvider } from "../lib/auth-context";
import { useAuth } from "../lib/auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const exactError = error instanceof Response
    ? `HTTP ${error.status}${error.statusText ? ` ${error.statusText}` : ""}${error.url ? ` at ${error.url}` : ""}`
    : error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
  const technicalDetails = error instanceof Error ? error.stack : undefined;
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-5 bg-background px-5 py-10">
      <div>
        <p className="font-mono text-xs uppercase text-destructive">Application error</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">This page could not load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The exact error is shown below. Share it with support if you need help.
        </p>
      </div>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-destructive/30 bg-destructive/5 p-4 font-mono text-sm text-foreground" role="alert">
        {exactError || "No error message was provided."}
      </pre>
      {technicalDetails && (
        <details className="rounded-md border border-border p-4">
          <summary className="cursor-pointer text-sm font-medium">Technical details</summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
            {technicalDetails}
          </pre>
        </details>
      )}
      <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Vantage —  CRM" },
      { name: "description", content: "Manage leads, email templates, sequences, and campaigns in one clean CRM." },
      { property: "og:title", content: "Vantage — Email Campaign CRM" },
      { property: "og:description", content: "Manage leads, email templates, sequences, and campaigns in one clean CRM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <AuthProvider>
          <RootContent />
        </AuthProvider>
      </RecoilRoot>
    </QueryClientProvider>
  );
}

function RootContent() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { status } = useAuth();
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    if (status === "anonymous" && !isAuthRoute) {
      void navigate({ to: "/login", replace: true });
    } else if (status === "authenticated" && isAuthRoute) {
      void navigate({ to: "/", replace: true });
    }
  }, [isAuthRoute, navigate, status]);

  if (isAuthRoute) return <Outlet />;
  if (status !== "authenticated") {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground" role="status">
        Checking your session…
      </div>
    );
  }

  return <AppLayout />;
}
