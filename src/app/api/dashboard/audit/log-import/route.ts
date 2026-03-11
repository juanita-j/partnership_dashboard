import { NextRequest, NextResponse } from "next/server";
import { getDashboardUserId, logAudit } from "@/lib/audit";

/**
 * 엑셀 적용 완료 후 클라이언트가 호출. 업데이트 이력에 "신규 추가 xx건" 한 줄만 기록.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const created = typeof body.created === "number" ? body.created : 0;
    const updated = typeof body.updated === "number" ? body.updated : 0;
    const filename = typeof body.filename === "string" ? body.filename.trim() || undefined : undefined;
    await logAudit(userId, "import_apply", null, JSON.stringify({ created, updated, filename }));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[log-import]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
