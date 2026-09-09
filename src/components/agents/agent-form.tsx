"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { agentCreateSchema } from "@/lib/validation/schemas";
import { apiRequest } from "@/lib/utils/api-client";
import { zodFieldErrors } from "@/lib/utils/errors";
import type { AgentDTO } from "@/lib/services/types";

/**
 * Create/edit form for an agent record. Agents are records only — this form
 * deliberately has no password, username or portal-access field.
 */
export function AgentForm({
  agent,
  canToggleActive,
  onSaved,
  onCancel,
}: {
  agent?: AgentDTO;
  canToggleActive: boolean;
  onSaved?: (agent: AgentDTO) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const editing = Boolean(agent);

  const [name, setName] = React.useState(agent?.name ?? "");
  const [code, setCode] = React.useState(agent?.code ?? "");
  const [phone, setPhone] = React.useState(agent?.phone ?? "");
  const [email, setEmail] = React.useState(agent?.email ?? "");
  const [notes, setNotes] = React.useState(agent?.notes ?? "");
  const [isActive, setIsActive] = React.useState(agent?.isActive ?? true);

  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setErrors({});

    const parsed = agentCreateSchema.safeParse({ name, code, phone, email, notes, isActive });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    const payload = canToggleActive
      ? parsed.data
      : { ...parsed.data, isActive: undefined };

    setSubmitting(true);
    const result = await apiRequest<{ agent: AgentDTO }>(
      editing ? `/api/agents/${agent!.id}` : "/api/agents",
      {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      setErrors(result.fieldErrors ?? {});
      return;
    }

    toast.success(
      editing ? "Agent updated" : "Agent created",
      `${result.data.agent.name} (${result.data.agent.code}) saved.`,
    );

    if (onSaved) onSaved(result.data.agent);
    else router.push(`/agents/${result.data.agent.id}`);
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Agent name" htmlFor="agent-name" required error={errors.name}>
          <Input
            id="agent-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Travel Hub"
            autoComplete="organization"
            invalid={Boolean(errors.name)}
            autoFocus
          />
        </Field>

        <Field
          label="Agent code"
          htmlFor="agent-code"
          required
          error={errors.code}
          hint="Unique short reference, e.g. TH001."
        >
          <Input
            id="agent-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="TH001"
            autoComplete="off"
            spellCheck={false}
            maxLength={40}
            invalid={Boolean(errors.code)}
            className="font-mono tracking-wide"
          />
        </Field>

        <Field label="Phone" htmlFor="agent-phone" error={errors.phone}>
          <Input
            id="agent-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+249 91 234 5678"
            autoComplete="tel"
            invalid={Boolean(errors.phone)}
          />
        </Field>

        <Field label="Email" htmlFor="agent-email" error={errors.email}>
          <Input
            id="agent-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="accounts@agent.example"
            autoComplete="email"
            invalid={Boolean(errors.email)}
          />
        </Field>
      </div>

      <Field label="Notes" htmlFor="agent-notes" error={errors.notes}>
        <Textarea
          id="agent-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Payment terms, contacts, anything staff should know."
        />
      </Field>

      {canToggleActive && (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-hairline bg-navy-50/50 p-3.5">
          <div>
            <Label htmlFor="agent-active">Active</Label>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-navy-500">
              Inactive agents stay in reports and statements but cannot have new
              tickets added.
            </p>
          </div>
          <Switch
            id="agent-active"
            checked={isActive}
            onCheckedChange={setIsActive}
            aria-label="Agent active"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => (onCancel ? onCancel() : router.back())}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" variant="brand" loading={submitting}>
          {submitting ? "Saving…" : editing ? "Save changes" : "Create agent"}
        </Button>
      </div>

      <p className="text-[12px] leading-relaxed text-navy-400">
        Agents do not receive login credentials. This record exists so A TO Z
        staff can track tickets and balances on their behalf.
      </p>
    </form>
  );
}
