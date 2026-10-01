import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout, Field, FormError, PasswordField, buttonClass } from "./AuthLayout";
import { useAuth } from "@/lib/auth";

type RegisterValues = { name: string; email: string; password: string };
type Errors = Partial<Record<"name" | "email" | "password" | "confirm" | "terms", string>>;

export default function RegisterPage({
  onSubmit,
}: {
  onSubmit?: (values: RegisterValues) => Promise<void>;
}) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    const terms = formData.get("terms") === "on";
    const next: Errors = {};
    const nameParts = name.split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) next.name = "Enter your first and last name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (confirm !== password) next.confirm = "Passwords don't match.";
    if (!terms) next.terms = "Accept the terms to continue.";
    setErrors(next);
    setFormError(undefined);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({ name, email, password });
      } else {
        await auth.register({
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(" "),
          email,
          password,
        });
      }
      await navigate({ to: "/", replace: true });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Couldn't create your account. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up your workspace in a minute."
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          error={errors.name}
        />
        <Field
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password}
        />
        <PasswordField
          label="Confirm password"
          name="confirm"
          autoComplete="new-password"
          placeholder="Repeat your password"
          error={errors.confirm}
        />
        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              name="terms"
              aria-invalid={Boolean(errors.terms)}
              className="mt-0.5 size-4 rounded border-input accent-[var(--brand)]"
            />
            <span>I agree to the workspace terms and privacy policy.</span>
          </label>
          {errors.terms && <p className="mt-1.5 text-xs text-destructive">{errors.terms}</p>}
        </div>
        <FormError message={formError} />
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
