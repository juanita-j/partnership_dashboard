import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSheet, normalizeParsedRows, type ParsedRow, type MergeDiff } from "@/lib/excel-import";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    const buffer = await file.arrayBuffer();
    let rows;
    try {
      rows = parseSheet(buffer);
    } catch (parseErr) {
      const message = parseErr instanceof Error ? parseErr.message : "엑셀 파싱에 실패했습니다.";
      console.error("Excel parse error:", parseErr);
      return NextResponse.json({ error: "PARSE_ERROR", message }, { status: 400 });
    }
    const normalized = await normalizeParsedRows(rows);
    const diff = await buildMergeDiff(normalized);
    return NextResponse.json({ diff, totalRows: normalized.length });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: "Internal error", message }, { status: 500 });
  }
}

async function buildMergeDiff(rows: ParsedRow[]): Promise<MergeDiff> {
  const diff: MergeDiff = [];
  const partners = await prisma.partner.findMany({
    include: { yearlyEvents: true },
  });
  for (const row of rows) {
    const email = (row.email ?? "").trim();
    const name = (row.name ?? "").trim();
    const phone = (row.phone ?? "").trim();
    const company = (row.companyNormalized ?? row.company ?? "").trim();
    if (!name && !email && !company) continue;
    let existing = null;
    let matchKey = "";
    if (name && phone) {
      existing = partners.find(
        (p) =>
          p.name.trim() === name &&
          (p.phone ?? "").trim() === phone
      );
      matchKey = `name+phone:${name}|${phone}`;
    }
    const changes: string[] = [];
    if (existing) {
      const p = existing;
      if (row.name != null && row.name !== p.name) changes.push(`이름 변경`);
      if (row.phone !== undefined && (row.phone ?? "") !== (p.phone ?? "")) changes.push(`휴대폰 변경`);
      if (row.companyNormalized != null && (row.companyNormalized ?? "") !== (p.companyNormalized ?? "")) {
        changes.push(`회사: ${p.companyNormalized} -> ${row.companyNormalized}`);
      }
      if (row.department !== undefined && (row.department ?? "") !== (p.department ?? "")) {
        changes.push(`부서 ${p.department ?? ""} -> ${row.department ?? ""}`);
      }
      if (row.title !== undefined && (row.title ?? "") !== (p.title ?? "")) changes.push(`직함 변경`);
      if (row.workPhone !== undefined && (row.workPhone ?? "") !== ((p as { workPhone?: string }).workPhone ?? "")) changes.push(`근무처 전화 변경`);
      if (row.workFax !== undefined && (row.workFax ?? "") !== ((p as { workFax?: string }).workFax ?? "")) changes.push(`근무처 팩스 변경`);
      if (row.address !== undefined && (row.address ?? "") !== (p.address ?? "")) changes.push(`근무지 주소 변경`);
      if (row.businessCardDateRaw !== undefined && (row.businessCardDateRaw ?? "") !== (p.businessCardDateRaw ?? "")) changes.push(`명함 등록일 변경`);
      if (row.years) {
        for (const [y, ev] of Object.entries(row.years)) {
          const year = parseInt(y, 10);
          const existingEv = p.yearlyEvents?.find((e) => e.year === year);
          if (ev.danInvitedRaw !== undefined && (ev.danInvitedRaw ?? "") !== (existingEv?.danInvitedRaw ?? "")) changes.push(`${year} DAN초청 변경`);
          if (ev.giftRecipient !== undefined && (ev.giftRecipient ?? "") !== (existingEv?.giftRecipient ?? "")) changes.push(`${year} 선물수신인 변경`);
          if (ev.giftItem !== undefined && (ev.giftItem ?? "") !== (existingEv?.giftItem ?? "")) changes.push(`${year} 품목 변경`);
        }
      }
      diff.push({
        action: "update",
        partnerId: p.id,
        matchKey,
        changes: changes.length ? changes : undefined,
        partner: { ...row, companyNormalized: row.companyNormalized ?? company },
        yearlyEvents: row.years
          ? Object.entries(row.years).map(([y, ev]) => ({
              year: parseInt(y, 10),
              danInvitedRaw: ev.danInvitedRaw,
              danInviter: ev.danInviter,
              giftRecipient: ev.giftRecipient,
              giftItem: ev.giftItem,
              giftQtyRaw: ev.giftQtyRaw,
              giftSender: ev.giftSender,
            }))
          : undefined,
      });
    } else {
      if (name || email || company) {
        diff.push({
          action: "create",
          matchKey: matchKey || `new:${name}|${email}`,
          partner: { ...row, companyNormalized: row.companyNormalized ?? company, name: name || "(이름없음)" },
          yearlyEvents: row.years
            ? Object.entries(row.years).map(([y, ev]) => ({
                year: parseInt(y, 10),
                danInvitedRaw: ev.danInvitedRaw,
                danInviter: ev.danInviter,
                giftRecipient: ev.giftRecipient,
                giftItem: ev.giftItem,
                giftQtyRaw: ev.giftQtyRaw,
                giftSender: ev.giftSender,
              }))
            : undefined,
        });
      }
    }
  }
  return diff;
}
