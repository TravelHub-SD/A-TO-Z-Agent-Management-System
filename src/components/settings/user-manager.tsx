"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, MoreHorizontal, Pencil, Plus, UserPlus } from "lucide-react";
import { Role } from "@prisma/client";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActiveBadge } from "@/components/shared/status-badge";
import { useToast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/utils/api-client";
import { zodFieldErrors } from "@/lib/utils/errors";
import { userCreateSchema, userUpdateSchema } from "@/lib/validation/schemas";
import { formatDateTime } from "@/lib/utils/dates";
import { formatNumber } from "@/lib/utils/currency";
import type { UserDTO } from "@/lib/services/types";

/**
 * Internal account management, administrators only. Accounts are created here
 * — the application has no public registration route.
 */
export function UserManager({
  users,
  currentUserId,
  timezone,
}: {
  users: UserDTO[];
  currentUserId: string;
  timezone: string;
}) {
  return (
    <>
      <div className="flex justify-end border-b border-hairline px-5 py-3">
        <CreateUserDialog />
      </div>

      <TableWrap>
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH align="right">Tickets</TH>
              <TH align="right">Payments</TH>
              <TH>Last sign-in</TH>
              <TH align="right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {users.map((user) => (
              <TR key={user.id}>
                <TD>
                  <span className="font-medium text-navy-900">{user.name}</span>
                  {user.id === currentUserId && (
                    <Badge variant="brand" size="sm" className="ml-2">
                      You
                    </Badge>
                  )}
                </TD>
                <TD className="text-navy-600">{user.email}</TD>
                <TD>
                  <Badge variant={user.role === Role.ADMIN ? "brand" : "neutral"} size="sm">
                    {user.role === Role.ADMIN ? "Administrator" : "Staff"}
                  </Badge>
                </TD>
                <TD>
                  <ActiveBadge isActive={user.isActive} />
                </TD>
                <TD align="right" className="tabular text-navy-700">
                  {formatNumber(user.ticketCount)}
                </TD>
                <TD align="right" className="tabular text-navy-700">
                  {formatNumber(user.paymentCount)}
                </TD>
                <TD className="whitespace-nowrap text-navy-600">
                  {user.lastLoginAt ? (
                    formatDateTime(user.lastLoginAt, timezone)
                  ) : (
                    <span className="text-navy-300">Never</span>
                  )}
                </TD>
                <TD align="right">
                  <UserActions user={user} isSelf={user.id === currentUserId} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>
    </>
  );
}

function CreateUserDialog() {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<Role>(Role.STAFF);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const onOpenChange = (next: boolean) => {
    if (submitting) return;
    setOpen(next);
    if (!next) {
      setName("");
      setEmail("");
      setPassword("");
      setRole(Role.STAFF);
      setErrors({});
      setFormError(null);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setErrors({});

    const parsed = userCreateSchema.safeParse({ name, email, password, role, isActive: true });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await apiRequest("/api/users", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      setErrors(result.fieldErrors ?? {});
      return;
    }

    toast.success("Account created", `${name} can now sign in with their email address.`);
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="brand" size="sm">
          <Plus /> Add user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add internal user</DialogTitle>
          <DialogDescription>
            Share the initial password securely; the user can change it from
            their profile page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-unpaid-200 bg-unpaid-50 p-3 text-[13px] text-unpaid-800"
              >
                <AlertCircle className="mt-px size-4 shrink-0 text-unpaid-600" />
                <span>{formError}</span>
              </div>
            )}

            <Field label="Full name" htmlFor="user-name" required error={errors.name}>
              <Input
                id="user-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                invalid={Boolean(errors.name)}
                autoFocus
              />
            </Field>

            <Field label="Email" htmlFor="user-email" required error={errors.email}>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                invalid={Boolean(errors.email)}
                autoComplete="off"
              />
            </Field>

            <Field
              label="Initial password"
              htmlFor="user-password"
              required
              error={errors.password}
              hint="At least 10 characters, with an uppercase letter, a lowercase letter and a digit."
            >
              <Input
                id="user-password"
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                invalid={Boolean(errors.password)}
                autoComplete="off"
                className="font-mono"
              />
            </Field>

            <Field label="Role" htmlFor="user-role" error={errors.role}>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.STAFF}>
                    Staff — agents, tickets and payments
                  </SelectItem>
                  <SelectItem value={Role.ADMIN}>
                    Administrator — full access
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="brand" loading={submitting}>
              <UserPlus /> {submitting ? "Creating…" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserActions({ user, isSelf }: { user: UserDTO; isSelf: boolean }) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="iconSm" aria-label={`Actions for ${user.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setEditOpen(true);
            }}
          >
            <Pencil /> Edit account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setResetOpen(true);
            }}
          >
            <KeyRound /> Reset password
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserDialog user={user} isSelf={isSelf} open={editOpen} onOpenChange={setEditOpen} />
      <ResetPasswordDialog user={user} open={resetOpen} onOpenChange={setResetOpen} />
    </>
  );
}

function EditUserDialog({
  user,
  isSelf,
  open,
  onOpenChange,
}: {
  user: UserDTO;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = React.useState(user.name);
  const [role, setRole] = React.useState<Role>(user.role);
  const [isActive, setIsActive] = React.useState(user.isActive);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    if (open) {
      setName(user.name);
      setRole(user.role);
      setIsActive(user.isActive);
      setFormError(null);
      setErrors({});
    }
  }, [open, user]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setErrors({});

    const parsed = userUpdateSchema.safeParse({ name, role, isActive });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await apiRequest(`/api/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      setErrors(result.fieldErrors ?? {});
      return;
    }

    toast.success("Account updated", `${name}'s account has been saved.`);
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Edit {user.name}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-unpaid-200 bg-unpaid-50 p-3 text-[13px] text-unpaid-800"
              >
                <AlertCircle className="mt-px size-4 shrink-0 text-unpaid-600" />
                <span>{formError}</span>
              </div>
            )}

            <Field label="Full name" htmlFor="edit-name" required error={errors.name}>
              <Input
                id="edit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                invalid={Boolean(errors.name)}
              />
            </Field>

            <Field
              label="Role"
              htmlFor="edit-role"
              error={errors.role}
              hint={isSelf ? "You cannot change your own role." : undefined}
            >
              <Select
                value={role}
                onValueChange={(value) => setRole(value as Role)}
                disabled={isSelf}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.STAFF}>Staff</SelectItem>
                  <SelectItem value={Role.ADMIN}>Administrator</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-hairline bg-navy-50/50 p-3.5">
              <div>
                <Label htmlFor="edit-active">Active</Label>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-navy-500">
                  {isSelf
                    ? "You cannot deactivate your own account."
                    : "A deactivated user is signed out on their next request."}
                </p>
              </div>
              <Switch
                id="edit-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isSelf}
                aria-label="Account active"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="brand" loading={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const toast = useToast();

  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    if (open) {
      setPassword("");
      setFormError(null);
      setErrors({});
    }
  }, [open]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setErrors({});

    const parsed = userUpdateSchema.safeParse({ password });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await apiRequest(`/api/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ password: parsed.data.password }),
    });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      setErrors(result.fieldErrors ?? {});
      return;
    }

    toast.success("Password reset", `Share the new password with ${user.name} securely.`);
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {user.name} ({user.email}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="space-y-4">
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
              label="New password"
              htmlFor="reset-password"
              required
              error={errors.password}
              hint="At least 10 characters, with an uppercase letter, a lowercase letter and a digit."
            >
              <Input
                id="reset-password"
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                invalid={Boolean(errors.password)}
                autoComplete="off"
                className="font-mono"
                autoFocus
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={submitting}>
              <KeyRound /> {submitting ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
