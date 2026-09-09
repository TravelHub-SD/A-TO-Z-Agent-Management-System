"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { settingsUpdateSchema } from "@/lib/validation/schemas";
import { apiRequest } from "@/lib/utils/api-client";
import { zodFieldErrors } from "@/lib/utils/errors";
import { SUPPORTED_CURRENCIES, SUPPORTED_TIMEZONES } from "@/lib/constants";
import type { SettingsDTO } from "@/lib/services/types";

export function SettingsForm({
  settings,
  readOnly,
}: {
  settings: SettingsDTO;
  readOnly: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [agencyName, setAgencyName] = React.useState(settings.agencyName);
  const [defaultCurrency, setDefaultCurrency] = React.useState(settings.defaultCurrency);
  const [timezone, setTimezone] = React.useState(settings.timezone);
  const [warnDays, setWarnDays] = React.useState(String(settings.outstandingWarnDays));
  const [criticalDays, setCriticalDays] = React.useState(
    String(settings.outstandingCriticalDays),
  );

  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || readOnly) return;

    setFormError(null);
    setErrors({});

    const parsed = settingsUpdateSchema.safeParse({
      agencyName,
      defaultCurrency,
      timezone,
      outstandingWarnDays: warnDays,
      outstandingCriticalDays: criticalDays,
    });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await apiRequest<{ settings: SettingsDTO }>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      setErrors(result.fieldErrors ?? {});
      return;
    }

    toast.success("Settings saved", "The new configuration applies immediately.");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
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
        label="Agency name"
        htmlFor="agency-name"
        required
        error={errors.agencyName}
        hint="Shown in the sidebar, on statements and on exported reports."
      >
        <Input
          id="agency-name"
          value={agencyName}
          onChange={(event) => setAgencyName(event.target.value)}
          disabled={readOnly}
          invalid={Boolean(errors.agencyName)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Default currency"
          htmlFor="default-currency"
          error={errors.defaultCurrency}
          hint="Pre-selected when creating a ticket. Each ticket stores its own currency."
        >
          <Select
            value={defaultCurrency}
            onValueChange={setDefaultCurrency}
            disabled={readOnly}
          >
            <SelectTrigger id="default-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} — {currency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Timezone"
          htmlFor="timezone"
          error={errors.timezone}
          hint="All dates and times are displayed in this timezone."
        >
          <Select value={timezone} onValueChange={setTimezone} disabled={readOnly}>
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_TIMEZONES.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Ageing warning (days)"
          htmlFor="warn-days"
          error={errors.outstandingWarnDays}
          hint="Unpaid tickets older than this are highlighted amber."
        >
          <Input
            id="warn-days"
            type="number"
            min={1}
            max={365}
            value={warnDays}
            onChange={(event) => setWarnDays(event.target.value)}
            disabled={readOnly}
            invalid={Boolean(errors.outstandingWarnDays)}
            className="tabular"
          />
        </Field>

        <Field
          label="Overdue threshold (days)"
          htmlFor="critical-days"
          error={errors.outstandingCriticalDays}
          hint="Unpaid tickets older than this are counted as overdue and shown red."
        >
          <Input
            id="critical-days"
            type="number"
            min={1}
            max={365}
            value={criticalDays}
            onChange={(event) => setCriticalDays(event.target.value)}
            disabled={readOnly}
            invalid={Boolean(errors.outstandingCriticalDays)}
            className="tabular"
          />
        </Field>
      </div>

      {!readOnly && (
        <div className="flex justify-end border-t border-hairline pt-4">
          <Button type="submit" variant="brand" loading={submitting}>
            {submitting ? "Saving…" : "Save settings"}
          </Button>
        </div>
      )}
    </form>
  );
}
