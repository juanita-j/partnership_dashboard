import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { partnerUpdateSchema, EMPLOYMENT_STATUS_ENUM } from "@/lib/validations";

const YEARS = [2023, 2024, 2025];

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
  try {
    const { id } = await params;
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: { yearlyEvents: true },
    });
    if (!partner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ...partner, eventsByYear: toEventsByYear(partner.yearlyEvents) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** PATCH: 파트너 필드 부분 업데이트 (인라인 편집) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    if (d.companyNormalized !== undefined) updatePayload.companyNormalized = d.companyNormalized;
    if (d.department !== undefined) updatePayload.department = d.department;
    if (d.title !== undefined) updatePayload.title = d.title;
    if (d.email !== undefined) updatePayload.email = d.email;
    if (d.workPhone !== undefined) updatePayload.workPhone = d.workPhone;
    if (d.workFax !== undefined) updatePayload.workFax = d.workFax;
    if (d.address !== undefined) updatePayload.address = d.address;
    if (d.businessCardDateRaw !== undefined) updatePayload.businessCardDateRaw = d.businessCardDateRaw;
    if (Object.keys(updatePayload).length === 0) {
      const partner = await prisma.partner.findUnique({ where: { id }, include: { yearlyEvents: true } });
      if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ...partner, eventsByYear: toEventsByYear(partner.yearlyEvents) });
    }
    const partner = await prisma.partner.update({
      where: { id },
      data: updatePayload as never,
      include: { yearlyEvents: true },
    });
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
    if (d.companyNormalized !== undefined) updatePayload.companyNormalized = d.companyNormalized;
    if (d.department !== undefined) updatePayload.department = d.department;
    if (d.title !== undefined) updatePayload.title = d.title;
    if (d.email !== undefined) updatePayload.email = d.email;
    if (d.workPhone !== undefined) updatePayload.workPhone = d.workPhone;
    if (d.workFax !== undefined) updatePayload.workFax = d.workFax;
    if (d.address !== undefined) updatePayload.address = d.address;
    if (d.businessCardDateRaw !== undefined) updatePayload.businessCardDateRaw = d.businessCardDateRaw;
    if (d.employmentStatus !== undefined) updatePayload.employmentStatus = d.employmentStatus;
    if (d.employmentUpdatedAtRaw !== undefined) updatePayload.employmentUpdatedAtRaw = d.employmentUpdatedAtRaw;
    if (d.history !== undefined) updatePayload.history = d.history;

    const partner = await prisma.partner.update({
      where: { id },
      data: updatePayload as never,
      include: { yearlyEvents: true },
    });
    return NextResponse.json({ ...partner, eventsByYear: toEventsByYear(partner.yearlyEvents) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.partner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
