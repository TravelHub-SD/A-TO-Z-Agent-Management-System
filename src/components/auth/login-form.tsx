"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { loginSchema } from "@/lib/validation/schemas";
import { apiRequest } from "@/lib/utils/api-client";
import { zodFieldErrors } from "@/lib/utils/errors";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setFieldErrors({});

    // Validate with the same schema the server uses before spending a request.
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    if (!result.ok) {
      setSubmitting(false);
      setFormError(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    // `refresh` re-runs the server components so the shell renders signed in.
    const destination =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : "/dashboard";
    router.replace(destination);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-unpaid-200 bg-unpaid-50 p-3 text-[13px] text-unpaid-800"
        >
          <AlertCircle className="mt-px size-4 shrink-0 text-unpaid-600" />
          <span>{formError}</span>
        </div>
      )}

      <Field label="Email" htmlFor="email" required error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          invalid={Boolean(fieldErrors.email)}
          placeholder="you@atoz.local"
        />
      </Field>

      <Field label="Password" htmlFor="password" required error={fieldErrors.password}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            invalid={Boolean(fieldErrors.password)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-700"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <Button type="submit" variant="brand" size="lg" className="w-full" loading={submitting}>
        {submitting ? "Signing in…" : "Login"}
      </Button>
    </form>
  );
}
