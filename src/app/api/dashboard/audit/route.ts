import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ACTION_LABELS: Record<string, string> = {
  partner_create: "파트너 추가",
  partner_update: "파트너 수정",
  partner_delete: "파트너 삭제",
  import_apply: "엑셀 일괄 적용",
};

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

    const data = items.map((row) => ({
      id: row.id,
      userId: row.userId,
      action: row.action,
      actionLabel: ACTION_LABELS[row.action] ?? row.action,
      entityId: row.entityId,
      details: row.details,
      createdAt: row.createdAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
