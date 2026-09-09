"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { changePasswordSchema } from "@/lib/validation/schemas";
import { apiRequest } from "@/lib/utils/api-client";
import { zodFieldErrors } from "@/lib/utils/errors";

export function ChangePasswordForm() {
  const router = useRouter();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setErrors({});

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await apiRequest("/api/auth/password", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      setErrors(result.fieldErrors ?? {});
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated", "Use your new password next time you sign in.");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4" noValidate>
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-unpaid-200 bg-unpaid-50 p-3 text-[13px] text-unpaid-800"
        >
          <AlertCircle className="mt-px size-4 shrink-0 text-unpaid-600" />
          <span>{formError}</span>
        </div>
      )}

      <Field
        label="Current password"
        htmlFor="current-password"
        required
        error={errors.currentPassword}
      >
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          invalid={Boolean(errors.currentPassword)}
        />
      </Field>

      <Field
        label="New password"
        htmlFor="new-password"
        required
        error={errors.newPassword}
        hint="At least 10 characters, with an uppercase letter, a lowercase letter and a digit."
      >
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          invalid={Boolean(errors.newPassword)}
        />
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirm-password"
        required
        error={errors.confirmPassword}
      >
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          invalid={Boolean(errors.confirmPassword)}
        />
      </Field>

      <div className="flex justify-end border-t border-hairline pt-4">
        <Button type="submit" variant="brand" loading={submitting}>
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
