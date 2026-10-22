import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout, Field, FormError, PasswordField, buttonClass } from "./AuthLayout";
import { useAuth } from "@/lib/auth";

type LoginValues = { email: string; password: string };

export default function LoginPage({
  onSubmit,
}: {
  onSubmit?: (values: LoginValues) => Promise<void>;
}) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Partial<Record<"email" | "password", string>>>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values: LoginValues = {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = "Enter a valid email address.";
    if (!values.password) next.password = "Enter your password.";
    setErrors(next);
    setFormError(undefined);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      if (onSubmit) await onSubmit(values);
      else await auth.login(values.email, values.password);
      await navigate({ to: "/", replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Couldn't sign you in. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="s in"
      subtitle="Enter your details to open your workspace."
      footer={
        <span>
          New here?{" "}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          error={errors.password}
        />
        <FormError message={formError} />
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
