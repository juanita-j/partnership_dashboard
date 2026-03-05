import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";

const YEARS = [2023, 2024, 2025] as const;

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
];

const DAN_COLUMNS: { key: string; label: string }[] = [
  { key: "dan23Invited", label: "DAN23 초청여부" },
  { key: "dan23Inviter", label: "DAN23 초청인" },
  { key: "dan24Invited", label: "DAN24 초청여부" },
  { key: "dan24Inviter", label: "DAN24 초청인" },
  { key: "dan25Invited", label: "DAN25 초청여부" },
  { key: "dan25Inviter", label: "DAN25 초청인" },
];

const GIFT_COLUMNS: { key: string; label: string }[] = [
  { key: "gift24Recipient", label: "24년 선물수신인" },
  { key: "gift24Item", label: "24년 선물품목" },
  { key: "gift24Qty", label: "24년 선물발송개수" },
  { key: "gift24Sender", label: "24년 선물발송인" },
  { key: "gift25Recipient", label: "25년 선물수신인" },
  { key: "gift25Item", label: "25년 선물품목" },
  { key: "gift25Qty", label: "25년 선물발송개수" },
  { key: "gift25Sender", label: "25년 선물발송인" },
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
    default:
      return "";
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
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
    let showColumns: string[] = [];
    try {
      const cols = searchParams.get("columns");
      if (cols) showColumns = JSON.parse(cols) as string[];
    } catch {
      // ignore
    }

    const where: Record<string, unknown> = {};
    if (employmentStatus) where.employmentStatus = employmentStatus;
    if (name) where.name = { contains: name };
    if (company) where.companyNormalized = { contains: company };
    if (department) where.department = { contains: department };
    if (title) where.title = { contains: title };

    const eventConditions: Record<string, unknown>[] = [];
    if (dan23) eventConditions.push({ year: 2023, danInvitedRaw: "Y" });
    if (dan24) eventConditions.push({ year: 2024, danInvitedRaw: "Y" });
    if (dan25) eventConditions.push({ year: 2025, danInvitedRaw: "Y" });
    if (gift2024) eventConditions.push({ year: 2024, giftRecipient: "Y" });
    if (gift2025) eventConditions.push({ year: 2025, giftRecipient: "Y" });
    if (inviter) eventConditions.push({ danInviter: { contains: inviter } });
    if (giftSender) eventConditions.push({ giftSender: { contains: giftSender } });
    if (eventConditions.length > 0) {
      where.AND = (where.AND as Record<string, unknown>[]) ?? [];
      for (const cond of eventConditions) {
        (where.AND as Record<string, unknown>[]).push({ yearlyEvents: { some: cond } });
      }
    }

    const partners = await prisma.partner.findMany({
      where: where as Prisma.PartnerWhereInput,
      include: { yearlyEvents: { where: { year: { in: [...YEARS] } } } },
      orderBy: { updatedAt: "desc" },
    });

    const rows = partners.map((p) => ({
      ...p,
      eventsByYear: toEventsByYear(
        p.yearlyEvents as { year: number; danInvitedRaw: string | null; danInviter: string | null; giftRecipient?: string | null; giftItem: string | null; giftQtyRaw: string | null; giftSender: string | null }[]
      ),
    }));

    const columns: { key: string; label: string }[] = [...FIXED_COLUMNS];
    if (showColumns.includes("businessCardDate")) columns.push(OPTIONAL_COLUMNS[0]);
    if (showColumns.includes("history")) columns.push(OPTIONAL_COLUMNS[1]);
    if (dan23 || dan24 || dan25) columns.push(...DAN_COLUMNS);
    if (gift2024 || gift2025) {
      if (gift2024) columns.push(...GIFT_COLUMNS.filter((c) => c.key.startsWith("gift24")));
      if (gift2025) columns.push(...GIFT_COLUMNS.filter((c) => c.key.startsWith("gift25")));
    }

    const headerRow = columns.map((c) => c.label);
    const dataRows = rows.map((p) => columns.map((c) => getCellValue(p, c.key)));

    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "파트너");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
    const filename = `partner_dashboard_export_${dateStr}_${timeStr}.xlsx`;

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
