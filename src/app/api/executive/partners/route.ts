import { NextRequest, NextResponse } from "next/server";
import { getExecutivePrisma } from "@/lib/executive-db";
import { requireExecutiveDb } from "@/lib/executive-api";
import { stripCompanySuffix, upperLatin, normalizeCompany, warmCompanyAliasCache } from "@/lib/company";
import { stripCompanySuffixForDisplay } from "@/lib/company-display";
import { partnerCreateSchema } from "@/lib/validations";
import { getDashboardUserId, logAudit } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma-executive-client";

type PartnerWithYearlyEvents = Prisma.ExecutivePartnerGetPayload<{ include: { yearlyEvents: true } }>;

const YEAR_RANGE = { min: 2023, max: 2030 };

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

export async function GET(req: NextRequest) {
  const bad = requireExecutiveDb();
  if (bad) return bad;
  const prisma = getExecutivePrisma();
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const employmentStatus = (searchParams.get("employmentStatus") ?? "").trim();
    const name = (searchParams.get("name") ?? "").trim();
    const company = (searchParams.get("company") ?? "").trim();
    const department = (searchParams.get("department") ?? "").trim();
    const title = (searchParams.get("title") ?? "").trim();
    const phone = (searchParams.get("phone") ?? "").trim();
    const email = (searchParams.get("email") ?? "").trim();
    const history = (searchParams.get("history") ?? "").trim();
    const inviter = (searchParams.get("inviter") ?? "").trim();
    const giftSender = (searchParams.get("giftSender") ?? "").trim();
    const sortBy = (searchParams.get("sortBy") ?? "").trim() || "updatedAt";
    const sortOrder = (searchParams.get("sortOrder") ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const ALLOWED_SORT_FIELDS = [
      "employmentStatus",
      "companyNormalized",
      "name",
      "phone",
      "department",
      "title",
      "email",
      "address",
      "businessCardDateRaw",
      "history",
      "updatedAt",
    ] as const;
    type SortField = (typeof ALLOWED_SORT_FIELDS)[number];
    const orderByField: SortField = ALLOWED_SORT_FIELDS.includes(sortBy as SortField)
      ? (sortBy as SortField)
      : "updatedAt";

    const eventConditions: Record<string, unknown>[] = [];
    for (let year = YEAR_RANGE.min; year <= YEAR_RANGE.max; year++) {
      const yy = year % 100;
      const danOn = searchParams.get(`dan${yy}`) === "true";
      const danYn = searchParams.get(`dan${yy}Yn`) ?? "";
      if (danOn) eventConditions.push({ year, danInvitedRaw: "Y" });
      if (danYn === "Y") eventConditions.push({ year, danInvitedRaw: "Y" });
      if (danYn === "N") eventConditions.push({ year, danInvitedRaw: "N" });
      const giftOn = searchParams.get(`gift${year}`) === "true";
      const giftYn = searchParams.get(`gift${yy}Yn`) ?? "";
      if (giftOn) eventConditions.push({ year, giftRecipient: "Y" });
      if (giftYn === "Y") eventConditions.push({ year, giftRecipient: "Y" });
      if (giftYn === "N") eventConditions.push({ year, giftRecipient: "N" });
    }
    if (inviter) eventConditions.push({ danInviter: { contains: inviter } });
    if (giftSender) eventConditions.push({ giftSender: { contains: giftSender } });

    const where: Record<string, unknown> = {};
    if (employmentStatus) where.employmentStatus = employmentStatus;
    if (name) where.name = { contains: name };
    if (company) where.companyNormalized = { contains: company, mode: "insensitive" };
    if (department) where.department = { contains: department };
    if (title) where.title = { contains: title };
    if (phone) where.phone = { contains: phone };
    if (email) where.email = { contains: email, mode: "insensitive" };
    if (history) where.history = { contains: history };

    if (eventConditions.length > 0) {
      where.AND = (where.AND as Record<string, unknown>[]) ?? [];
      for (const cond of eventConditions) {
        (where.AND as Record<string, unknown>[]).push({ yearlyEvents: { some: cond } });
      }
    }

    if (searchParams.get("idsOnly") === "true") {
      const rows = await prisma.executivePartner.findMany({
        where: where as Prisma.ExecutivePartnerWhereInput,
        select: { id: true },
        take: 10000,
      });
      return NextResponse.json({ ids: rows.map((r) => r.id) });
    }

    const whereInput = where as Prisma.ExecutivePartnerWhereInput;
    let partners: PartnerWithYearlyEvents[];
    let total: number;
    if (orderByField === "companyNormalized") {
      const [countRes, all] = await Promise.all([
        prisma.executivePartner.count({ where: whereInput }),
        prisma.executivePartner.findMany({
          where: whereInput,
          include: { yearlyEvents: true },
          take: 10000,
        }),
      ]);
      total = countRes;
      const sorted = [...all].sort((a, b) => {
        const da = stripCompanySuffixForDisplay(a.companyNormalized ?? "");
        const db = stripCompanySuffixForDisplay(b.companyNormalized ?? "");
        const c = da.localeCompare(db, "ko");
        return sortOrder === "asc" ? c : -c;
      });
      partners = sorted.slice((page - 1) * limit, (page - 1) * limit + limit);
    } else {
      const [countRes, partnersResult] = await Promise.all([
        prisma.executivePartner.count({ where: whereInput }),
        prisma.executivePartner.findMany({
          where: whereInput,
          include: { yearlyEvents: true },
          orderBy: { [orderByField]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);
      total = countRes;
      partners = partnersResult;
    }

    await warmCompanyAliasCache();
    const data = await Promise.all(
      partners.map(async (p) => {
        const { normalized } = await normalizeCompany(
          (p.companyNormalized ?? "").trim(),
          p.email ?? undefined
        );
        return {
          ...p,
          companyNormalized: normalized || (p.companyNormalized ?? ""),
          eventsByYear: toEventsByYear(p.yearlyEvents),
        };
      })
    );

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const bad = requireExecutiveDb();
  if (bad) return bad;
  const prisma = getExecutivePrisma();
  try {
    const body = await req.json();
    const parsed = partnerCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    const partner = await prisma.executivePartner.create({
      data: {
        status: d.status ?? "active",
        name: d.name,
        phone: d.phone ?? "",
        companyNormalized: upperLatin(stripCompanySuffix(d.companyNormalized ?? "")),
        department: d.department ?? "",
        title: d.title ?? "",
        email: d.email ?? "",
        workPhone: d.workPhone ?? "",
        workFax: d.workFax ?? "",
        address: d.address ?? "",
        hq: d.hq ?? "",
        businessCardDateRaw: d.businessCardDateRaw ?? d.businessCardDate ?? null,
        employmentStatus: d.employmentStatus ?? "재직",
        employmentUpdatedAtRaw: d.employmentUpdatedAtRaw ?? d.employmentUpdatedAt ?? null,
        history: d.history ?? "",
      },
      include: { yearlyEvents: true },
    });
    const userId = getDashboardUserId(req);
    if (userId) {
      const detail = `[임원진] 회사: ${partner.companyNormalized ?? ""}, 이름: ${partner.name}`.trim();
      await logAudit(userId, "partner_create", null, detail || "[임원진] 파트너 추가");
    }
    return NextResponse.json({ ...partner, eventsByYear: toEventsByYear(partner.yearlyEvents) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
