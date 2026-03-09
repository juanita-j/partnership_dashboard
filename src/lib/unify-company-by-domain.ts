import { prisma } from "@/lib/prisma";
import { upperLatin } from "./company";

/** 이메일에서 @ 뒤 도메인 추출 */
function getEmailDomain(email: string | null | undefined): string | null {
  if (!email || typeof email !== "string") return null;
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at === -1) return null;
  return trimmed.slice(at + 1).toLowerCase();
}

/** 띄어쓰기 무시한 동일 여부용 키 (같은 값으로 봄) */
function companyKey(s: string): string {
  return (s ?? "").trim().replace(/\s+/g, "");
}

function hasHangul(s: string): boolean {
  return /[\u3131-\uD7A3]/.test(s);
}

function hasLatin(s: string): boolean {
  return /[a-zA-Z]/.test(s);
}

/** 회사명 분류: 한국어만 / 한국어+영어 / 영어만. 통일 우선순위에 사용 */
function classifyCompany(name: string): "korean" | "korean+english" | "english" {
  const n = (name ?? "").trim();
  if (!n) return "english";
  const hangul = hasHangul(n);
  const latin = hasLatin(n);
  if (hangul && !latin) return "korean";
  if (hangul && latin) return "korean+english";
  return "english";
}

const PRIORITY: Record<"korean" | "korean+english" | "english", number> = {
  korean: 3,
  "korean+english": 2,
  english: 1,
};

/**
 * 동일 도메인 내 서로 다른 회사명 후보 중 통일값 하나 선택
 * 규칙: 한국어 > 한국어+영어 > 영어. 띄어쓰기만 다른 건 이미 하나로 묶인 뒤보임.
 */
function pickCanonicalCompany(candidates: string[]): string {
  if (candidates.length === 0) return "";
  if (candidates.length === 1) return candidates[0];
  let best = candidates[0];
  let bestPriority = PRIORITY[classifyCompany(best)];
  for (let i = 1; i < candidates.length; i++) {
    const p = PRIORITY[classifyCompany(candidates[i])];
    if (p > bestPriority) {
      best = candidates[i];
      bestPriority = p;
    }
  }
  return best;
}

export type UnifyResult = {
  domain: string;
  canonical: string;
  updatedIds: string[];
  beforeByPartner: Record<string, string>;
};

/**
 * 이메일 도메인별로 회사명이 서로 다른 파트너들의 회사명을 하나로 통일한다.
 * - 동일 도메인 + 회사명 다름 → 통일 (띄어쓰기만 다르면 같은 값으로 간주)
 * - 통일값: 한국어 > 한국어+영어 > 영어
 */
export async function unifyCompanyByDomain(): Promise<UnifyResult[]> {
  const partners = await prisma.partner.findMany({
    where: {
      email: { not: null, contains: "@" },
    },
    select: { id: true, email: true, companyNormalized: true },
  });

  const byDomain = new Map<string, { id: string; companyNormalized: string }[]>();
  for (const p of partners) {
    const domain = getEmailDomain(p.email);
    if (!domain) continue;
    const company = (p.companyNormalized ?? "").trim();
    if (!company) continue;
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)!.push({ id: p.id, companyNormalized: company });
  }

  const results: UnifyResult[] = [];

  for (const [domain, list] of byDomain.entries()) {
    const keyToRepresentative = new Map<string, string>();
    for (const { companyNormalized } of list) {
      const key = companyKey(companyNormalized);
      if (!keyToRepresentative.has(key)) {
        keyToRepresentative.set(key, companyNormalized);
      }
    }
    const distinctValues = Array.from(keyToRepresentative.values());
    if (distinctValues.length <= 1) continue;

    const canonical = pickCanonicalCompany(distinctValues);
    const canonicalNorm = upperLatin(canonical);

    const toUpdate = list.filter(({ companyNormalized }) => companyKey(companyNormalized) !== companyKey(canonical));
    if (toUpdate.length === 0) continue;

    const beforeByPartner: Record<string, string> = {};
    for (const { id, companyNormalized } of toUpdate) {
      beforeByPartner[id] = companyNormalized;
    }

    await prisma.partner.updateMany({
      where: { id: { in: toUpdate.map((x) => x.id) } },
      data: { companyNormalized: canonicalNorm },
    });

    results.push({
      domain,
      canonical: canonicalNorm,
      updatedIds: toUpdate.map((x) => x.id),
      beforeByPartner,
    });
  }

  return results;
}
