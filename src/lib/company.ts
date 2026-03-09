import Fuse from "fuse.js";
import { prisma } from "@/lib/prisma";

const FUZZY_THRESHOLD = 0.6;

/** 영문 알파벳이 포함된 경우 소문자를 대문자로 통일 (회사명 저장/표시용) */
export function upperLatin(name: string): string {
  if (!name || typeof name !== "string") return name;
  return name.replace(/[a-z]/g, (ch) => ch.toUpperCase());
}

/** 회사명 맨 끝의 법인 표기 제거: (주), 주식회사, Corp, Inc, PLC, LLC, Co., LTD 등 */
export function stripCompanySuffix(name: string): string {
  if (!name || typeof name !== "string") return name;
  let t = name.trim();
  // 한글: (주), 주식회사
  const koreanSuffixRe = /\s*(\(\s*주\s*\)|주식회사)\s*$/;
  while (koreanSuffixRe.test(t)) {
    t = t.replace(koreanSuffixRe, "").trim();
  }
  // 영문: Corp, Inc, PLC, LLC, Co., LTD 등
  const suffixRe = /\s*,?\s*(Corp\.?|Inc\.?|PLC|L\.?L\.?C\.?|LLC|Co\.|LTD\.?|Ltd\.?)\s*$/i;
  while (suffixRe.test(t)) {
    t = t.replace(suffixRe, "").trim();
  }
  return t;
}

function normalizeRaw(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\u3131-\uD7A3]/g, "")
    .trim()
    .toLowerCase();
}

function getEmailDomain(email: string | null | undefined): string | null {
  if (!email || typeof email !== "string") return null;
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at === -1) return null;
  return trimmed.slice(at + 1).toLowerCase();
}

function hasHangul(s: string): boolean {
  return /[\u3131-\uD7A3]/.test(s);
}

function isKoreanDomain(domain: string): boolean {
  return domain.endsWith(".co.kr") || domain.endsWith(".kr") || domain === "naver.com" || domain === "kakao.com";
}

/** 같은 도메인 내 회사명 후보들 중 통일 규칙에 맞는 하나를 선택 */
export function pickCanonicalCompanyName(names: string[], emailDomain?: string | null): string {
  const set = new Set<string>();
  for (const n of names) {
    const t = (n ?? "").trim();
    if (t) set.add(t);
  }
  const list = Array.from(set);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];

  const hasKorean = list.some(hasHangul);

  const withoutKorea = list.map((name) => {
    const lower = name.toLowerCase();
    const noKorea = name
      .replace(/\s*코리아\s*$/i, "")
      .replace(/\s*korea\s*$/i, "")
      .trim();
    return noKorea || name;
  });

  let candidates = list;

  const withGroup = list.filter((n) => /그룹/.test(n));
  if (withGroup.length > 0) {
    candidates = withGroup;
  }

  const withSpaces = candidates.filter((n) => {
    const words = n.split(/\s+/).filter(Boolean);
    if (words.length < 2) return false;
    const noSpaces = n.replace(/\s/g, "");
    return candidates.some((other) => other !== n && other.replace(/\s/g, "") === noSpaces);
  });
  if (withSpaces.length > 0) {
    candidates = withSpaces;
  }

  const noKoreaInCandidates = candidates.filter((n) => {
    const lower = n.toLowerCase();
    return !lower.includes("코리아") && !lower.includes("korea");
  });
  if (noKoreaInCandidates.length > 0) {
    candidates = noKoreaInCandidates;
  }

  const koreanOnly = candidates.filter(hasHangul);
  const englishOnly = candidates.filter((n) => !hasHangul(n));
  // 영어·한국어 둘 다 있으면 항상 한국어 회사명으로 통일
  if (koreanOnly.length > 0 && englishOnly.length > 0) {
    candidates = koreanOnly;
  }

  return candidates[0] ?? list[0];
}

let aliasCache: { normalizedName: string; alias: string }[] | null = null;

async function getAliases(): Promise<{ normalizedName: string; alias: string }[]> {
  if (aliasCache) return aliasCache;
  const rows = await prisma.companyAlias.findMany({
    select: { normalizedName: true, alias: true },
  });
  aliasCache = rows;
  return rows;
}

/** 도메인으로 파트너들의 회사명을 조회한 뒤, 통일 규칙 적용한 이름 반환 */
export async function getCanonicalCompanyForDomain(
  domain: string,
  currentCompany: string
): Promise<string> {
  const partners = await prisma.partner.findMany({
    where: {
      AND: [{ email: { not: null } }, { email: { contains: "@" + domain } }],
    },
    select: { companyNormalized: true },
  });
  const names = partners
    .map((p) => (p.companyNormalized ?? "").trim())
    .filter(Boolean);
  if (!currentCompany.trim()) {
    return pickCanonicalCompanyName(names, domain);
  }
  const all = [...new Set([...names, currentCompany.trim()])];
  return pickCanonicalCompanyName(all, domain);
}

export async function normalizeCompany(
  rawName: string,
  email?: string | null
): Promise<{
  normalized: string;
  needsMapping: boolean;
}> {
  if (!rawName || typeof rawName !== "string") {
    return { normalized: "", needsMapping: false };
  }
  const cleaned = stripCompanySuffix(rawName.trim());
  const key = normalizeRaw(cleaned);
  if (!key) {
    if (email) {
      const domain = getEmailDomain(email);
      if (domain) {
        const canonical = await getCanonicalCompanyForDomain(domain, cleaned);
        if (canonical) return { normalized: upperLatin(canonical), needsMapping: false };
      }
    }
    return { normalized: upperLatin(cleaned), needsMapping: false };
  }

  const aliases = await getAliases();
  const exact = aliases.find(
    (a) => normalizeRaw(a.alias) === key || a.alias.trim().toLowerCase() === cleaned.toLowerCase()
  );
  // 회사명 매핑 리스트에 있는 경우에만 표준명으로 변환. 없으면 엑셀/입력값 그대로 사용
  const normalized = exact ? exact.normalizedName : cleaned;

  return { normalized: upperLatin(normalized), needsMapping: !exact };
}

export function invalidateCompanyAliasCache() {
  aliasCache = null;
}
