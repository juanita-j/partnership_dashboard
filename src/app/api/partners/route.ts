import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { partnerCreateSchema } from "@/lib/validations";
import { isEditor } from "@/lib/role";
import type { Prisma } from "@prisma/client";

const YEARS = [2023, 2024, 2025] as const;

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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const employmentStatus = (searchParams.get("employmentStatus") ?? "").trim();
    const name = (searchParams.get("name") ?? "").trim();
    const company = (searchParams.get("company") ?? "").trim();
    const department = (searchParams.get("department") ?? "").trim();
    const title = (searchParams.get("title") ?? "").trim();
    const dan23 = searchParams.get("dan23") === "true";
    const dan24 = searchParams.get("dan24") === "true";
    const dan25 = searchParams.get("dan25") === "true";
    const gift2024 = searchParams.get("gift2024") === "true";
    const gift2025 = searchParams.get("gift2025") === "true";
    const inviter = (searchParams.get("inviter") ?? "").trim();
    const giftSender = (searchParams.get("giftSender") ?? "").trim();

    const where: Record<string, unknown> = {};

    if (employmentStatus) {
      where.employmentStatus = employmentStatus;
    }
    if (name) {
      where.name = { contains: name };
    }
    if (company) {
      where.companyNormalized = { contains: company };
    }
    if (department) {
      where.department = { contains: department };
    }
    if (title) {
      where.title = { contains: title };
    }

    const eventConditions: Record<string, unknown>[] = [];
    if (dan23) {
      eventConditions.push({ year: 2023, danInvitedRaw: "Y" });
    }
    if (dan24) {
      eventConditions.push({ year: 2024, danInvitedRaw: "Y" });
    }
    if (dan25) {
      eventConditions.push({ year: 2025, danInvitedRaw: "Y" });
    }
    if (gift2024) {
      eventConditions.push({ year: 2024, giftRecipient: "Y" });
    }
    if (gift2025) {
      eventConditions.push({ year: 2025, giftRecipient: "Y" });
    }
    if (inviter) {
      eventConditions.push({ danInviter: { contains: inviter } });
    }
    if (giftSender) {
      eventConditions.push({ giftSender: { contains: giftSender } });
    }

    if (eventConditions.length > 0) {
      where.AND = (where.AND as Record<string, unknown>[]) ?? [];
      for (const cond of eventConditions) {
        (where.AND as Record<string, unknown>[]).push({ yearlyEvents: { some: cond } });
      }
    }

    const [partners, total] = await Promise.all([
      prisma.partner.findMany({
        where: where as Prisma.PartnerWhereInput,
        include: {
          yearlyEvents: { where: { year: { in: [...YEARS] } } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.partner.count({ where: where as Prisma.PartnerWhereInput }),
    ]);

    const data = partners.map((p) => ({
      ...p,
      eventsByYear: toEventsByYear(p.yearlyEvents),
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isEditor((session.user as { role?: string }).role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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
        companyNormalized: d.companyNormalized ?? "",
        department: d.department ?? "",
        title: d.title ?? "",
        email: d.email ?? "",
        workPhone: d.workPhone ?? "",
        workFax: d.workFax ?? "",
        address: d.address ?? "",
        businessCardDateRaw: d.businessCardDateRaw ?? d.businessCardDate ?? null,
        employmentStatus: d.employmentStatus ?? "재직",
        employmentUpdatedAtRaw: d.employmentUpdatedAtRaw ?? d.employmentUpdatedAt ?? null,
        history: d.history ?? "",
      },
      include: { yearlyEvents: true },
    });
    return NextResponse.json({ ...partner, eventsByYear: toEventsByYear(partner.yearlyEvents) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
