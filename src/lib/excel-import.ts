import * as XLSX from "xlsx";
import { normalizeCompany, upperLatin } from "./company";

/** 요구사항 고정 헤더 순서 (명함 등록일 다음에 히스토리) */
export const EXCEL_HEADERS = [
  "이름",
  "휴대폰",
  "회사",
  "부서",
  "직함",
  "전자 메일",
  "근무처 전화",
  "근무처 팩스",
  "근무지 주소",
  "명함 등록일",
  "히스토리",
  "DAN23 초청여부",
  "DAN23 초청인",
  "DAN24 초청여부",
  "DAN24 초청인",
  "DAN25 초청여부",
  "DAN25 초청인",
  "24년 선물수신인",
  "24년 선물품목",
  "24년 선물발송개수",
  "24년 선물발송인",
  "25년 선물수신인",
  "25년 선물품목",
  "25년 선물발송개수",
  "25년 선물발송인",
] as const;

const HEADER_TO_KEY: Record<string, string> = {
  "이름": "name",
  "휴대폰": "phone",
  "회사": "company",
  "부서": "department",
  "직함": "title",
  "전자 메일": "email",
  "근무처 전화": "workPhone",
  "근무처 팩스": "workFax",
  "근무지 주소": "address",
  "명함 등록일": "businessCardDateRaw",
  "히스토리": "history",
  "DAN23 초청여부": "2023_danInvitedRaw",
  "DAN23 초청인": "2023_danInviter",
  "DAN24 초청여부": "2024_danInvitedRaw",
  "DAN24 초청인": "2024_danInviter",
  "DAN25 초청여부": "2025_danInvitedRaw",
  "DAN25 초청인": "2025_danInviter",
  "24년 선물수신인": "2024_giftRecipient",
  "24년 선물품목": "2024_giftItem",
  "24년 선물발송개수": "2024_giftQtyRaw",
  "24년 선물발송인": "2024_giftSender",
  "25년 선물수신인": "2025_giftRecipient",
  "25년 선물품목": "2025_giftItem",
  "25년 선물발송개수": "2025_giftQtyRaw",
  "25년 선물발송인": "2025_giftSender",
};

function toYear(nn: string): number {
  const n = parseInt(nn, 10);
  return n >= 0 && n < 100 ? 2000 + n : n;
}

function mapHeader(header: string): string | null {
  let trimmed = String(header ?? "").trim();
  if (trimmed.charCodeAt(0) === 0xfeff) trimmed = trimmed.slice(1).trim();
  if (!trimmed) return null;
  if (HEADER_TO_KEY[trimmed]) return HEADER_TO_KEY[trimmed];
  const normalized = trimmed.replace(/\s/g, "").toLowerCase();
  for (const [h, key] of Object.entries(HEADER_TO_KEY)) {
    if (h.replace(/\s/g, "").toLowerCase() === normalized) return key;
  }
  const danInvited = trimmed.match(/^DAN\s*(\d+)\s*초청여부$/i);
  if (danInvited) return `${toYear(danInvited[1])}_danInvitedRaw`;
  const danInviter = trimmed.match(/^DAN\s*(\d+)\s*초청인$/i);
  if (danInviter) return `${toYear(danInviter[1])}_danInviter`;
  const giftRecipient = trimmed.match(/^(\d+)\s*년\s*선물수신인$/);
  if (giftRecipient) return `${toYear(giftRecipient[1])}_giftRecipient`;
  const giftItem = trimmed.match(/^(\d+)\s*년\s*선물품목$/);
  if (giftItem) return `${toYear(giftItem[1])}_giftItem`;
  const giftQty = trimmed.match(/^(\d+)\s*년\s*선물발송개수$/);
  if (giftQty) return `${toYear(giftQty[1])}_giftQtyRaw`;
  const giftSender = trimmed.match(/^(\d+)\s*년\s*선물발송인$/);
  if (giftSender) return `${toYear(giftSender[1])}_giftSender`;
  return null;
}

export interface ParsedRow {
  name?: string;
  phone?: string;
  company?: string;
  companyNormalized?: string;
  department?: string;
  title?: string;
  email?: string;
  workPhone?: string;
  workFax?: string;
  address?: string;
  businessCardDateRaw?: string;
  history?: string;
  years?: Record<
    number,
    {
      danInvitedRaw?: string;
      danInviter?: string;
      giftRecipient?: string;
      giftItem?: string;
      giftQtyRaw?: string;
      giftSender?: string;
    }
  >;
}

function toStorage(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

export function parseSheet(buffer: ArrayBuffer): ParsedRow[] {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "array", cellDates: false, cellNF: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`엑셀 파일을 읽을 수 없습니다. (xlsx/xls 형식인지 확인해 주세요.) ${msg}`);
  }
  if (!wb.SheetNames?.length) {
    throw new Error("엑셀 파일에 시트가 없습니다.");
  }
  const first = wb.SheetNames[0];
  const ws = wb.Sheets[first];
  if (!ws) {
    throw new Error("첫 번째 시트를 읽을 수 없습니다.");
  }
  let data: unknown[][];
  try {
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false });
    data = Array.isArray(raw) ? raw.map((r) => (Array.isArray(r) ? r : [r])) : [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`시트 데이터 변환 실패: ${msg}`);
  }
  if (data.length < 1) {
    return [];
  }
  const rawHeaders = Array.isArray(data[0]) ? (data[0] as string[]) : [];
  const colMap: Record<number, string> = {};
  rawHeaders.forEach((h, i) => {
    const key = mapHeader(String(h ?? ""));
    if (key) colMap[i] = key;
  });
  const rows: ParsedRow[] = [];
  for (let r = 1; r < data.length; r++) {
    const rawRow = data[r];
    const row = Array.isArray(rawRow) ? rawRow : [];
    const out: ParsedRow = {};
    const years: ParsedRow["years"] = {};
    for (let c = 0; c < row.length; c++) {
      const key = colMap[c];
      if (!key) continue;
      const val = row[c];
      const strVal = toStorage(val) ?? "";
      const yearPrefix = key.match(/^(\d{4})_/);
      if (yearPrefix) {
        const y = parseInt(yearPrefix[1], 10);
        if (!years[y]) years[y] = {};
        const suffix = key.slice(5);
        if (suffix === "danInvitedRaw") years[y].danInvitedRaw = strVal || undefined;
        else if (suffix === "danInviter") years[y].danInviter = strVal || undefined;
        else if (suffix === "giftRecipient") years[y].giftRecipient = strVal || undefined;
        else if (suffix === "giftItem") years[y].giftItem = strVal || undefined;
        else if (suffix === "giftQtyRaw") years[y].giftQtyRaw = strVal || undefined;
        else if (suffix === "giftSender") years[y].giftSender = strVal || undefined;
      } else {
        (out as Record<string, unknown>)[key] = strVal || undefined;
      }
    }
    if (Object.keys(years).length) out.years = years;
    rows.push(out);
  }
  return rows;
}

export async function normalizeParsedRows(rows: ParsedRow[]): Promise<ParsedRow[]> {
  const out: ParsedRow[] = [];
  for (const row of rows) {
    const n = { ...row };
    const companyRaw = (row.company ?? "").trim() || "";
    if (companyRaw || row.email) {
      const { normalized } = await normalizeCompany(companyRaw, row.email ?? undefined);
      n.companyNormalized = normalized || upperLatin(companyRaw);
    }
    out.push(n);
  }
  return out;
}

export interface MergeDiffItem {
  action: "create" | "update";
  partnerId?: string;
  matchKey: string;
  changes?: string[];
  partner?: ParsedRow & { companyNormalized?: string };
  yearlyEvents?: Array<{
    year: number;
    danInvitedRaw?: string;
    danInviter?: string;
    giftRecipient?: string;
    giftItem?: string;
    giftQtyRaw?: string;
    giftSender?: string;
  }>;
}

export type MergeDiff = MergeDiffItem[];
