import { NextRequest, NextResponse } from "next/server";
import { getExecutivePrisma } from "@/lib/executive-db";
import { requireExecutiveDb } from "@/lib/executive-api";
import { normalizeCompany } from "@/lib/company";
import type { Prisma } from "@/generated/prisma-executive-client";
import * as XLSX from "xlsx";

function toEventsByYear(
  events: {
    year: number;
    danInvitedRaw: string | null;
    danInviter: string | null;
    giftRecipient?: string | null;
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

function buildDanColumns(years: number[]): { key: string; label: string }[] {
  return years.flatMap((y) => {
    const yy = y % 100;
    return [
      { key: `dan${yy}Invited`, label: `DAN${yy} 초청여부` },
      { key: `dan${yy}Inviter`, label: `DAN${yy} 초청인` },
    ];
  });
}
function buildGiftColumns(years: number[]): { key: string; label: string }[] {
  return years.flatMap((y) => {
    const yy = y % 100;
    return [
      { key: `gift${yy}Recipient`, label: `${yy}년 선물수신인` },
      { key: `gift${yy}Item`, label: `${yy}년 선물품목` },
      { key: `gift${yy}Qty`, label: `${yy}년 선물발송개수` },
      { key: `gift${yy}Sender`, label: `${yy}년 선물발송인` },
    ];
  });
}

const FIXED_COLUMNS: { key: string; label: string }[] = [
  { key: "employmentStatus", label: "재직상태" },
  { key: "company", label: "회사" },
  { key: "name", label: "이름" },
  { key: "phone", label: "휴대폰" },
  { key: "department", label: "부서" },
  { key: "title", label: "직함" },
  { key: "email", label: "전자 메일" },
  { key: "address", label: "근무지 주소" },
];

const OPTIONAL_COLUMNS: { key: string; label: string }[] = [
  { key: "businessCardDate", label: "명함 등록일" },
  { key: "history", label: "히스토리" },
  { key: "hq", label: "HQ" },
];

function getCellValue(
  p: {
    employmentStatus: string | null;
    companyNormalized: string;
    name: string;
    phone: string | null;
    department: string | null;
    title: string | null;
    email: string | null;
    address: string | null;
    hq: string | null;
    businessCardDateRaw: string | null;
    history: string | null;
    eventsByYear: Record<
      number,
      {
        danInvitedRaw?: string;
        danInviter?: string;
        giftRecipient?: string;
        giftItem?: string;
        giftQtyRaw?: string;
        giftSender?: string;
      }
    >;
  },
  key: string
): string {
  switch (key) {
    case "employmentStatus":
      return p.employmentStatus ?? "";
    case "company":
      return p.companyNormalized ?? "";
    case "name":
      return p.name ?? "";
    case "phone":
      return p.phone ?? "";
    case "department":
      return p.department ?? "";
    case "title":
      return p.title ?? "";
    case "email":
      return p.email ?? "";
    case "address":
      return p.address ?? "";
    case "hq":
      return p.hq ?? "";
    case "businessCardDate":
      return p.businessCardDateRaw ?? "";
    case "history":
      return p.history ?? "";
    case "dan23Invited":
      return p.eventsByYear?.[2023]?.danInvitedRaw ?? "";
    case "dan23Inviter":
      return p.eventsByYear?.[2023]?.danInviter ?? "";
    case "dan24Invited":
      return p.eventsByYear?.[2024]?.danInvitedRaw ?? "";
    case "dan24Inviter":
      return p.eventsByYear?.[2024]?.danInviter ?? "";
    case "dan25Invited":
      return p.eventsByYear?.[2025]?.danInvitedRaw ?? "";
    case "dan25Inviter":
      return p.eventsByYear?.[2025]?.danInviter ?? "";
    case "gift24Recipient":
      return p.eventsByYear?.[2024]?.giftRecipient ?? "";
    case "gift24Item":
      return p.eventsByYear?.[2024]?.giftItem ?? "";
    case "gift24Qty":
      return p.eventsByYear?.[2024]?.giftQtyRaw ?? "";
    case "gift24Sender":
      return p.eventsByYear?.[2024]?.giftSender ?? "";
    case "gift25Recipient":
      return p.eventsByYear?.[2025]?.giftRecipient ?? "";
    case "gift25Item":
      return p.eventsByYear?.[2025]?.giftItem ?? "";
    case "gift25Qty":
      return p.eventsByYear?.[2025]?.giftQtyRaw ?? "";
    case "gift25Sender":
      return p.eventsByYear?.[2025]?.giftSender ?? "";
    default: {
      const danInvited = key.match(/^dan(\d{2})Invited$/);
      if (danInvited) return p.eventsByYear?.[2000 + parseInt(danInvited[1], 10)]?.danInvitedRaw ?? "";
      const danInviter = key.match(/^dan(\d{2})Inviter$/);
      if (danInviter) return p.eventsByYear?.[2000 + parseInt(danInviter[1], 10)]?.danInviter ?? "";
      const gift = key.match(/^gift(\d{2})(Recipient|Item|Qty|Sender)$/);
      if (gift) {
        const year = 2000 + parseInt(gift[1], 10);
        const f = gift[2];
        const field =
          f === "Recipient" ? "giftRecipient" : f === "Item" ? "giftItem" : f === "Qty" ? "giftQtyRaw" : "giftSender";
        return p.eventsByYear?.[year]?.[field as keyof (typeof p.eventsByYear)[number]] ?? "";
      }
      return "";
    }
  }
}

const YEAR_RANGE = { min: 2023, max: 2030 };

export async function GET(req: NextRequest) {
  const bad = requireExecutiveDb();
  if (bad) return bad;
  const prisma = getExecutivePrisma();
  try {
    const { searchParams } = new URL(req.url);
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
    let showColumns: string[] = [];
    try {
      const cols = searchParams.get("columns");
      if (cols) showColumns = JSON.parse(cols) as string[];
    } catch {
      // ignore
    }
    const idsParam = (searchParams.get("ids") ?? "").trim();
    const filterIds = idsParam ? idsParam.split(",").map((id) => id.trim()).filter(Boolean) : null;

    const eventYearsRows = await prisma.executiveYearlyEvent.findMany({
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "asc" },
    });
    const eventYears = eventYearsRows.length ? eventYearsRows.map((r) => r.year) : [2023, 2024, 2025];
    const DAN_COLUMNS = buildDanColumns(eventYears);
    const GIFT_COLUMNS = buildGiftColumns(eventYears);

    const where: Record<string, unknown> = {};
    if (filterIds && filterIds.length > 0) {
      where.id = { in: filterIds };
    } else {
      if (employmentStatus) where.employmentStatus = employmentStatus;
      if (name) where.name = { contains: name };
      if (company) where.companyNormalized = { contains: company, mode: "insensitive" };
      if (department) where.department = { contains: department };
      if (title) where.title = { contains: title };
      if (phone) where.phone = { contains: phone };
      if (email) where.email = { contains: email, mode: "insensitive" };
      if (history) where.history = { contains: history };
      const eventConditions: Record<string, unknown>[] = [];
      for (let year = YEAR_RANGE.min; year <= YEAR_RANGE.max; year++) {
        const yy = year % 100;
        if (searchParams.get(`dan${yy}`) === "true") eventConditions.push({ year, danInvitedRaw: "Y" });
        const danYn = searchParams.get(`dan${yy}Yn`) ?? "";
        if (danYn === "Y") eventConditions.push({ year, danInvitedRaw: "Y" });
        if (danYn === "N") eventConditions.push({ year, danInvitedRaw: "N" });
        if (searchParams.get(`gift${year}`) === "true") eventConditions.push({ year, giftRecipient: "Y" });
        const giftYn = searchParams.get(`gift${yy}Yn`) ?? "";
        if (giftYn === "Y") eventConditions.push({ year, giftRecipient: "Y" });
        if (giftYn === "N") eventConditions.push({ year, giftRecipient: "N" });
      }
      if (inviter) eventConditions.push({ danInviter: { contains: inviter } });
      if (giftSender) eventConditions.push({ giftSender: { contains: giftSender } });
      if (eventConditions.length > 0) {
        where.AND = (where.AND as Record<string, unknown>[]) ?? [];
        for (const cond of eventConditions) {
          (where.AND as Record<string, unknown>[]).push({ yearlyEvents: { some: cond } });
        }
      }
    }

    const partners = await prisma.executivePartner.findMany({
      where: where as Prisma.ExecutivePartnerWhereInput,
      include: { yearlyEvents: true },
      orderBy: { updatedAt: "desc" },
    });

    const rows = await Promise.all(
      partners.map(async (p) => {
        const { normalized } = await normalizeCompany(
          (p.companyNormalized ?? "").trim(),
          p.email ?? undefined
        );
        return {
          ...p,
          companyNormalized: normalized || (p.companyNormalized ?? ""),
          eventsByYear: toEventsByYear(
            p.yearlyEvents as {
              year: number;
              danInvitedRaw: string | null;
              danInviter: string | null;
              giftRecipient?: string | null;
              giftItem: string | null;
              giftQtyRaw: string | null;
              giftSender: string | null;
            }[]
          ),
        };
      })
    );

    const columns: { key: string; label: string }[] = [...FIXED_COLUMNS];
    if (showColumns.includes("businessCardDate")) columns.push(OPTIONAL_COLUMNS[0]);
    if (showColumns.includes("history")) columns.push(OPTIONAL_COLUMNS[1]);
    if (showColumns.includes("danInvited")) columns.push(...DAN_COLUMNS.filter((c) => c.key.endsWith("Invited")));
    if (showColumns.includes("inviter")) columns.push(...DAN_COLUMNS.filter((c) => c.key.endsWith("Inviter")));
    if (showColumns.includes("giftRecipient")) columns.push(...GIFT_COLUMNS.filter((c) => c.key.endsWith("Recipient")));
    if (showColumns.includes("giftItem")) columns.push(...GIFT_COLUMNS.filter((c) => c.key.endsWith("Item")));
    if (showColumns.includes("giftQty")) columns.push(...GIFT_COLUMNS.filter((c) => c.key.endsWith("Qty")));
    if (showColumns.includes("giftSender")) columns.push(...GIFT_COLUMNS.filter((c) => c.key.endsWith("Sender")));
    const danFilterOn = eventYears.some(
      (y) => searchParams.get(`dan${y % 100}`) === "true" || (searchParams.get(`dan${y % 100}Yn`) ?? "") !== ""
    );
    if (danFilterOn) columns.push(...DAN_COLUMNS);
    const giftFilterOn =
      eventYears.some(
        (y) => searchParams.get(`gift${y}`) === "true" || (searchParams.get(`gift${y % 100}Yn`) ?? "") !== ""
      ) || giftSender !== "";
    if (giftFilterOn) {
      for (const y of eventYears) {
        const yy = y % 100;
        if (
          searchParams.get(`gift${y}`) === "true" ||
          (searchParams.get(`gift${yy}Yn`) ?? "") !== "" ||
          giftSender !== ""
        )
          columns.push(...GIFT_COLUMNS.filter((c) => c.key.startsWith(`gift${yy}`)));
      }
    }
    const columnsDeduped = columns.filter((c, i) => columns.findIndex((x) => x.key === c.key) === i);

    const headerRow = columnsDeduped.map((c) => c.label);
    const dataRows = rows.map((p) => columnsDeduped.map((c) => getCellValue(p, c.key)));

    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "파트너");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
    const filename = `executive_counterpart_export_${dateStr}_${timeStr}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
