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

    // 신규 vs 수정 판단: 고유값 = '이름' + '휴대폰'. 둘 다 일치할 때만 수정으로 간주 (이메일·회사는 매칭에 사용하지 않음)
    let existing: (typeof partners)[number] | null = null;
    let matchKey = "";
    if (name && phone) {
      existing = partners.find(
        (p) => p.name.trim() === name && (p.phone ?? "").trim() === phone
      ) ?? null;
      matchKey = `이름+휴대폰:${name}|${phone}`;
    }
    const changes: string[] = [];
    if (existing) {
      const p = existing;
      const empty = (s: string | null | undefined) => (s ?? "").trim() || "(비움)";
      if (row.name != null && row.name !== p.name) changes.push(`이름 (${empty(p.name)} → ${empty(row.name)})`);
      if (row.phone !== undefined && (row.phone ?? "").trim() !== (p.phone ?? "").trim()) changes.push(`휴대폰 (${empty(p.phone)} → ${empty(row.phone)})`);
      if (row.companyNormalized != null && (row.companyNormalized ?? "").trim() !== (p.companyNormalized ?? "").trim()) {
        changes.push(`회사 (${empty(p.companyNormalized)} → ${empty(row.companyNormalized)})`);
      }
      if (row.department !== undefined && (row.department ?? "").trim() !== (p.department ?? "").trim()) {
        changes.push(`부서 (${empty(p.department)} → ${empty(row.department)})`);
      }
      if (row.title !== undefined && (row.title ?? "").trim() !== (p.title ?? "").trim()) {
        changes.push(`직함 (${empty(p.title)} → ${empty(row.title)})`);
      }
      if (row.email !== undefined && (row.email ?? "").trim() !== (p.email ?? "").trim()) {
        changes.push(`전자 메일 (${empty(p.email)} → ${empty(row.email)})`);
      }
      const workPhone = (p as { workPhone?: string }).workPhone;
      if (row.workPhone !== undefined && (row.workPhone ?? "").trim() !== (workPhone ?? "").trim()) {
        changes.push(`근무처 전화 (${empty(workPhone)} → ${empty(row.workPhone)})`);
      }
      const workFax = (p as { workFax?: string }).workFax;
      if (row.workFax !== undefined && (row.workFax ?? "").trim() !== (workFax ?? "").trim()) {
        changes.push(`근무처 팩스 (${empty(workFax)} → ${empty(row.workFax)})`);
      }
      if (row.address !== undefined && (row.address ?? "").trim() !== (p.address ?? "").trim()) {
        changes.push(`근무지 주소 (${empty(p.address)} → ${empty(row.address)})`);
      }
      if (row.businessCardDateRaw !== undefined && (row.businessCardDateRaw ?? "").trim() !== (p.businessCardDateRaw ?? "").trim()) {
        changes.push(`명함 등록일 (${empty(p.businessCardDateRaw)} → ${empty(row.businessCardDateRaw)})`);
      }
      if (row.years) {
        for (const [y, ev] of Object.entries(row.years)) {
          const year = parseInt(y, 10);
          const existingEv = p.yearlyEvents?.find((e) => e.year === year);
          if (ev.danInvitedRaw !== undefined && (ev.danInvitedRaw ?? "") !== (existingEv?.danInvitedRaw ?? "")) {
            changes.push(`${year}년 DAN초청 (${empty(existingEv?.danInvitedRaw)} → ${empty(ev.danInvitedRaw)})`);
          }
          if (ev.danInviter !== undefined && (ev.danInviter ?? "") !== (existingEv?.danInviter ?? "")) {
            changes.push(`${year}년 DAN초청인 (${empty(existingEv?.danInviter)} → ${empty(ev.danInviter)})`);
          }
          if (ev.giftRecipient !== undefined && (ev.giftRecipient ?? "") !== (existingEv?.giftRecipient ?? "")) {
            changes.push(`${year}년 선물수신 (${empty(existingEv?.giftRecipient)} → ${empty(ev.giftRecipient)})`);
          }
          if (ev.giftItem !== undefined && (ev.giftItem ?? "") !== (existingEv?.giftItem ?? "")) {
            changes.push(`${year}년 선물품목 (${empty(existingEv?.giftItem)} → ${empty(ev.giftItem)})`);
          }
          if (ev.giftQtyRaw !== undefined && (ev.giftQtyRaw ?? "") !== (existingEv?.giftQtyRaw ?? "")) {
            changes.push(`${year}년 선물발송개수 (${empty(existingEv?.giftQtyRaw)} → ${empty(ev.giftQtyRaw)})`);
          }
          if (ev.giftSender !== undefined && (ev.giftSender ?? "") !== (existingEv?.giftSender ?? "")) {
            changes.push(`${year}년 선물발송인 (${empty(existingEv?.giftSender)} → ${empty(ev.giftSender)})`);
          }
        }
      }
      // 변경된 내용이 있을 때만 미리보기/적용 대상에 포함 (고유값만 맞고 변경 없으면 제외)
      if (changes.length > 0) {
        diff.push({
          action: "update",
          partnerId: p.id,
          matchKey,
          changes,
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
      }
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
