"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { FilterState, OptionalColumnId } from "@/app/dashboard/types";
import { FIXED_COLUMN_IDS, OPTIONAL_COLUMN_IDS, EMPLOYMENT_STATUS_VALUES } from "@/app/dashboard/types";
import { stripCompanySuffixForDisplay } from "@/lib/company-display";
import { toast } from "sonner";

type PartnerRow = {
  id: string;
  status: string;
  name: string;
  phone: string | null;
  companyNormalized: string;
  department: string | null;
  title: string | null;
  email: string | null;
  address: string | null;
  hq: string | null;
  businessCardDateRaw: string | null;
  employmentStatus: string | null;
  history: string | null;
  eventsByYear: Record<
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
};

interface PartnersTableProps {
  filters: FilterState;
  eventYears: number[];
  refreshKey: number;
  onSelectPartner: (id: string | null) => void;
  onRefresh?: () => void;
  canEdit: boolean;
  /** SHOW 칼럼 표시용 (미전달 시 filters 사용). 적용 버튼 없이 즉시 반영 */
  displayShowColumns?: FilterState["showColumns"];
  displayShowEventYears?: number[];
  /** API 베이스. 기본 `/api`, 임원진은 `/api/executive` */
  apiRoot?: string;
}

/** 헤더 colId → API sortBy 필드명 */
const COL_ID_TO_SORT_FIELD: Record<string, string> = {
  employmentStatus: "employmentStatus",
  company: "companyNormalized",
  name: "name",
  phone: "phone",
  department: "department",
  title: "title",
  email: "email",
  address: "address",
  businessCardDate: "businessCardDateRaw",
  history: "history",
};

function buildQuery(f: FilterState, page: number, eventYears: number[], sortBy: string, sortOrder: "asc" | "desc"): string {
  const p = new URLSearchParams();
  if (f.employmentStatus) p.set("employmentStatus", f.employmentStatus);
  if (f.name) p.set("name", f.name);
  if (f.company) p.set("company", f.company);
  if (f.department) p.set("department", f.department);
  if (f.title) p.set("title", f.title);
  if (f.phone) p.set("phone", f.phone);
  if (f.email) p.set("email", f.email);
  if (f.history) p.set("history", f.history);
  for (const year of eventYears) {
    const yy = year % 100;
    if (f[`dan${yy}`]) p.set(`dan${yy}`, "true");
    if (f[`dan${yy}Yn`]) p.set(`dan${yy}Yn`, String(f[`dan${yy}Yn`]));
    if (f[`gift${year}`]) p.set(`gift${year}`, "true");
    if (f[`gift${yy}Yn`]) p.set(`gift${yy}Yn`, String(f[`gift${yy}Yn`]));
  }
  if (f.inviter) p.set("inviter", f.inviter);
  if (f.giftSender) p.set("giftSender", f.giftSender);
  p.set("page", String(page));
  p.set("limit", "50");
  if (sortBy) p.set("sortBy", sortBy);
  p.set("sortOrder", sortOrder);
  return p.toString();
}

/** 현재 필터 기준 전체 ID 조회용 쿼리 (idsOnly=true) */
function buildIdsOnlyQuery(f: FilterState, eventYears: number[], sortBy: string, sortOrder: "asc" | "desc"): string {
  const p = new URLSearchParams();
  if (f.employmentStatus) p.set("employmentStatus", f.employmentStatus);
  if (f.name) p.set("name", f.name);
  if (f.company) p.set("company", f.company);
  if (f.department) p.set("department", f.department);
  if (f.title) p.set("title", f.title);
  if (f.phone) p.set("phone", f.phone);
  if (f.email) p.set("email", f.email);
  if (f.history) p.set("history", f.history);
  for (const year of eventYears) {
    const yy = year % 100;
    if (f[`dan${yy}`]) p.set(`dan${yy}`, "true");
    if (f[`dan${yy}Yn`]) p.set(`dan${yy}Yn`, String(f[`dan${yy}Yn`]));
    if (f[`gift${year}`]) p.set(`gift${year}`, "true");
    if (f[`gift${yy}Yn`]) p.set(`gift${yy}Yn`, String(f[`gift${yy}Yn`]));
  }
  if (f.inviter) p.set("inviter", f.inviter);
  if (f.giftSender) p.set("giftSender", f.giftSender);
  p.set("idsOnly", "true");
  if (sortBy) p.set("sortBy", sortBy);
  p.set("sortOrder", sortOrder);
  return p.toString();
}

const FIXED_HEADERS: { id: (typeof FIXED_COLUMN_IDS)[number]; label: string }[] = [
  { id: "employmentStatus", label: "재직상태" },
  { id: "company", label: "회사" },
  { id: "name", label: "이름" },
  { id: "phone", label: "휴대폰" },
  { id: "department", label: "부서" },
  { id: "title", label: "직함" },
  { id: "email", label: "전자 메일" },
  { id: "address", label: "근무지 주소" },
];

const OPTIONAL_HEADERS: { id: OptionalColumnId; label: string }[] = [
  { id: "businessCardDate", label: "명함 등록일" },
  { id: "history", label: "히스토리" },
  { id: "danInvited", label: "DAN초청여부" },
  { id: "inviter", label: "DAN초청인" },
  { id: "giftRecipient", label: "선물수신여부" },
  { id: "giftItem", label: "선물품목" },
  { id: "giftQty", label: "선물발송개수" },
  { id: "giftSender", label: "선물발송인" },
];

const DAN_INVITED_COL_IDS = ["dan23Invited", "dan24Invited", "dan25Invited", "dan26Invited"] as const;
function buildDanHeaders(eventYears: number[]): { id: string; label: string }[] {
  return eventYears.flatMap((y) => {
    const yy = y % 100;
    return [
      { id: `dan${yy}Invited`, label: `DAN${yy} 초청여부` },
      { id: `dan${yy}Inviter`, label: `DAN${yy} 초청인` },
    ];
  });
}
function buildGiftHeaders(eventYears: number[]): { id: string; label: string }[] {
  return eventYears.flatMap((y) => {
    const yy = y % 100;
    return [
      { id: `gift${yy}Recipient`, label: `${yy}년 선물수신인` },
      { id: `gift${yy}Item`, label: `${yy}년 선물품목` },
      { id: `gift${yy}Qty`, label: `${yy}년 선물발송개수` },
      { id: `gift${yy}Sender`, label: `${yy}년 선물발송인` },
    ];
  });
}
function buildOptionalColIdArrays(eventYears: number[]) {
  return {
    DAN_INVITED_COL_IDS: eventYears.map((y) => `dan${y % 100}Invited`),
    INVITER_COL_IDS: eventYears.map((y) => `dan${y % 100}Inviter`),
    GIFT_RECIPIENT_COL_IDS: eventYears.map((y) => `gift${y % 100}Recipient`),
    GIFT_ITEM_COL_IDS: eventYears.map((y) => `gift${y % 100}Item`),
    GIFT_QTY_COL_IDS: eventYears.map((y) => `gift${y % 100}Qty`),
    GIFT_SENDER_COL_IDS: eventYears.map((y) => `gift${y % 100}Sender`),
  };
}

const DAN_YN_OPTIONS = ["", "Y", "N"];
const GIFT_YN_OPTIONS = ["", "Y", "N"];

/** Y/N·숫자만 나오는 컬럼은 좁게, 회사/이름은 넓게, 휴대폰/부서/직함/전자메일/주소는 넓히고 줄바꿈 방지. SHOW 옵션 컬럼은 기본 너비를 넓게 고정해 라벨 겹침 방지 */
function getColWidthClass(colId: string): string {
  if (colId === "company" || colId === "name") return "min-w-[7.5rem]";
  if (colId === "phone") return "min-w-[6.5rem] whitespace-nowrap";
  if (colId === "department" || colId === "title") return "min-w-[5rem] whitespace-nowrap";
  if (colId === "email") return "min-w-[8rem] whitespace-nowrap";
  if (colId === "address") return "min-w-[9rem] whitespace-nowrap";
  /* 초청여부·초청인·선물수신·품목·발송개수·발송인: 고정 너비로 겹침 방지 */
  if (/^dan\d+Invited$/.test(colId)) return "w-[7rem] min-w-[7rem] whitespace-nowrap";
  if (/^dan\d+Inviter$/.test(colId)) return "w-[6.5rem] min-w-[6.5rem] whitespace-nowrap";
  if (/^gift\d+Recipient$/.test(colId)) return "w-[7rem] min-w-[7rem] whitespace-nowrap";
  if (/^gift\d+Item$/.test(colId)) return "w-[6.5rem] min-w-[6.5rem] whitespace-nowrap";
  if (/^gift\d+Qty$/.test(colId)) return "w-[8rem] min-w-[8rem] whitespace-nowrap";
  if (/^gift\d+Sender$/.test(colId)) return "w-[7rem] min-w-[7rem] whitespace-nowrap";
  return "";
}

function isNarrowCol(colId: string): boolean {
  return /^dan\d+Invited$/.test(colId) || /^gift\d+Recipient$/.test(colId) || /^gift\d+Qty$/.test(colId);
}

/** 휴대폰/부서/직함/이메일/주소는 getColWidthClass에 이미 whitespace-nowrap 포함 */
function cellClassName(colId: string): string {
  const w = getColWidthClass(colId);
  if (!w) return "";
  return w.includes("whitespace-nowrap") ? w : `${w}${isNarrowCol(colId) ? " whitespace-nowrap" : ""}`;
}

function colIdToPartnerField(colId: string): string | null {
  const map: Record<string, string> = {
    company: "companyNormalized",
    name: "name",
    phone: "phone",
    department: "department",
    title: "title",
    email: "email",
    address: "address",
    businessCardDate: "businessCardDateRaw",
  };
  return map[colId] ?? null;
}

function colIdToEventYearAndField(colId: string): { year: number; field: string } | null {
  const danInvited = colId.match(/^dan(\d{2})Invited$/);
  if (danInvited) return { year: 2000 + parseInt(danInvited[1], 10), field: "danInvitedRaw" };
  const danInviter = colId.match(/^dan(\d{2})Inviter$/);
  if (danInviter) return { year: 2000 + parseInt(danInviter[1], 10), field: "danInviter" };
  const gift = colId.match(/^gift(\d{2})(Recipient|Item|Qty|Sender)$/);
  if (gift) {
    const year = 2000 + parseInt(gift[1], 10);
    const f = gift[2];
    const field = f === "Recipient" ? "giftRecipient" : f === "Item" ? "giftItem" : f === "Qty" ? "giftQtyRaw" : "giftSender";
    return { year, field };
  }
  return null;
}

function getCellValue(p: PartnerRow, colId: string): string {
  const eventInfo = colIdToEventYearAndField(colId);
  if (eventInfo) return p.eventsByYear?.[eventInfo.year]?.[eventInfo.field as keyof NonNullable<PartnerRow["eventsByYear"][number]>] ?? "";
  switch (colId) {
    case "employmentStatus":
      return p.employmentStatus ?? "";
    case "name": {
      const n = p.name ?? "";
      return n === "(이름없음)" ? "" : n;
    }
    case "company":
      return stripCompanySuffixForDisplay(p.companyNormalized ?? "");
    case "phone":
      return p.phone ?? "";
    case "department":
      return p.department ?? "";
    case "title":
      return p.title ?? "";
    case "email":
      return p.email ?? "";
    case "address":
      return p.address ?? "";
    case "businessCardDate":
      return p.businessCardDateRaw ?? "";
    case "history":
      return p.history ?? "";
    default:
      return "";
  }
}

export function PartnersTable({
  filters,
  eventYears,
  refreshKey,
  onSelectPartner,
  onRefresh,
  canEdit,
  displayShowColumns,
  displayShowEventYears,
  apiRoot = "/api",
}: PartnersTableProps) {
  const [data, setData] = useState<PartnerRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingHistoryValue, setEditingHistoryValue] = useState("");
  const [editingCell, setEditingCell] = useState<{ partnerId: string; colId: string } | null>(null);
  const [editingOriginalValue, setEditingOriginalValue] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllOpen, setSelectAllOpen] = useState(false);
  const [selectAllPagesLoading, setSelectAllPagesLoading] = useState(false);
  const selectAllTriggerRef = useRef<HTMLButtonElement>(null);
  const selectAllMenuRef = useRef<HTMLDivElement>(null);
  const lastFetchedQueryRef = useRef<string | null>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<{ colId: string; startX: number; startW: number } | null>(null);
  const [resizeCursorX, setResizeCursorX] = useState<number | null>(null);

  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => {
      setResizeCursorX(e.clientX);
      setColWidths((prev) => ({
        ...prev,
        [resizing.colId]: Math.max(32, resizing.startW + (e.clientX - resizing.startX)),
      }));
    };
    const up = () => {
      setResizing(null);
      setResizeCursorX(null);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setResizeCursorX(null);
    };
  }, [resizing]);

  const handleResizeStart = (colId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.target as HTMLElement).closest("th");
    const w = th ? th.getBoundingClientRect().width : 80;
    setResizeCursorX(e.clientX);
    setResizing({ colId, startX: e.clientX, startW: colWidths[colId] ?? w });
  };

  const getDefaultColWidthPx = (colId: string): number => {
    if (colId === "employmentStatus") return 90;
    if (colId === "company" || colId === "name") return 120;
    if (colId === "phone") return 104;
    if (colId === "department" || colId === "title") return 80;
    if (colId === "email") return 128;
    if (colId === "address") return 144;
    if (/^dan\d+Invited$/.test(colId)) return 112;
    if (/^dan\d+Inviter$/.test(colId)) return 104;
    if (/^gift\d+Recipient$/.test(colId)) return 112;
    if (/^gift\d+Item$/.test(colId)) return 104;
    if (/^gift\d+Qty$/.test(colId)) return 128;
    if (/^gift\d+Sender$/.test(colId)) return 112;
    if (colId === "businessCardDate") return 110;
    if (colId === "history") return 120;
    return 100;
  };

  const getColStyle = (colId: string) => {
    const w = colWidths[colId] ?? getDefaultColWidthPx(colId);
    return { width: w, minWidth: w, maxWidth: w };
  };

  useEffect(() => {
    if (!selectAllOpen) return;
    const close = (e: MouseEvent) => {
      if (
        selectAllTriggerRef.current?.contains(e.target as Node) ||
        selectAllMenuRef.current?.contains(e.target as Node)
      )
        return;
      setSelectAllOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [selectAllOpen]);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (colId: string) => {
    const field = COL_ID_TO_SORT_FIELD[colId];
    if (!field) return;
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const cancelCellEdit = () => {
    if (!editingCell) return;
    const { partnerId, colId } = editingCell;
    const orig = editingOriginalValue ?? "";
    setData((list) =>
      list.map((r) => {
        if (r.id !== partnerId) return r;
        if (colId === "employmentStatus") return { ...r, employmentStatus: orig };
        const pf = colIdToPartnerField(colId);
        if (pf) return { ...r, [pf]: orig };
        return r;
      })
    );
    setEditingCell(null);
    setEditingOriginalValue(null);
  };

  const effectiveShowColumns = displayShowColumns ?? filters.showColumns;
  const effectiveShowEventYears = displayShowEventYears ?? filters.showEventYears;
  const displayEventYears = (effectiveShowEventYears?.length ? effectiveShowEventYears : eventYears) as number[];
  const DAN_HEADERS = buildDanHeaders(eventYears);
  const GIFT_HEADERS = buildGiftHeaders(eventYears);
  const { DAN_INVITED_COL_IDS, INVITER_COL_IDS, GIFT_RECIPIENT_COL_IDS, GIFT_ITEM_COL_IDS, GIFT_QTY_COL_IDS, GIFT_SENDER_COL_IDS } = buildOptionalColIdArrays(displayEventYears);
  const DAN_HEADERS_DISPLAY = buildDanHeaders(displayEventYears);
  const GIFT_HEADERS_DISPLAY = buildGiftHeaders(displayEventYears);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, refreshKey]);

  useEffect(() => {
    setLoading(true);
    const q = buildQuery(filters, currentPage, eventYears, sortBy, sortOrder);
    fetch(`${apiRoot}/partners?${q}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setData(res.data);
        if (res.pagination) setPagination(res.pagination);
        lastFetchedQueryRef.current = q;
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [filters, refreshKey, currentPage, eventYears, sortBy, sortOrder, apiRoot]);

  const showOptional = OPTIONAL_HEADERS.filter((h) => effectiveShowColumns.includes(h.id));
  const nonEventExpanded = showOptional
    .filter((h) => h.id === "businessCardDate" || h.id === "history")
    .map((h) => ({ id: h.id, label: h.label }));
  const eventExpandedOrder: { id: string; label: string }[] = [];
  for (const year of displayEventYears) {
    const yy = year % 100;
    if (effectiveShowColumns.includes("danInvited")) eventExpandedOrder.push({ id: `dan${yy}Invited`, label: DAN_HEADERS_DISPLAY.find((d) => d.id === `dan${yy}Invited`)!.label });
    if (effectiveShowColumns.includes("inviter")) eventExpandedOrder.push({ id: `dan${yy}Inviter`, label: DAN_HEADERS_DISPLAY.find((d) => d.id === `dan${yy}Inviter`)!.label });
    if (effectiveShowColumns.includes("giftRecipient")) eventExpandedOrder.push({ id: `gift${yy}Recipient`, label: GIFT_HEADERS_DISPLAY.find((g) => g.id === `gift${yy}Recipient`)!.label });
    if (effectiveShowColumns.includes("giftItem")) eventExpandedOrder.push({ id: `gift${yy}Item`, label: GIFT_HEADERS_DISPLAY.find((g) => g.id === `gift${yy}Item`)!.label });
    if (effectiveShowColumns.includes("giftQty")) eventExpandedOrder.push({ id: `gift${yy}Qty`, label: GIFT_HEADERS_DISPLAY.find((g) => g.id === `gift${yy}Qty`)!.label });
    if (effectiveShowColumns.includes("giftSender")) eventExpandedOrder.push({ id: `gift${yy}Sender`, label: GIFT_HEADERS_DISPLAY.find((g) => g.id === `gift${yy}Sender`)!.label });
  }
  const expandedOptional = [...nonEventExpanded, ...eventExpandedOrder];
  const isOptionalEventCol = (colId: string) =>
    DAN_INVITED_COL_IDS.includes(colId) ||
    INVITER_COL_IDS.includes(colId) ||
    GIFT_RECIPIENT_COL_IDS.includes(colId) ||
    GIFT_ITEM_COL_IDS.includes(colId) ||
    GIFT_QTY_COL_IDS.includes(colId) ||
    GIFT_SENDER_COL_IDS.includes(colId);
  const danFilterOn = eventYears.some((y) => filters[`dan${y % 100}`] || filters[`dan${y % 100}Yn`]);
  const showDan = danFilterOn ? DAN_HEADERS : [];
  const giftFilterOn =
    eventYears.some((y) => filters[`gift${y}`] || filters[`gift${y % 100}Yn`]) || (filters.giftSender ?? "").trim() !== "";
  const showGift = giftFilterOn
    ? GIFT_HEADERS.filter((h) => {
        const m = h.id.match(/^gift(\d{2})/);
        if (!m) return true;
        const yy = parseInt(m[1], 10);
        const year = 2000 + yy;
        return !!filters[`gift${year}`] || !!filters[`gift${yy}Yn`] || (filters.giftSender ?? "").trim() !== "";
      })
    : [];

  const handleEmploymentStatusChange = async (partnerId: string, value: string) => {
    if (!canEdit) return;
    const prev = data.find((p) => p.id === partnerId);
    if (!prev) return;
    const prevVal = prev.employmentStatus ?? "";
    setData((list) =>
      list.map((p) => (p.id === partnerId ? { ...p, employmentStatus: value } : p))
    );
    try {
      const res = await fetch(`${apiRoot}/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employmentStatus: value }),
      });
      if (!res.ok) {
        setData((list) =>
          list.map((p) => (p.id === partnerId ? { ...p, employmentStatus: prevVal } : p))
        );
        toast.error("저장 실패");
      } else {
        toast.success("저장됨");
      }
    } catch {
      setData((list) =>
        list.map((p) => (p.id === partnerId ? { ...p, employmentStatus: prevVal } : p))
      );
      toast.error("저장 실패");
    }
  };

  const startEditHistory = (p: PartnerRow) => {
    if (!canEdit) return;
    setEditingHistoryId(p.id);
    setEditingHistoryValue(p.history ?? "");
  };

  const saveHistory = async (partnerId: string, valueToSave: string) => {
    if (!canEdit) return;
    const prev = data.find((p) => p.id === partnerId);
    const prevVal = prev?.history ?? "";
    setData((list) =>
      list.map((p) => (p.id === partnerId ? { ...p, history: valueToSave } : p))
    );
    setEditingHistoryId(null);
    setEditingHistoryValue("");
    try {
      const res = await fetch(`${apiRoot}/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: valueToSave }),
      });
      if (!res.ok) {
        setData((list) =>
          list.map((p) => (p.id === partnerId ? { ...p, history: prevVal } : p))
        );
        toast.error("저장 실패");
      } else {
        toast.success("저장됨");
      }
    } catch {
      setData((list) =>
        list.map((p) => (p.id === partnerId ? { ...p, history: prevVal } : p))
      );
      toast.error("저장 실패");
    }
  };

  const cancelHistoryEdit = () => {
    setEditingHistoryId(null);
    setEditingHistoryValue("");
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.size >= data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!canEdit || selectedIds.size === 0 || !confirm(`선택한 ${selectedIds.size}명을 삭제할까요?`)) return;
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        const res = await fetch(`${apiRoot}/partners/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("삭제 실패");
      }
      setData((list) => list.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      onRefresh?.();
      toast.success(`${ids.length}명 삭제되었습니다.`);
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const handlePartnerFieldChange = async (partnerId: string, field: string, value: string) => {
    if (!canEdit) return;
    const prev = data.find((p) => p.id === partnerId);
    if (!prev) return;
    const prevVal = (prev as Record<string, unknown>)[field] ?? "";
    setData((list) =>
      list.map((p) => (p.id === partnerId ? { ...p, [field]: value } : p))
    );
    try {
      const res = await fetch(`${apiRoot}/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        setData((list) =>
          list.map((p) => (p.id === partnerId ? { ...p, [field]: prevVal } : p))
        );
        toast.error("저장 실패");
      } else toast.success("저장됨");
    } catch {
      setData((list) =>
        list.map((p) => (p.id === partnerId ? { ...p, [field]: prevVal } : p))
      );
      toast.error("저장 실패");
    }
  };

  const handleEventFieldChange = async (partnerId: string, year: number, field: string, value: string) => {
    if (!canEdit) return;
    const prev = data.find((p) => p.id === partnerId);
    if (!prev) return;
    const ev = prev.eventsByYear?.[year] ?? {};
    const prevEv = { ...ev };
    const payload = {
      year,
      danInvitedRaw: field === "danInvitedRaw" ? value : (ev.danInvitedRaw ?? ""),
      danInviter: field === "danInviter" ? value : (ev.danInviter ?? ""),
      giftRecipient: field === "giftRecipient" ? value : (ev.giftRecipient ?? ""),
      giftItem: field === "giftItem" ? value : (ev.giftItem ?? ""),
      giftQtyRaw: field === "giftQtyRaw" ? value : (ev.giftQtyRaw ?? ""),
      giftSender: field === "giftSender" ? value : (ev.giftSender ?? ""),
    };
    setData((list) =>
      list.map((p) => {
        if (p.id !== partnerId) return p;
        return { ...p, eventsByYear: { ...p.eventsByYear, [year]: { ...ev, [field]: value } } };
      })
    );
    try {
      const res = await fetch(`${apiRoot}/partners/${partnerId}/events`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setData((list) =>
          list.map((p) => (p.id !== partnerId ? p : { ...p, eventsByYear: { ...p.eventsByYear, [year]: prevEv } }))
        );
        toast.error("저장 실패");
      } else toast.success("저장됨");
    } catch {
      setData((list) =>
        list.map((p) => (p.id !== partnerId ? p : { ...p, eventsByYear: { ...p.eventsByYear, [year]: prevEv } }))
      );
      toast.error("저장 실패");
    }
  };

  const isEditing = (partnerId: string, colId: string) =>
    editingCell?.partnerId === partnerId && editingCell?.colId === colId;

  const renderEditableCell = (p: PartnerRow, colId: string) => {
    const partnerField = colIdToPartnerField(colId);
    const eventInfo = colIdToEventYearAndField(colId);
    const val = getCellValue(p, colId);
    const showAsText = !isEditing(p.id, colId);

    if (colId === "employmentStatus") {
      if (showAsText) {
        return (
          <span
            className="block min-h-[32px] py-1.5 px-2 rounded border border-transparent hover:border-input cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setEditingOriginalValue(val);
              setEditingCell({ partnerId: p.id, colId });
            }}
          >
            {val || "-"}
          </span>
        );
      }
      return (
        <div className="flex items-center gap-1 flex-wrap">
          <select
            className="flex h-8 w-[100px] rounded-md border border-input bg-background px-2 text-sm"
            value={p.employmentStatus ?? ""}
            onChange={(e) =>
              setData((list) =>
                list.map((r) => (r.id === p.id ? { ...r, employmentStatus: e.target.value } : r))
              )
            }
            onClick={(e) => e.stopPropagation()}
            autoFocus
          >
            <option value="">선택</option>
            {EMPLOYMENT_STATUS_VALUES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-8 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleEmploymentStatusChange(p.id, p.employmentStatus ?? "");
              setEditingCell(null);
              setEditingOriginalValue(null);
            }}
          >
            저장
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              cancelCellEdit();
            }}
          >
            취소
          </Button>
        </div>
      );
    }
    if (partnerField && canEdit) {
      if (showAsText) {
        return (
          <span
            className="block min-h-[32px] py-1.5 px-2 rounded border border-transparent hover:border-input cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setEditingOriginalValue(val);
              setEditingCell({ partnerId: p.id, colId });
            }}
          >
            {val || "-"}
          </span>
        );
      }
      const currentVal = (p as Record<string, unknown>)[partnerField] ?? "";
      return (
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          <input
            className="flex h-8 flex-1 min-w-[80px] rounded-md border border-input bg-background px-2 text-sm"
            value={String(currentVal)}
            onChange={(e) =>
              setData((list) =>
                list.map((row) => (row.id === p.id ? { ...row, [partnerField]: e.target.value } : row))
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") cancelCellEdit();
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-8 px-2 text-xs shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handlePartnerFieldChange(p.id, partnerField, String(currentVal));
              setEditingCell(null);
              setEditingOriginalValue(null);
            }}
          >
            저장
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              cancelCellEdit();
            }}
          >
            취소
          </Button>
        </div>
      );
    }
    if (eventInfo && canEdit) {
      const { year, field } = eventInfo;
      const isSelect = field === "danInvitedRaw" || field === "giftRecipient";
      if (showAsText) {
        return (
          <span
            className="block min-h-[32px] py-1.5 px-2 rounded border border-transparent hover:border-input cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCell({ partnerId: p.id, colId });
            }}
          >
            {val || "-"}
          </span>
        );
      }
      if (isSelect) {
        const opts = field === "danInvitedRaw" ? DAN_YN_OPTIONS : GIFT_YN_OPTIONS;
        return (
          <select
            className="flex h-8 w-[80px] rounded-md border border-input bg-background px-2 text-sm"
            value={val}
            onChange={(e) => {
              e.stopPropagation();
              handleEventFieldChange(p.id, year, field, e.target.value);
              setEditingCell(null);
            }}
            onBlur={() => setEditingCell(null)}
            autoFocus
          >
            {opts.map((o) => (
              <option key={o || "empty"} value={o}>{o || "-"}</option>
            ))}
          </select>
        );
      }
      return (
        <input
          className="flex h-8 w-full min-w-[80px] rounded-md border border-input bg-background px-2 text-sm"
          value={val}
          onChange={(e) => setData((list) =>
            list.map((row) => {
              if (row.id !== p.id) return row;
              const nextEv = { ...(row.eventsByYear?.[year] ?? {}), [field]: e.target.value };
              return { ...row, eventsByYear: { ...row.eventsByYear, [year]: nextEv } };
            })
          )}
          onBlur={(e) => {
            const v = e.target.value;
            if (v !== val) handleEventFieldChange(p.id, year, field, v);
            setEditingCell(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const input = e.target as HTMLInputElement;
              const v = input.value;
              if (v !== val) handleEventFieldChange(p.id, year, field, v);
              setEditingCell(null);
            }
            if (e.key === "Escape") setEditingCell(null);
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      );
    }
    return val || "-";
  };

  const currentQuery = buildQuery(filters, currentPage, eventYears, sortBy, sortOrder);
  if (loading || lastFetchedQueryRef.current !== currentQuery) {
    return <div className="py-8 text-center text-muted-foreground">로딩 중...</div>;
  }

  const selectedExportUrl =
    selectedIds.size > 0 && typeof window !== "undefined"
      ? `${apiRoot}/export/xlsx?ids=${encodeURIComponent(Array.from(selectedIds).join(","))}&columns=${encodeURIComponent(JSON.stringify(filters.showColumns))}`
      : null;

  return (
    <div className="space-y-2">
      {resizeCursorX != null &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed top-0 bottom-0 w-0.5 bg-primary/80 pointer-events-none z-[200]"
            style={{ left: resizeCursorX, transform: "translateX(-50%)" }}
            aria-hidden
          />,
          document.body
        )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          결과: 총 <span className="font-medium text-foreground">{pagination.total}</span>건
          {selectedIds.size > 0 && (
            <span className="ml-2 text-foreground">· 선택 <span className="font-medium">{selectedIds.size}</span>건</span>
          )}
        </p>
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            {selectedExportUrl && (
              <a href={selectedExportUrl} download target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" type="button">
                  선택 항목 다운로드
                </Button>
              </a>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" className="text-destructive" onClick={handleBulkDelete}>
                선택 항목 삭제
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="rounded-lg border overflow-x-auto">
      <Table className="text-[13px] table-fixed [&_th]:h-10 [&_td]:h-10 [&_th]:py-1.5 [&_td]:py-1.5">
        <TableHeader>
          <TableRow className="h-10">
            <TableHead className="w-10 px-2 relative align-middle" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center">
              <button
                ref={selectAllTriggerRef}
                type="button"
                aria-haspopup="true"
                aria-expanded={selectAllOpen}
                onClick={() => setSelectAllOpen((o) => !o)}
                className="flex items-center justify-center w-6 h-6 rounded border border-input bg-background hover:bg-muted cursor-pointer"
                title="선택 메뉴"
              >
                {data.length > 0 && selectedIds.size >= data.length ? (
                  <span className="text-primary text-xs">✓</span>
                ) : selectedIds.size > 0 ? (
                  <span className="text-muted-foreground text-xs">−</span>
                ) : (
                  <span className="text-muted-foreground/50 text-xs">▢</span>
                )}
              </button>
              {selectAllOpen && (
                <div
                  ref={selectAllMenuRef}
                  className="absolute left-0 top-full z-20 mt-1 min-w-[120px] rounded-md border border-input bg-popover shadow-md py-1"
                >
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => {
                      setSelectedIds(new Set(data.map((p) => p.id)));
                      setSelectAllOpen(false);
                    }}
                  >
                    현재 페이지 선택
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                    disabled={selectAllPagesLoading}
                    onClick={async () => {
                      setSelectAllPagesLoading(true);
                      try {
                        const q = buildIdsOnlyQuery(filters, eventYears, sortBy, sortOrder);
                        const res = await fetch(`${apiRoot}/partners?${q}`);
                        if (!res.ok) throw new Error("조회 실패");
                        const json = await res.json();
                        const ids = Array.isArray(json.ids) ? json.ids : [];
                        setSelectedIds(new Set(ids));
                        setSelectAllOpen(false);
                        if (ids.length > 0) toast.success(`모든 페이지 ${ids.length}건 선택됨`);
                      } catch {
                        toast.error("전체 ID 조회에 실패했습니다.");
                      } finally {
                        setSelectAllPagesLoading(false);
                      }
                    }}
                  >
                    {selectAllPagesLoading ? "조회 중..." : "모든 페이지 선택"}
                  </button>
                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => {
                        setSelectedIds(new Set());
                        setSelectAllOpen(false);
                      }}
                    >
                      선택 해제
                    </button>
                  )}
                </div>
              )}
              </div>
            </TableHead>
            {FIXED_HEADERS.map((h) => {
              const sortField = COL_ID_TO_SORT_FIELD[h.id];
              const isActive = sortField && sortBy === sortField;
              return (
                <TableHead
                  key={h.id}
                  className={`relative whitespace-nowrap ${getColWidthClass(h.id)} ${sortField ? "cursor-pointer select-none hover:bg-muted/50" : ""}`}
                  style={getColStyle(h.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if ((e.target as HTMLElement).closest?.("[data-resize-handle]")) return;
                    if (sortField) handleSort(h.id);
                  }}
                >
                  <span className="inline-flex items-center gap-0.5 truncate block">
                    {h.label}
                    {isActive && <span className="text-muted-foreground">{sortOrder === "asc" ? " ↑" : " ↓"}</span>}
                  </span>
                  <div data-resize-handle className="absolute right-0 top-0 bottom-0 w-2 z-10 cursor-col-resize hover:bg-primary/30 shrink-0" onMouseDown={(e) => handleResizeStart(h.id, e)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} aria-hidden />
                </TableHead>
              );
            })}
            {expandedOptional.map((item) => {
              const sortField = COL_ID_TO_SORT_FIELD[item.id];
              const isActive = sortField && sortBy === sortField;
              return (
                <TableHead
                  key={item.id}
                  className={`relative whitespace-nowrap px-2 ${getColWidthClass(item.id)} ${sortField ? "cursor-pointer select-none hover:bg-muted/50" : ""}`}
                  style={getColStyle(item.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if ((e.target as HTMLElement).closest?.("[data-resize-handle]")) return;
                    if (sortField) handleSort(item.id);
                  }}
                >
                  <span className="inline-flex items-center gap-0.5 truncate block">
                    {item.label}
                    {isActive && <span className="text-muted-foreground">{sortOrder === "asc" ? " ↑" : " ↓"}</span>}
                  </span>
                  <div data-resize-handle className="absolute right-0 top-0 bottom-0 w-2 z-10 cursor-col-resize hover:bg-primary/30 shrink-0" onMouseDown={(e) => handleResizeStart(item.id, e)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} aria-hidden />
                </TableHead>
              );
            })}
            {showDan.map((h) => (
              <TableHead key={h.id} className={`relative whitespace-nowrap px-2 ${getColWidthClass(h.id)}`} style={getColStyle(h.id)}>
                <span className="truncate block">{h.label}</span>
                <div data-resize-handle className="absolute right-0 top-0 bottom-0 w-2 z-10 cursor-col-resize hover:bg-primary/30 shrink-0" onMouseDown={(e) => handleResizeStart(h.id, e)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} aria-hidden />
              </TableHead>
            ))}
            {showGift.map((h) => (
              <TableHead key={h.id} className={`relative whitespace-nowrap px-2 ${getColWidthClass(h.id)}`} style={getColStyle(h.id)}>
                <span className="truncate block">{h.label}</span>
                <div data-resize-handle className="absolute right-0 top-0 bottom-0 w-2 z-10 cursor-col-resize hover:bg-primary/30 shrink-0" onMouseDown={(e) => handleResizeStart(h.id, e)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} aria-hidden />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((p) => (
            <TableRow
              key={p.id}
              className="cursor-pointer hover:bg-muted/50 h-10"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("select, input, button")) return;
                onSelectPartner(p.id);
              }}
            >
              <TableCell className="w-10 px-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => {}}
                  onClick={(e) => toggleSelect(p.id, e)}
                  className="rounded border-input cursor-pointer"
                />
              </TableCell>
              {FIXED_HEADERS.map((h) => (
                <TableCell key={h.id} className={`min-w-0 overflow-hidden ${cellClassName(h.id) || ""}`} style={getColStyle(h.id)} onClick={(e) => canEdit && e.stopPropagation()}>
                  {canEdit ? renderEditableCell(p, h.id) : <span className="block truncate">{getCellValue(p, h.id) || "-"}</span>}
                </TableCell>
              ))}
              {expandedOptional.map((item) => (
                <TableCell key={item.id} className={`min-w-0 overflow-hidden ${cellClassName(item.id) || ""}`} style={getColStyle(item.id)} onClick={(e) => (item.id === "history" || (canEdit && (item.id === "businessCardDate" || DAN_HEADERS.some((d) => d.id === item.id) || GIFT_HEADERS.some((g) => g.id === item.id)))) && e.stopPropagation()}>
                  {item.id === "history" && canEdit && editingHistoryId === p.id ? (
                    <div className="flex gap-1 items-start min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        className="flex min-h-[60px] w-full min-w-[200px] rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-y"
                        value={editingHistoryValue}
                        onChange={(e) => setEditingHistoryValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") cancelHistoryEdit();
                        }}
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="ghost" onClick={() => saveHistory(p.id, editingHistoryValue)}>
                          저장
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelHistoryEdit}>
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : item.id === "history" && canEdit ? (
                    <div
                      className="min-h-[32px] min-w-[120px] px-2 py-1 rounded border border-transparent hover:border-input cursor-text truncate"
                      onClick={() => startEditHistory(p)}
                    >
                      {getCellValue(p, item.id)}
                    </div>
                  ) : item.id === "history" ? (
                    <span className="block truncate">{getCellValue(p, item.id)}</span>
                  ) : canEdit && (item.id === "businessCardDate" || isOptionalEventCol(item.id)) ? (
                    renderEditableCell(p, item.id)
                  ) : (
                    <span className="block truncate">{getCellValue(p, item.id) || "-"}</span>
                  )}
                </TableCell>
              ))}
              {showDan.map((h) => (
                <TableCell key={h.id} className={`min-w-0 overflow-hidden ${cellClassName(h.id) || ""}`} style={getColStyle(h.id)} onClick={(e) => canEdit && e.stopPropagation()}>
                  {canEdit ? renderEditableCell(p, h.id) : <span className="block truncate">{getCellValue(p, h.id) || "-"}</span>}
                </TableCell>
              ))}
              {showGift.map((h) => (
                <TableCell key={h.id} className={`min-w-0 overflow-hidden ${cellClassName(h.id) || ""}`} style={getColStyle(h.id)} onClick={(e) => canEdit && e.stopPropagation()}>
                  {canEdit ? renderEditableCell(p, h.id) : <span className="block truncate">{getCellValue(p, h.id) || "-"}</span>}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          조건에 맞는 파트너가 없습니다.
        </div>
      )}
      {pagination.totalPages >= 1 && (
        <div className="p-2 flex items-center justify-between text-sm text-muted-foreground border-t">
          <span>총 {pagination.total}건</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              이전
            </Button>
            <span className="py-1 px-2">
              {currentPage} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pagination.totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
            >
              다음
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
