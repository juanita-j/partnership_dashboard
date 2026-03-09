import { NextResponse } from "next/server";
import { unifyCompanyByDomain } from "@/lib/unify-company-by-domain";

/**
 * POST: 이메일 도메인별 회사명 통일 실행
 * - 같은 도메인(@ 뒤 값) + 회사명이 서로 다른 파트너 → 하나의 회사명으로 통일
 * - 통일 기준: 한국어 > 한국어+영어 > 영어. 띄어쓰기만 다르면 같은 값으로 간주
 */
export async function POST() {
  try {
    const results = await unifyCompanyByDomain();
    const totalUpdated = results.reduce((sum, r) => sum + r.updatedIds.length, 0);
    return NextResponse.json({
      ok: true,
      totalUpdated,
      domainsAffected: results.length,
      details: results.map((r) => ({
        domain: r.domain,
        canonical: r.canonical,
        updatedCount: r.updatedIds.length,
        beforeByPartner: r.beforeByPartner,
      })),
    });
  } catch (e) {
    console.error("[unify-company-by-domain]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
