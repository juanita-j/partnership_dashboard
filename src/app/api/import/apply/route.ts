import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { MergeDiffItem } from "@/lib/excel-import";
import { getDashboardUserId, logAudit } from "@/lib/audit";

/** Merge: 비어있지 않은 컬럼만 업데이트. history에 변경 로그 append */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const diff = body.diff as MergeDiffItem[] | undefined;
    if (!Array.isArray(diff)) {
      return NextResponse.json({ error: "Invalid diff" }, { status: 400 });
    }
    const now = new Date().toISOString().slice(0, 10);
    let created = 0;
    let updated = 0;
    for (const item of diff) {
      if (item.action === "create" && item.partner) {
        const p = item.partner;
        const partner = await prisma.partner.create({
          data: {
            status: "active",
            name: p.name ?? "",
            phone: p.phone ?? "",
            companyNormalized: p.companyNormalized ?? p.company ?? "",
            department: (p.department ?? "").trim() || null,
            title: (p.title ?? "").trim() || null,
            email: (p.email ?? "").trim() || null,
            workPhone: (p.workPhone ?? "").trim() || null,
            workFax: (p.workFax ?? "").trim() || null,
            address: (p.address ?? "").trim() || null,
            businessCardDateRaw: (p.businessCardDateRaw ?? "").trim() || null,
            employmentStatus: "재직",
            history: (p.history ?? "").trim(),
          },
        });
        created++;
        if (item.yearlyEvents?.length) {
          for (const ev of item.yearlyEvents) {
            await prisma.yearlyEvent.upsert({
              where: { partnerId_year: { partnerId: partner.id, year: ev.year } },
              create: {
                partnerId: partner.id,
                year: ev.year,
                danInvitedRaw: (ev.danInvitedRaw ?? "").trim() || null,
                danInviter: (ev.danInviter ?? "").trim() || null,
                giftRecipient: (ev.giftRecipient ?? "").trim() || null,
                giftItem: (ev.giftItem ?? "").trim() || null,
                giftQtyRaw: (ev.giftQtyRaw ?? "").trim() || null,
                giftSender: (ev.giftSender ?? "").trim() || null,
              },
              update: {
                ...(ev.danInvitedRaw !== undefined && ev.danInvitedRaw !== "" && { danInvitedRaw: ev.danInvitedRaw }),
                ...(ev.danInviter !== undefined && ev.danInviter !== "" && { danInviter: ev.danInviter }),
                ...(ev.giftRecipient !== undefined && ev.giftRecipient !== "" && { giftRecipient: ev.giftRecipient }),
                ...(ev.giftItem !== undefined && ev.giftItem !== "" && { giftItem: ev.giftItem }),
                ...(ev.giftQtyRaw !== undefined && ev.giftQtyRaw !== "" && { giftQtyRaw: ev.giftQtyRaw }),
                ...(ev.giftSender !== undefined && ev.giftSender !== "" && { giftSender: ev.giftSender }),
              },
            });
          }
        }
      } else if (item.action === "update" && item.partnerId && item.partner) {
        const p = item.partner;
        const existing = await prisma.partner.findUnique({
          where: { id: item.partnerId },
          include: { yearlyEvents: true },
        });
        if (!existing) continue;
        if (existing.employmentStatus === "퇴사") continue;
        const updates: Record<string, unknown> = {};
        const historyParts: string[] = [];
        if (p.name != null && p.name !== "" && p.name !== existing.name) {
          updates.name = p.name;
          historyParts.push(`이름 ${existing.name} -> ${p.name}`);
        }
        if (p.phone !== undefined && (p.phone ?? "").trim() !== "" && (p.phone ?? "").trim() !== (existing.phone ?? "").trim()) {
          updates.phone = p.phone?.trim() ?? "";
          historyParts.push("휴대폰 변경");
        }
        if (p.companyNormalized != null && (p.companyNormalized ?? "").trim() !== "" && (p.companyNormalized ?? "").trim() !== (existing.companyNormalized ?? "").trim()) {
          const oldCompany = (existing.companyNormalized ?? "").trim();
          updates.companyNormalized = p.companyNormalized?.trim() ?? "";
          if (oldCompany) historyParts.push(`ex-${oldCompany}`);
        }
        if (p.department !== undefined && (p.department ?? "").trim() !== (existing.department ?? "").trim()) {
          updates.department = (p.department ?? "").trim() || null;
          historyParts.push(`부서 ${existing.department ?? ""} -> ${p.department ?? ""}`);
        }
        if (p.title !== undefined && (p.title ?? "").trim() !== (existing.title ?? "").trim()) {
          updates.title = (p.title ?? "").trim() || null;
          historyParts.push("직함 변경");
        }
        if (p.email !== undefined) updates.email = (p.email ?? "").trim() || null;
        if (p.workPhone !== undefined) updates.workPhone = (p.workPhone ?? "").trim() || null;
        if (p.workFax !== undefined) updates.workFax = (p.workFax ?? "").trim() || null;
        if (p.address !== undefined) updates.address = (p.address ?? "").trim() || null;
        if (p.businessCardDateRaw !== undefined) updates.businessCardDateRaw = (p.businessCardDateRaw ?? "").trim() || null;
        // 엑셀의 '히스토리' 셀이 비어 있으면 ExcelImport 문구를 넣지 않음 (해당 셀에 내용이 있을 때만 append)
        const excelHistory = (p.history ?? "").trim();
        if (historyParts.length > 0 && excelHistory !== "") {
          updates.history = (existing.history ?? "") + "\n" + `${now} ExcelImport: ` + historyParts.join("; ");
        }
        if (Object.keys(updates).length > 0) {
          await prisma.partner.update({
            where: { id: item.partnerId },
            data: updates as never,
          });
          updated++;
        }
        if (item.yearlyEvents?.length) {
          for (const ev of item.yearlyEvents) {
            const existingEv = existing.yearlyEvents?.find((e) => e.year === ev.year);
            const up: Record<string, unknown> = {};
            if (ev.danInvitedRaw !== undefined && ev.danInvitedRaw !== "") up.danInvitedRaw = ev.danInvitedRaw;
            if (ev.danInviter !== undefined && ev.danInviter !== "") up.danInviter = ev.danInviter;
            if (ev.giftRecipient !== undefined && ev.giftRecipient !== "") up.giftRecipient = ev.giftRecipient;
            if (ev.giftItem !== undefined && ev.giftItem !== "") up.giftItem = ev.giftItem;
            if (ev.giftQtyRaw !== undefined && ev.giftQtyRaw !== "") up.giftQtyRaw = ev.giftQtyRaw;
            if (ev.giftSender !== undefined && ev.giftSender !== "") up.giftSender = ev.giftSender;
            await prisma.yearlyEvent.upsert({
              where: { partnerId_year: { partnerId: item.partnerId, year: ev.year } },
              create: {
                partnerId: item.partnerId,
                year: ev.year,
                danInvitedRaw: ev.danInvitedRaw ?? null,
                danInviter: ev.danInviter ?? null,
                giftRecipient: ev.giftRecipient ?? null,
                giftItem: ev.giftItem ?? null,
                giftQtyRaw: ev.giftQtyRaw ?? null,
                giftSender: ev.giftSender ?? null,
              },
              update: Object.keys(up).length ? up : { updatedAt: new Date() },
            });
          }
        }
      }
    }
    const userId = getDashboardUserId(req);
    if (userId) await logAudit(userId, "import_apply", null, JSON.stringify({ created, updated }));
    return NextResponse.json({ created, updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
