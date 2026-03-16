/**
 * Confluence 첨부 엑셀에서 파트너 목록을 읽어 Prisma Partner + YearlyEvent와 동일한 형태로 반환.
 * 대시보드/export API에서 기존 조건(필터·정렬·페이지네이션)을 그대로 적용하기 위한 인메모리 데이터.
 */

import { parseSheet, normalizeParsedRows, type ParsedRow } from "@/lib/excel-import";
import { stripCompanySuffix, upperLatin } from "@/lib/company";
import { fetchExcelBuffersFromConfluence } from "@/lib/confluence";

const EMPLOYMENT_STATUS_VALUES = ["이직", "퇴사", "내부이동", "재직"] as const;
function normalizeEmploymentStatus(v: string | undefined): (typeof EMPLOYMENT_STATUS_VALUES)[number] {
  const s = (v ?? "").trim();
  return EMPLOYMENT_STATUS_VALUES.includes(s as (typeof EMPLOYMENT_STATUS_VALUES)[number])
    ? (s as (typeof EMPLOYMENT_STATUS_VALUES)[number])
    : "재직";
}

export interface YearlyEventRow {
  year: number;
  danInvitedRaw: string | null;
  danInviter: string | null;
  giftRecipient: string | null;
  giftItem: string | null;
  giftQtyRaw: string | null;
  giftSender: string | null;
}

export interface PartnerFromConfluence {
  id: string;
  status: string;
  name: string;
  phone: string | null;
  companyNormalized: string;
  department: string | null;
  title: string | null;
  email: string | null;
  workPhone: string | null;
  workFax: string | null;
  address: string | null;
  hq: string | null;
  businessCardDate: Date | null;
  businessCardDateRaw: string | null;
  employmentStatus: string;
  employmentUpdatedAt: Date | null;
  employmentUpdatedAtRaw: string | null;
  history: string | null;
  createdAt: Date;
  updatedAt: Date;
  yearlyEvents: YearlyEventRow[];
}

function stableId(fileIndex: number, rowIndex: number, row: ParsedRow): string {
  const name = (row.name ?? "").trim();
  const company = (row.companyNormalized ?? row.company ?? "").trim();
  const seed = `${fileIndex}-${rowIndex}-${name}-${company}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return `confluence-${Math.abs(h).toString(36)}`;
}

function parsedRowToPartner(row: ParsedRow, id: string, createdAt: Date): PartnerFromConfluence {
  const companyNorm = (row.companyNormalized ?? row.company ?? "").trim();
  const employmentStatus = normalizeEmploymentStatus(row.employmentStatus);
  const years = row.years ?? {};
  const yearlyEvents: YearlyEventRow[] = Object.entries(years).map(([y, ev]) => ({
    year: parseInt(y, 10),
    danInvitedRaw: ev.danInvitedRaw ?? null,
    danInviter: ev.danInviter ?? null,
    giftRecipient: ev.giftRecipient ?? null,
    giftItem: ev.giftItem ?? null,
    giftQtyRaw: ev.giftQtyRaw ?? null,
    giftSender: ev.giftSender ?? null,
  }));

  return {
    id,
    status: "active",
    name: (row.name ?? "").trim() || "(이름 없음)",
    phone: (row.phone ?? "").trim() || null,
    companyNormalized: upperLatin(stripCompanySuffix(companyNorm)) || "",
    department: (row.department ?? "").trim() || null,
    title: (row.title ?? "").trim() || null,
    email: (row.email ?? "").trim() || null,
    workPhone: (row.workPhone ?? "").trim() || null,
    workFax: (row.workFax ?? "").trim() || null,
    address: (row.address ?? "").trim() || null,
    hq: null,
    businessCardDate: null,
    businessCardDateRaw: (row.businessCardDateRaw ?? "").trim() || null,
    employmentStatus,
    employmentUpdatedAt: null,
    employmentUpdatedAtRaw: null,
    history: (row.history ?? "").trim() || null,
    createdAt,
    updatedAt: createdAt,
    yearlyEvents,
  };
}

/**
 * Confluence 페이지의 모든 엑셀 첨부를 파싱해 하나의 파트너 배열로 반환.
 * 회사명 정규화(alias 등)는 호출 측에서 normalizeCompany로 적용.
 */
export async function getPartnersFromConfluence(): Promise<PartnerFromConfluence[]> {
  const buffers = await fetchExcelBuffersFromConfluence();
  if (buffers.length === 0) {
    return [];
  }

  const now = new Date();
  const all: PartnerFromConfluence[] = [];
  let globalRowIndex = 0;

  for (let fileIndex = 0; fileIndex < buffers.length; fileIndex++) {
    const { buffer } = buffers[fileIndex];
    let rows: ParsedRow[];
    try {
      rows = parseSheet(buffer);
    } catch {
      continue;
    }
    const normalized = await normalizeParsedRows(rows);
    for (let r = 0; r < normalized.length; r++) {
      const row = normalized[r];
      const id = stableId(fileIndex, r, row);
      all.push(parsedRowToPartner(row, id, now));
      globalRowIndex++;
    }
  }

  return all;
}

const YEAR_RANGE = { min: 2023, max: 2030 };

export interface PartnerQueryParams {
  page?: number;
  limit?: number;
  employmentStatus?: string;
  name?: string;
  company?: string;
  department?: string;
  title?: string;
  phone?: string;
  email?: string;
  history?: string;
  inviter?: string;
  giftSender?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  dan?: Record<number, boolean>;
  danYn?: Record<number, string>;
  gift?: Record<number, boolean>;
  giftYn?: Record<number, string>;
  idsOnly?: boolean;
  /** 엑셀 export 등: 이 id 목록으로만 필터 */
  ids?: string[];
}

const ALLOWED_SORT_FIELDS = [
  "employmentStatus",
  "companyNormalized",
  "name",
  "phone",
  "department",
  "title",
  "email",
  "address",
  "businessCardDateRaw",
  "history",
  "updatedAt",
] as const;

function matchesEventCondition(
  events: YearlyEventRow[],
  cond: { year?: number; danInvitedRaw?: string; giftRecipient?: string; danInviter?: string; giftSender?: string }
): boolean {
  const ev = events.find((e) => e.year === cond.year);
  if (cond.danInvitedRaw !== undefined && (ev?.danInvitedRaw ?? "") !== cond.danInvitedRaw) return false;
  if (cond.giftRecipient !== undefined && (ev?.giftRecipient ?? "") !== cond.giftRecipient) return false;
  if (cond.danInviter !== undefined && !(ev?.danInviter ?? "").toLowerCase().includes(cond.danInviter.toLowerCase()))
    return false;
  if (cond.giftSender !== undefined && !(ev?.giftSender ?? "").toLowerCase().includes(cond.giftSender.toLowerCase()))
    return false;
  return true;
}

export function filterPartners(
  partners: PartnerFromConfluence[],
  params: PartnerQueryParams
): PartnerFromConfluence[] {
  let list = partners;

  if (params.ids && params.ids.length > 0) {
    const idSet = new Set(params.ids);
    list = list.filter((p) => idSet.has(p.id));
  }

  if (params.employmentStatus) {
    list = list.filter((p) => (p.employmentStatus ?? "").trim() === params.employmentStatus);
  }
  if (params.name) {
    const n = params.name.toLowerCase();
    list = list.filter((p) => (p.name ?? "").toLowerCase().includes(n));
  }
  if (params.company) {
    const c = params.company.toLowerCase();
    list = list.filter((p) => (p.companyNormalized ?? "").toLowerCase().includes(c));
  }
  if (params.department) {
    list = list.filter((p) => (p.department ?? "").includes(params.department!));
  }
  if (params.title) {
    list = list.filter((p) => (p.title ?? "").includes(params.title!));
  }
  if (params.phone) {
    list = list.filter((p) => (p.phone ?? "").includes(params.phone!));
  }
  if (params.email) {
    const e = params.email.toLowerCase();
    list = list.filter((p) => (p.email ?? "").toLowerCase().includes(e));
  }
  if (params.history) {
    list = list.filter((p) => (p.history ?? "").includes(params.history!));
  }
  if (params.inviter) {
    list = list.filter((p) =>
      p.yearlyEvents.some((ev) => (ev.danInviter ?? "").toLowerCase().includes(params.inviter!.toLowerCase()))
    );
  }
  if (params.giftSender) {
    list = list.filter((p) =>
      p.yearlyEvents.some((ev) => (ev.giftSender ?? "").toLowerCase().includes(params.giftSender!.toLowerCase()))
    );
  }

  const eventConditions: Array<{
    year?: number;
    danInvitedRaw?: string;
    giftRecipient?: string;
    danInviter?: string;
    giftSender?: string;
  }> = [];
  for (let year = YEAR_RANGE.min; year <= YEAR_RANGE.max; year++) {
    const yy = year % 100;
    if (params.dan?.[yy] || params.danYn?.[yy] === "Y") eventConditions.push({ year, danInvitedRaw: "Y" });
    if (params.danYn?.[yy] === "N") eventConditions.push({ year, danInvitedRaw: "N" });
    if (params.gift?.[year] || params.giftYn?.[yy] === "Y") eventConditions.push({ year, giftRecipient: "Y" });
    if (params.giftYn?.[yy] === "N") eventConditions.push({ year, giftRecipient: "N" });
  }

  for (const cond of eventConditions) {
    list = list.filter((p) => matchesEventCondition(p.yearlyEvents, cond));
  }

  return list;
}

export function filterSortPaginatePartners(
  partners: PartnerFromConfluence[],
  params: PartnerQueryParams,
  stripCompanySuffixForDisplay: (s: string) => string
): {
  data: PartnerFromConfluence[];
  total: number;
  page: number;
  limit: number;
} {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const sortBy = ALLOWED_SORT_FIELDS.includes((params.sortBy ?? "updatedAt") as (typeof ALLOWED_SORT_FIELDS)[number])
    ? params.sortBy!
    : "updatedAt";
  const sortOrder = (params.sortOrder ?? "desc") === "asc" ? "asc" : "desc";

  const filtered = filterPartners(partners, params);
  const total = filtered.length;

  let sorted = [...filtered];
  const field = sortBy as (typeof ALLOWED_SORT_FIELDS)[number];
  if (field === "companyNormalized") {
    sorted.sort((a, b) => {
      const da = stripCompanySuffixForDisplay(a.companyNormalized ?? "");
      const db = stripCompanySuffixForDisplay(b.companyNormalized ?? "");
      const c = da.localeCompare(db, "ko");
      return sortOrder === "asc" ? c : -c;
    });
  } else {
    sorted.sort((a, b) => {
      const aVal = a[field] ?? "";
      const bVal = b[field] ?? "";
      const aStr = typeof aVal === "string" ? aVal : aVal instanceof Date ? aVal.getTime() : String(aVal);
      const bStr = typeof bVal === "string" ? bVal : bVal instanceof Date ? bVal.getTime() : String(bVal);
      const c = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      return sortOrder === "asc" ? c : -c;
    });
  }

  const data = sorted.slice((page - 1) * limit, (page - 1) * limit + limit);
  return { data, total, page, limit };
}

/** searchParams에서 이벤트 필터(dan23, dan23Yn, gift2024 등) 추출 */
export function eventParamsFromSearchParams(searchParams: URLSearchParams): Partial<PartnerQueryParams> {
  const dan: Record<number, boolean> = {};
  const danYn: Record<number, string> = {};
  const gift: Record<number, boolean> = {};
  const giftYn: Record<number, string> = {};
  for (let year = YEAR_RANGE.min; year <= YEAR_RANGE.max; year++) {
    const yy = year % 100;
    if (searchParams.get(`dan${yy}`) === "true") dan[yy] = true;
    const dy = searchParams.get(`dan${yy}Yn`) ?? "";
    if (dy) danYn[yy] = dy;
    if (searchParams.get(`gift${year}`) === "true") gift[year] = true;
    const gy = searchParams.get(`gift${yy}Yn`) ?? "";
    if (gy) giftYn[yy] = gy;
  }
  return {
    dan: Object.keys(dan).length ? dan : undefined,
    danYn: Object.keys(danYn).length ? danYn : undefined,
    gift: Object.keys(gift).length ? gift : undefined,
    giftYn: Object.keys(giftYn).length ? giftYn : undefined,
    inviter: (searchParams.get("inviter") ?? "").trim() || undefined,
    giftSender: (searchParams.get("giftSender") ?? "").trim() || undefined,
  };
}
