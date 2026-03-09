import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const USER_ID_COOKIE = "dashboard_user_id";

export function getDashboardUserId(req: NextRequest): string | null {
  const id = req.cookies.get(USER_ID_COOKIE)?.value;
  return id && id.trim() ? id.trim() : null;
}

export type AuditAction =
  | "partner_create"
  | "partner_update"
  | "partner_delete"
  | "import_apply";

export async function logAudit(
  userId: string,
  action: AuditAction,
  entityId?: string | null,
  details?: string | null
): Promise<void> {
  try {
    await prisma.dashboardAuditLog.create({
      data: {
        userId,
        action,
        entityId: entityId ?? null,
        details: details ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] logAudit failed:", e);
  }
}
