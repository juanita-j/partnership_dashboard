import { NextRequest, NextResponse } from "next/server";
import { getExecutivePrisma } from "@/lib/executive-db";
import { requireExecutiveDb } from "@/lib/executive-api";
import { stripCompanySuffix, upperLatin, normalizeCompany } from "@/lib/company";
import { partnerUpdateSchema, EMPLOYMENT_STATUS_ENUM } from "@/lib/validations";
import { getDashboardUserId, logAudit } from "@/lib/audit";

const YEARS = [2023, 2024, 2025];

const FIELD_LABELS: Record<string, string> = {
  name: "이름",
  companyNormalized: "회사",
  phone: "휴대폰",
  department: "부서",
  title: "직함",
  email: "전자 메일",
  workPhone: "근무처 전화",
  workFax: "근무처 팩스",
  address: "근무지 주소",
  employmentStatus: "재직상태",
  businessCardDateRaw: "명함 등록일",
  history: "히스토리",
};

function empty(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v).trim();
}

function buildUpdateChanges(
  existing: Record<string, unknown>,
  updated: Record<string, unknown>,
  payloadKeys: string[]
): string[] {
  const changes: string[] = [];
  for (const key of payloadKeys) {
    const label = FIELD_LABELS[key] ?? key;
    const oldVal = empty(existing[key]);
    const newVal = empty(updated[key]);
    if (oldVal === newVal) continue;
    if (key === "history") {
      changes.push("히스토리 변경");
    } else if (label === "이름") {
      changes.push(`${label} ${oldVal || "(비어있음)"} → ${newVal || "(비어있음)"}`);
    } else if (label === "회사") {
      changes.push(oldVal ? `회사 ${oldVal} → ${newVal}` : `회사 ${newVal}`);
    } else if (["휴대폰", "부서", "직함", "재직상태"].includes(label)) {
      changes.push(oldVal ? `${label} ${oldVal} → ${newVal}` : `${label} ${newVal}`);
    } else {
      changes.push(newVal ? `${label} 변경` : `${label} 삭제`);
    }
  }
  return changes;
}

function toEventsByYear(
  events: {
    year: number;
    danInvitedRaw: string | null;
    danInviter: string | null;
    giftRecipient: string | null;
    giftItem: string | null;
    giftQtyRaw: string | null;
    giftSender: string | null;
  }[]
) {
  const byYear: Record<
    number,
    {
      danInvitedRaw?: string;
      danInviter?: string;
      giftRecipient?: string;
      giftItem?: string;
      giftQtyRaw?: string;
      giftSender?: string;
    }
  > = {};
  for (const y of YEARS) byYear[y] = {};
  for (const e of events) {
    byYear[e.year] = {
      danInvitedRaw: e.danInvitedRaw ?? undefined,
      danInviter: e.danInviter ?? undefined,
      giftRecipient: e.giftRecipient ?? undefined,
      giftItem: e.giftItem ?? undefined,
      giftQtyRaw: e.giftQtyRaw ?? undefined,
      giftSender: e.giftSender ?? undefined,
    };
  }
  return byYear;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const bad = requireExecutiveDb();
  if (bad) return bad;
  const prisma = getExecutivePrisma();
  try {
    const { id } = await params;
    const partner = await prisma.executivePartner.findUnique({
      where: { id },
      include: { yearlyEvents: true },
    });
    if (!partner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { normalized } = await normalizeCompany(
      (partner.companyNormalized ?? "").trim(),
      partner.email ?? undefined
    );
    return NextResponse.json({
      ...partner,
      companyNormalized: normalized || (partner.companyNormalized ?? ""),
      eventsByYear: toEventsByYear(partner.yearlyEvents),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const bad = requireExecutiveDb();
  if (bad) return bad;
  const prisma = getExecutivePrisma();
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = partnerUpdateSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    const updatePayload: Record<string, unknown> = {};
    if (d.employmentStatus !== undefined) {
      const ok = EMPLOYMENT_STATUS_ENUM.safeParse(d.employmentStatus);
      if (ok.success) updatePayload.employmentStatus = ok.data;
    }
    if (d.history !== undefined) updatePayload.history = d.history;
    if (d.name !== undefined) updatePayload.name = d.name;
    if (d.phone !== undefined) updatePayload.phone = d.phone;
    if (d.companyNormalized !== undefined) updatePayload.companyNormalized = upperLatin(stripCompanySuffix(d.companyNormalized));
    if (d.department !== undefined) updatePayload.department = d.department;
    if (d.title !== undefined) updatePayload.title = d.title;
    if (d.email !== undefined) updatePayload.email = d.email;
    if (d.workPhone !== undefined) updatePayload.workPhone = d.workPhone;
    if (d.workFax !== undefined) updatePayload.workFax = d.workFax;
    if (d.address !== undefined) updatePayload.address = d.address;
    if (d.hq !== undefined) updatePayload.hq = d.hq;
    if (d.businessCardDateRaw !== undefined) updatePayload.businessCardDateRaw = d.businessCardDateRaw;
    if (Object.keys(updatePayload).length === 0) {
      const partner = await prisma.executivePartner.findUnique({ where: { id }, include: { yearlyEvents: true } });
      if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ...partner, eventsByYear: toEventsByYear(partner.yearlyEvents) });
    }
    const existing = await prisma.executivePartner.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (updatePayload.companyNormalized !== undefined) {
      const oldCompany = (existing.companyNormalized ?? "").trim();
      const newCompany = ((updatePayload.companyNormalized as string) ?? "").trim();
      if (oldCompany && oldCompany !== newCompany) {
        const base = String(updatePayload.history ?? existing.history ?? "").trim();
        (updatePayload as Record<string, unknown>).history = base + (base ? "\n" : "") + "ex-" + oldCompany;
      }
    }
    const partner = await prisma.executivePartner.update({
      where: { id },
      data: updatePayload as never,
      include: { yearlyEvents: true },
    });
    const userId = getDashboardUserId(req);
    if (userId) {
      const payloadKeys = Object.keys(updatePayload) as string[];
      const changes = buildUpdateChanges(
        existing as unknown as Record<string, unknown>,
        partner as unknown as Record<string, unknown>,
        payloadKeys
      );
      const summary = `[임원진] 회사: ${partner.companyNormalized ?? ""}, 이름: ${partner.name}`.trim();
      const detail =
        changes.length > 0
          ? JSON.stringify({ summary, changes })
          : summary || "[임원진] 인라인 편집";
      await logAudit(userId, "partner_update", null, detail);
    }
    return NextResponse.json({ ...partner, eventsByYear: toEventsByYear(partner.yearlyEvents) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const bad = requireExecutiveDb();
  if (bad) return bad;
  const prisma = getExecutivePrisma();
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = partnerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    const updatePayload: Record<string, unknown> = {};
    if (d.status !== undefined) updatePayload.status = d.status;
    if (d.name !== undefined) updatePayload.name = d.name;
    if (d.phone !== undefined) updatePayload.phone = d.phone;
    if (d.companyNormalized !== undefined) updatePayload.companyNormalized = upperLatin(stripCompanySuffix(d.companyNormalized));
    if (d.department !== undefined) updatePayload.department = d.department;
    if (d.title !== undefined) updatePayload.title = d.title;
    if (d.email !== undefined) updatePayload.email = d.email;
    if (d.workPhone !== undefined) updatePayload.workPhone = d.workPhone;
    if (d.workFax !== undefined) updatePayload.workFax = d.workFax;
    if (d.address !== undefined) updatePayload.address = d.address;
    if (d.hq !== undefined) updatePayload.hq = d.hq;
    if (d.businessCardDateRaw !== undefined) updatePayload.businessCardDateRaw = d.businessCardDateRaw;
    if (d.employmentStatus !== undefined) updatePayload.employmentStatus = d.employmentStatus;
    if (d.employmentUpdatedAtRaw !== undefined) updatePayload.employmentUpdatedAtRaw = d.employmentUpdatedAtRaw;
    if (d.history !== undefined) updatePayload.history = d.history;

    const existing = await prisma.executivePartner.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (updatePayload.companyNormalized !== undefined) {
      const oldCompany = (existing.companyNormalized ?? "").trim();
      const newCompany = ((updatePayload.companyNormalized as string) ?? "").trim();
      if (oldCompany && oldCompany !== newCompany) {
        const base = String(updatePayload.history ?? existing.history ?? "").trim();
        (updatePayload as Record<string, unknown>).history = base + (base ? "\n" : "") + "ex-" + oldCompany;
      }
    }
    const partner = await prisma.executivePartner.update({
      where: { id },
      data: updatePayload as never,
      include: { yearlyEvents: true },
    });
    const userId = getDashboardUserId(req);
    if (userId) {
      const payloadKeys = Object.keys(updatePayload) as string[];
      const changes = buildUpdateChanges(
        existing as unknown as Record<string, unknown>,
        partner as unknown as Record<string, unknown>,
        payloadKeys
      );
      const summary = `[임원진] 회사: ${partner.companyNormalized ?? ""}, 이름: ${partner.name}`.trim();
      const detail =
        changes.length > 0
          ? JSON.stringify({ summary, changes })
          : summary || "[임원진] 전체 수정";
      await logAudit(userId, "partner_update", null, detail);
    }
    return NextResponse.json({ ...partner, eventsByYear: toEventsByYear(partner.yearlyEvents) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const bad = requireExecutiveDb();
  if (bad) return bad;
  const prisma = getExecutivePrisma();
  try {
    const { id } = await params;
    const userId = getDashboardUserId(req);
    const before = await prisma.executivePartner.findUnique({
      where: { id },
      select: { name: true, companyNormalized: true },
    });
    await prisma.executivePartner.delete({ where: { id } });
    if (userId) {
      const detail = before
        ? `[임원진] 회사: ${before.companyNormalized ?? ""}, 이름: ${before.name}`.trim()
        : "[임원진] 파트너 삭제";
      await logAudit(userId, "partner_delete", null, detail);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
