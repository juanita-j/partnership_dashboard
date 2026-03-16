import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripCompanySuffix, upperLatin, normalizeCompany, warmCompanyAliasCache } from "@/lib/company";
import { stripCompanySuffixForDisplay } from "@/lib/company-display";
import { partnerCreateSchema } from "@/lib/validations";
import { getDashboardUserId, logAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";
import { isConfluenceConfigured } from "@/lib/confluence";
import {
  getPartnersFromConfluence,
  filterSortPaginatePartners,
  filterPartners,
  type PartnerQueryParams,
} from "@/lib/confluence-partners";

type PartnerWithYearlyEvents = Prisma.PartnerGetPayload<{ include: { yearlyEvents: true } }>;

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

function buildQueryParamsFromSearchParams(searchParams: URLSearchParams): PartnerQueryParams {
  const dan: Record<number, boolean> = {};
  const danYn: Record<number, string> = {};
  const gift: Record<number, boolean> = {};
  const giftYn: Record<number, string> = {};
  for (let year = YEAR_RANGE.min; year <= YEAR_RANGE.max; year++) {
    const yy = year % 100;
    if (searchParams.get(`dan${yy}`) === "true") dan[yy] = true;
    const dy = searchParams.get(`dan${yy}Yn`) ?? "";
    if (dy) danYn[yy] = dy;
    if (searchParams.get(`gift${year}`) === "true") gift[year] = true;
    const gy = searchParams.get(`gift${yy}Yn`) ?? "";
    if (gy) giftYn[yy] = gy;
  }
  const sortOrder: "asc" | "desc" =
    (searchParams.get("sortOrder") ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";
  return {
    page: Math.max(1, parseInt(searchParams.get("page") ?? "1", 10)),
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10))),
    employmentStatus: (searchParams.get("employmentStatus") ?? "").trim() || undefined,
    name: (searchParams.get("name") ?? "").trim() || undefined,
    company: (searchParams.get("company") ?? "").trim() || undefined,
    department: (searchParams.get("department") ?? "").trim() || undefined,
    title: (searchParams.get("title") ?? "").trim() || undefined,
    phone: (searchParams.get("phone") ?? "").trim() || undefined,
    email: (searchParams.get("email") ?? "").trim() || undefined,
    history: (searchParams.get("history") ?? "").trim() || undefined,
    inviter: (searchParams.get("inviter") ?? "").trim() || undefined,
    giftSender: (searchParams.get("giftSender") ?? "").trim() || undefined,
    sortBy: (searchParams.get("sortBy") ?? "").trim() || "updatedAt",
    sortOrder,
    idsOnly: searchParams.get("idsOnly") === "true",
    dan: Object.keys(dan).length ? dan : undefined,
    danYn: Object.keys(danYn).length ? danYn : undefined,
    gift: Object.keys(gift).length ? gift : undefined,
    giftYn: Object.keys(giftYn).length ? giftYn : undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = buildQueryParamsFromSearchParams(searchParams);

    if (isConfluenceConfigured()) {
      const partners = await getPartnersFromConfluence();
      if (q.idsOnly) {
        const filtered = filterPartners(partners, q);
        return NextResponse.json({ ids: filtered.slice(0, 10000).map((r) => r.id) });
      }
      const { data, total, page, limit } = filterSortPaginatePartners(
        partners,
        q,
        stripCompanySuffixForDisplay
      );
      await warmCompanyAliasCache();
      const dataWithCompany = await Promise.all(
        data.map(async (p) => {
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
        data: dataWithCompany,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const employmentStatus = q.employmentStatus ?? "";
    const name = q.name ?? "";
    const company = q.company ?? "";
    const department = q.department ?? "";
    const title = q.title ?? "";
    const phone = q.phone ?? "";
    const email = q.email ?? "";
    const history = q.history ?? "";
    const inviter = q.inviter ?? "";
    const giftSender = q.giftSender ?? "";
    const sortBy = q.sortBy;
    const sortOrder = q.sortOrder;

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
    const orderByField = ALLOWED_SORT_FIELDS.includes(sortBy as (typeof ALLOWED_SORT_FIELDS)[number])
      ? sortBy
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

    if (q.idsOnly) {
      const rows = await prisma.partner.findMany({
        where: where as Prisma.PartnerWhereInput,
        select: { id: true },
        take: 10000,
      });
      return NextResponse.json({ ids: rows.map((r) => r.id) });
    }

    const whereInput = where as Prisma.PartnerWhereInput;
    let partners: PartnerWithYearlyEvents[];
    let total: number;
    if (orderByField === "companyNormalized") {
      const [countRes, all] = await Promise.all([
        prisma.partner.count({ where: whereInput }),
        prisma.partner.findMany({
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
        prisma.partner.count({ where: whereInput }),
        prisma.partner.findMany({
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
  try {
    const body = await req.json();
    const parsed = partnerCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    const partner = await prisma.partner.create({
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
      const detail = `회사: ${partner.companyNormalized ?? ""}, 이름: ${partner.name}`.trim();
      await logAudit(userId, "partner_create", null, detail || "파트너 추가");
    }
    return NextResponse.json({ ...partner, eventsByYear: toEventsByYear(partner.yearlyEvents) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
