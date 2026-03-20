import { NextResponse } from "next/server";
import { getExecutivePrisma } from "@/lib/executive-db";
import { requireExecutiveDb } from "@/lib/executive-api";

export async function GET() {
  const bad = requireExecutiveDb();
  if (bad) return bad;
  const prisma = getExecutivePrisma();
  try {
    const rows = await prisma.executiveYearlyEvent.findMany({
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
