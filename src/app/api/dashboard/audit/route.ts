import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 작업유형: 대략적인 구분만 */
const WORK_TYPE: Record<string, string> = {
  partner_create: "직접 수정",
  partner_update: "직접 수정",
  partner_delete: "직접 수정",
  import_apply: "엑셀파일 업로드",
};

function formatDetail(row: { action: string; entityId: string | null; details: string | null }): string {
  const { action, entityId, details } = row;
  switch (action) {
    case "import_apply": {
      try {
        const o = details ? JSON.parse(details) as { created?: number; updated?: number } : {};
        const created = o.created ?? 0;
        const updated = o.updated ?? 0;
        const parts: string[] = [];
        if (created > 0) parts.push(`신규 ${created}건 추가`);
        if (updated > 0) parts.push(`${updated}건 수정`);
        return parts.length ? parts.join(", ") : "엑셀 적용";
      } catch {
        return details ?? "엑셀 일괄 적용";
      }
    }
    case "partner_create":
      return details ? `파트너 추가: ${details}` : "파트너 추가";
    case "partner_update":
      return details ?? (entityId ? `파트너 수정 (대상 ID: ${entityId})` : "파트너 수정");
    case "partner_delete":
      return entityId ? `파트너 삭제 (대상 ID: ${entityId})` : "파트너 삭제";
    default:
      return details ?? "-";
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId")?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const where = userId ? { userId } : {};
    const [items, total] = await Promise.all([
      prisma.dashboardAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.dashboardAuditLog.count({ where }),
    ]);

    const data = items.map((row, index) => {
      const versionNum = total - skip - index;
      return {
        id: row.id,
        versionName: `v${versionNum}`,
        userId: row.userId,
        workType: WORK_TYPE[row.action] ?? "직접 수정",
        detail: formatDetail({ action: row.action, entityId: row.entityId, details: row.details }),
        createdAt: row.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
