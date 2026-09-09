"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AgentForm } from "@/components/agents/agent-form";
import { useToast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/utils/api-client";
import type { AgentDTO } from "@/lib/services/types";

/**
 * Row-level actions for an agent. Deactivation is confirmed explicitly and is
 * refused server-side while the agent still owes money.
 */
export function AgentActions({
  agent,
  canEdit,
  canToggleActive,
}: {
  agent: AgentDTO;
  canEdit: boolean;
  canToggleActive: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [working, setWorking] = React.useState(false);

  const toggleActive = async () => {
    setWorking(true);
    const result = await apiRequest<{ agent: AgentDTO }>(`/api/agents/${agent.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !agent.isActive }),
    });
    setWorking(false);

    if (!result.ok) {
      toast.error(
        agent.isActive ? "Could not deactivate agent" : "Could not activate agent",
        result.message,
      );
      return;
    }

    setConfirmOpen(false);
    toast.success(
      agent.isActive ? "Agent deactivated" : "Agent activated",
      `${agent.name} is now ${agent.isActive ? "inactive" : "active"}.`,
    );
    router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="iconSm" aria-label={`Actions for ${agent.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link href={`/agents/${agent.id}`}>
              <Eye /> View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/agents/${agent.id}/statement`}>
              <FileText /> View statement
            </Link>
          </DropdownMenuItem>
          {canEdit && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setEditOpen(true);
                }}
              >
                <Pencil /> Edit agent
              </DropdownMenuItem>
            </>
          )}
          {canToggleActive && (
            <DropdownMenuItem
              destructive={agent.isActive}
              onSelect={(event) => {
                event.preventDefault();
                setConfirmOpen(true);
              }}
            >
              {agent.isActive ? <PowerOff /> : <Power />}
              {agent.isActive ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Edit agent</DialogTitle>
            <DialogDescription>
              Changes apply to the agent record only; existing tickets keep their
              own history.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <AgentForm
              agent={agent}
              canToggleActive={canToggleActive}
              onSaved={() => setEditOpen(false)}
              onCancel={() => setEditOpen(false)}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={agent.isActive ? `Deactivate ${agent.name}?` : `Activate ${agent.name}?`}
        description={
          agent.isActive
            ? "No new tickets can be added for a deactivated agent. Existing tickets, payments and statements are unaffected."
            : "This agent will appear again when adding tickets."
        }
        confirmLabel={agent.isActive ? "Deactivate agent" : "Activate agent"}
        variant={agent.isActive ? "danger" : "success"}
        loading={working}
        onConfirm={toggleActive}
      />
    </>
  );
}
