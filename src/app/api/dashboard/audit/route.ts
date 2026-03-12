import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 작업유형: 대략적인 구분만 */
const WORK_TYPE: Record<string, string> = {
  partner_create: "직접 수정",
  partner_update: "직접 수정",
  partner_delete: "직접 수정",
  import_apply: "엑셀파일 업로드",
};

function formatDetail(row: { action: string; details: string | null }): string {
  const { action, details } = row;
  switch (action) {
    case "import_apply": {
      try {
        const o = details ? JSON.parse(details) as { created?: number; updated?: number; filename?: string } : {};
        const created = o.created ?? 0;
        const filename = (o.filename ?? "").trim();
        const suffix = created > 0 ? `신규 추가 ${created}건` : "엑셀 적용";
        return filename ? `${filename} · ${suffix}` : suffix;
      } catch {
        return details ?? "엑셀 일괄 적용";
      }
    }
    case "partner_create":
      return details ? `파트너 추가: ${details}` : "파트너 추가";
    case "partner_update":
      return details ?? "파트너 수정";
    case "partner_delete":
      return details ? `파트너 삭제: ${details}` : "파트너 삭제";
    default:
      return details ?? "-";
  }
}

/** 항목 문자열에서 유형 추출 (요약·그룹용) */
function getDetailCategory(item: string): string {
  const t = item.trim();
  if (t.startsWith("파트너 삭제")) return "파트너 삭제";
  if (t.startsWith("파트너 추가")) return "파트너 추가";
  if (t.startsWith("신규") || t.includes("건 추가") || t.includes("건 수정")) return "신규 파일 추가";
  if (t.startsWith("회사:") || t.includes("회사:") || t === "파트너 수정") return "파트너 수정";
  return "기타";
}

/** 토글 열기 전 상세 칸: 유형별 건수로 요약, 콤마 구분, 중복 합침. 예: 파트너 삭제(4건), 신규 파일 추가(1건) */
function buildDetailSummary(detailItems: string[]): string {
  const countByCategory: Record<string, number> = {};
  for (const item of detailItems) {
    const cat = getDetailCategory(item);
    countByCategory[cat] = (countByCategory[cat] ?? 0) + 1;
  }
  const order = ["파트너 삭제", "파트너 추가", "파트너 수정", "신규 파일 추가", "기타"];
  return order
    .filter((cat) => (countByCategory[cat] ?? 0) > 0)
    .map((cat) => `${cat}(${countByCategory[cat]}건)`)
    .join(", ");
}

/** 같은 사용자·같은 3분 구간 내 액션을 하나의 버전으로 묶음 */
function groupByUserAndMinute(
  items: { id: string; userId: string; action: string; entityId: string | null; details: string | null; createdAt: Date }[]
): { id: string; userId: string; action: string; details: string | null; createdAt: Date; detailItems: string[] }[] {
  const groups: { userId: string; minuteKey: number; createdAt: Date; actions: string[]; detailItems: string[]; firstId: string }[] = [];
  for (const row of items) {
    const t = new Date(row.createdAt);
    const bucketMin = Math.floor(t.getMinutes() / 3) * 3;
    const minuteKey = new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), bucketMin).getTime();
    const detailStr = formatDetail({ action: row.action, details: row.details });
    const last = groups[groups.length - 1];
    if (last && last.userId === row.userId && last.minuteKey === minuteKey) {
      last.detailItems.push(detailStr);
      if (t > last.createdAt) last.createdAt = t;
    } else {
      groups.push({
        userId: row.userId,
        minuteKey,
        createdAt: t,
        actions: [row.action],
        detailItems: [detailStr],
        firstId: row.id,
      });
    }
  }
  return groups.map((g) => ({
    id: g.firstId,
    userId: g.userId,
    action: g.actions[0],
    details: g.detailItems.length === 1 ? g.detailItems[0] : g.detailItems.join("\n"),
    createdAt: g.createdAt,
    detailItems: g.detailItems,
  }));
}

const FETCH_LIMIT = 2000;
const GROUPS_PER_PAGE = 50;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId")?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

    const where = userId ? { userId } : {};
    const items = await prisma.dashboardAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: FETCH_LIMIT,
    });

    const grouped = groupByUserAndMinute(items);
    const totalGroups = grouped.length;
    const skip = (page - 1) * GROUPS_PER_PAGE;
    const pageGroups = grouped.slice(skip, skip + GROUPS_PER_PAGE);

    const data = pageGroups.map((g, index) => {
      const versionNum = totalGroups - skip - index;
      const detailSummary = buildDetailSummary(g.detailItems);
      return {
        id: g.id,
        versionName: `v${versionNum}`,
        userId: g.userId,
        workType: WORK_TYPE[g.action] ?? "직접 수정",
        detailSummary: detailSummary || "-",
        detailItems: g.detailItems,
        createdAt: g.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit: GROUPS_PER_PAGE,
        total: totalGroups,
        totalPages: Math.ceil(totalGroups / GROUPS_PER_PAGE),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** DELETE: 업데이트 이력 전체 삭제 */
export async function DELETE() {
  try {
    const result = await prisma.dashboardAuditLog.deleteMany({});
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
