"use client";

import { useState, useEffect } from "react";
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
}

function buildQuery(f: FilterState, page: number, eventYears: number[]): string {
  const p = new URLSearchParams();
  if (f.employmentStatus) p.set("employmentStatus", f.employmentStatus);
  if (f.name) p.set("name", f.name);
  if (f.company) p.set("company", f.company);
  if (f.department) p.set("department", f.department);
  if (f.title) p.set("title", f.title);
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

const DAN_INVITED_COL_IDS = ["dan23Invited", "dan24Invited", "dan25Invited"] as const;
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
      return p.companyNormalized ?? "";
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

export function PartnersTable({ filters, eventYears, refreshKey, onSelectPartner, onRefresh, canEdit }: PartnersTableProps) {
  const [data, setData] = useState<PartnerRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingHistoryValue, setEditingHistoryValue] = useState("");
  const [editingCell, setEditingCell] = useState<{ partnerId: string; colId: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const DAN_HEADERS = buildDanHeaders(eventYears);
  const GIFT_HEADERS = buildGiftHeaders(eventYears);
  const { DAN_INVITED_COL_IDS, INVITER_COL_IDS, GIFT_RECIPIENT_COL_IDS, GIFT_ITEM_COL_IDS, GIFT_QTY_COL_IDS, GIFT_SENDER_COL_IDS } = buildOptionalColIdArrays(eventYears);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, refreshKey]);

  useEffect(() => {
    setLoading(true);
    const q = buildQuery(filters, currentPage, eventYears);
    fetch(`/api/partners?${q}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setData(res.data);
        if (res.pagination) setPagination(res.pagination);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [filters, refreshKey, currentPage, eventYears]);

  const showOptional = OPTIONAL_HEADERS.filter((h) => filters.showColumns.includes(h.id));
  const expandedOptional = showOptional.flatMap((h): { id: string; label: string }[] => {
    if (h.id === "danInvited") return DAN_INVITED_COL_IDS.map((colId) => ({ id: colId, label: DAN_HEADERS.find((d) => d.id === colId)!.label }));
    if (h.id === "inviter") return INVITER_COL_IDS.map((colId) => ({ id: colId, label: DAN_HEADERS.find((d) => d.id === colId)!.label }));
    if (h.id === "giftRecipient") return GIFT_RECIPIENT_COL_IDS.map((colId) => ({ id: colId, label: GIFT_HEADERS.find((g) => g.id === colId)!.label }));
    if (h.id === "giftItem") return GIFT_ITEM_COL_IDS.map((colId) => ({ id: colId, label: GIFT_HEADERS.find((g) => g.id === colId)!.label }));
    if (h.id === "giftQty") return GIFT_QTY_COL_IDS.map((colId) => ({ id: colId, label: GIFT_HEADERS.find((g) => g.id === colId)!.label }));
    if (h.id === "giftSender") return GIFT_SENDER_COL_IDS.map((colId) => ({ id: colId, label: GIFT_HEADERS.find((g) => g.id === colId)!.label }));
    return [{ id: h.id, label: h.label }];
  });
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
      const res = await fetch(`/api/partners/${partnerId}`, {
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
      const res = await fetch(`/api/partners/${partnerId}`, {
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
        const res = await fetch(`/api/partners/${id}`, { method: "DELETE" });
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
      const res = await fetch(`/api/partners/${partnerId}`, {
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
      const res = await fetch(`/api/partners/${partnerId}/events`, {
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
              setEditingCell({ partnerId: p.id, colId });
            }}
          >
            {val || "-"}
          </span>
        );
      }
      return (
        <select
          className="flex h-8 w-[100px] rounded-md border border-input bg-background px-2 text-sm"
          value={p.employmentStatus ?? ""}
          onChange={(e) => {
            e.stopPropagation();
            handleEmploymentStatusChange(p.id, e.target.value);
            setEditingCell(null);
          }}
          onBlur={() => setEditingCell(null)}
          autoFocus
        >
          <option value="">선택</option>
          {EMPLOYMENT_STATUS_VALUES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      );
    }
    if (partnerField && canEdit) {
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
      return (
        <input
          className="flex h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm"
          value={val}
          onChange={(e) => setData((list) =>
            list.map((row) => (row.id === p.id ? { ...row, [partnerField]: e.target.value } : row))
          )}
          onBlur={(e) => {
            const v = e.target.value;
            if (v !== val) handlePartnerFieldChange(p.id, partnerField, v);
            setEditingCell(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditingCell(null);
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
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
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditingCell(null);
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      );
    }
    return val || "-";
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">로딩 중...</div>;

  const selectedExportUrl =
    selectedIds.size > 0 && typeof window !== "undefined"
      ? `/api/export/xlsx?ids=${encodeURIComponent(Array.from(selectedIds).join(","))}&columns=${encodeURIComponent(JSON.stringify(filters.showColumns))}`
      : null;

  return (
    <div className="space-y-2">
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 px-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={data.length > 0 && selectedIds.size >= data.length}
                ref={(el) => {
                  if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < data.length;
                }}
                onChange={() => {}}
                onClick={toggleSelectAll}
                className="rounded border-input cursor-pointer"
              />
            </TableHead>
            {FIXED_HEADERS.map((h) => (
              <TableHead key={h.id} className="whitespace-nowrap">
                {h.label}
              </TableHead>
            ))}
            {expandedOptional.map((item) => (
              <TableHead key={item.id} className="whitespace-nowrap">
                {item.label}
              </TableHead>
            ))}
            {showDan.map((h) => (
              <TableHead key={h.id} className="whitespace-nowrap">
                {h.label}
              </TableHead>
            ))}
            {showGift.map((h) => (
              <TableHead key={h.id} className="whitespace-nowrap">
                {h.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((p) => (
            <TableRow
              key={p.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("select, input, button")) return;
                onSelectPartner(p.id);
              }}
            >
              <TableCell className="w-10 px-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => {}}
                  onClick={(e) => toggleSelect(p.id, e)}
                  className="rounded border-input cursor-pointer"
                />
              </TableCell>
              {FIXED_HEADERS.map((h) => (
                <TableCell key={h.id} onClick={(e) => canEdit && e.stopPropagation()}>
                  {canEdit ? renderEditableCell(p, h.id) : (getCellValue(p, h.id) || "-")}
                </TableCell>
              ))}
              {expandedOptional.map((item) => (
                <TableCell key={item.id} onClick={(e) => (item.id === "history" || (canEdit && (item.id === "businessCardDate" || DAN_HEADERS.some((d) => d.id === item.id) || GIFT_HEADERS.some((g) => g.id === item.id)))) && e.stopPropagation()}>
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
                      className="min-h-[32px] min-w-[120px] px-2 py-1 rounded border border-transparent hover:border-input cursor-text"
                      onClick={() => startEditHistory(p)}
                    >
                      {getCellValue(p, item.id)}
                    </div>
                  ) : item.id === "history" ? (
                    getCellValue(p, item.id)
                  ) : canEdit && (item.id === "businessCardDate" || isOptionalEventCol(item.id)) ? (
                    renderEditableCell(p, item.id)
                  ) : (
                    (getCellValue(p, item.id) || "-")
                  )}
                </TableCell>
              ))}
              {showDan.map((h) => (
                <TableCell key={h.id} onClick={(e) => canEdit && e.stopPropagation()}>
                  {canEdit ? renderEditableCell(p, h.id) : (getCellValue(p, h.id) || "-")}
                </TableCell>
              ))}
              {showGift.map((h) => (
                <TableCell key={h.id} onClick={(e) => canEdit && e.stopPropagation()}>
                  {canEdit ? renderEditableCell(p, h.id) : (getCellValue(p, h.id) || "-")}
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
