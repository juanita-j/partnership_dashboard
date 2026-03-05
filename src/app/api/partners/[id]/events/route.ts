import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { yearlyEventSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params;
    const body = await req.json();
    const parsed = yearlyEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { year, danInvitedRaw, danInviter, giftRecipient, giftItem, giftQtyRaw, giftSender } = parsed.data;
    const event = await prisma.yearlyEvent.upsert({
      where: { partnerId_year: { partnerId, year } },
      create: {
        partnerId,
        year,
        danInvitedRaw: danInvitedRaw ?? "",
        danInviter: danInviter ?? "",
        giftRecipient: giftRecipient ?? "",
        giftItem: giftItem ?? "",
        giftQtyRaw: giftQtyRaw ?? "",
        giftSender: giftSender ?? "",
      },
      update: {
        danInvitedRaw: danInvitedRaw ?? "",
        danInviter: danInviter ?? "",
        giftRecipient: giftRecipient ?? "",
        giftItem: giftItem ?? "",
        giftQtyRaw: giftQtyRaw ?? "",
        giftSender: giftSender ?? "",
      },
    });
    return NextResponse.json(event);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
