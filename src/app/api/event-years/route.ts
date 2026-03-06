import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** DB에 존재하는 연도 목록 (DAN/선물 필터·SHOW 연도 자동 반영용) */
export async function GET() {
  try {
    const rows = await prisma.yearlyEvent.findMany({
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "asc" },
    });
    const years = rows.map((r) => r.year);
    return NextResponse.json({ years });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
