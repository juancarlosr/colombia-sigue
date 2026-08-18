"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  approveCompanyAction,
  rejectCompanyAction,
  type CompanyRequestState,
} from "./actions";

const initialState: CompanyRequestState = {};

export function CompanyRequestActions({ companyId }: { companyId: string }) {
  const [approveState, approveAction, approving] = useActionState(
    approveCompanyAction,
    initialState,
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    rejectCompanyAction,
    initialState,
  );
  const error = approveState.error ?? rejectState.error;

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <form action={approveAction}>
          <input type="hidden" name="companyId" value={companyId} />
          <Button type="submit" size="sm" disabled={approving || rejecting}>
            {approving ? "Aprobando…" : "Aprobar"}
          </Button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="companyId" value={companyId} />
          <Button type="submit" size="sm" variant="destructive" disabled={approving || rejecting}>
            {rejecting ? "Rechazando…" : "Rechazar"}
          </Button>
        </form>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
