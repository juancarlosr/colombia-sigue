"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { sendInvitationsAction, type InviteState } from "./actions";

const initialState: InviteState = {};

export function InviteButton({ pendingCount }: { pendingCount: number }) {
  const [state, formAction, pending] = useActionState(
    async () => sendInvitationsAction(),
    initialState,
  );

  if (state.sent !== undefined) {
    return <p className="text-sm text-muted-foreground">Invitaciones enviadas: {state.sent}</p>;
  }

  return (
    <form action={formAction}>
      <Button type="submit" variant="outline" disabled={pending || pendingCount === 0}>
        {pending ? "Enviando…" : `Enviar invitaciones (${pendingCount})`}
      </Button>
    </form>
  );
}
