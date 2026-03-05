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
import {
  FIXED_COLUMN_IDS,
  OPTIONAL_COLUMN_IDS,
  DAN_AUTO_COLUMNS,
  GIFT_AUTO_COLUMNS,
  EMPLOYMENT_STATUS_VALUES,
} from "@/app/dashboard/types";
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
  refreshKey: number;
  onSelectPartner: (id: string | null) => void;
  canEdit: boolean;
}

function buildQuery(f: FilterState, page: number): string {
  const p = new URLSearchParams();
  if (f.employmentStatus) p.set("employmentStatus", f.employmentStatus);
  if (f.name) p.set("name", f.name);
  if (f.company) p.set("company", f.company);
  if (f.department) p.set("department", f.department);
  if (f.title) p.set("title", f.title);
  if (f.dan23) p.set("dan23", "true");
  if (f.dan24) p.set("dan24", "true");
  if (f.dan25) p.set("dan25", "true");
  if (f.gift2024) p.set("gift2024", "true");
  if (f.gift2025) p.set("gift2025", "true");
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
];

const DAN_HEADERS: { id: (typeof DAN_AUTO_COLUMNS)[number]; label: string }[] = [
  { id: "dan23Invited", label: "DAN23 초청여부" },
  { id: "dan23Inviter", label: "DAN23 초청인" },
  { id: "dan24Invited", label: "DAN24 초청여부" },
  { id: "dan24Inviter", label: "DAN24 초청인" },
  { id: "dan25Invited", label: "DAN25 초청여부" },
  { id: "dan25Inviter", label: "DAN25 초청인" },
];

const GIFT_HEADERS: { id: (typeof GIFT_AUTO_COLUMNS)[number]; label: string }[] = [
  { id: "gift24Recipient", label: "24년 선물수신인" },
  { id: "gift24Item", label: "24년 선물품목" },
  { id: "gift24Qty", label: "24년 선물발송개수" },
  { id: "gift24Sender", label: "24년 선물발송인" },
  { id: "gift25Recipient", label: "25년 선물수신인" },
  { id: "gift25Item", label: "25년 선물품목" },
  { id: "gift25Qty", label: "25년 선물발송개수" },
  { id: "gift25Sender", label: "25년 선물발송인" },
];

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
  if (colId.startsWith("dan23")) return { year: 2023, field: colId === "dan23Invited" ? "danInvitedRaw" : "danInviter" };
  if (colId.startsWith("dan24")) return { year: 2024, field: colId === "dan24Invited" ? "danInvitedRaw" : "danInviter" };
  if (colId.startsWith("dan25")) return { year: 2025, field: colId === "dan25Invited" ? "danInvitedRaw" : "danInviter" };
  if (colId.startsWith("gift24")) {
    const f = colId.replace("gift24", "").toLowerCase();
    const field = f === "recipient" ? "giftRecipient" : f === "item" ? "giftItem" : f === "qty" ? "giftQtyRaw" : "giftSender";
    return { year: 2024, field };
  }
  if (colId.startsWith("gift25")) {
    const f = colId.replace("gift25", "").toLowerCase();
    const field = f === "recipient" ? "giftRecipient" : f === "item" ? "giftItem" : f === "qty" ? "giftQtyRaw" : "giftSender";
    return { year: 2025, field };
  }
  return null;
}

function getCellValue(p: PartnerRow, colId: string): string {
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
    case "dan23Invited":
      return p.eventsByYear?.[2023]?.danInvitedRaw ?? "";
    case "dan23Inviter":
      return p.eventsByYear?.[2023]?.danInviter ?? "";
    case "dan24Invited":
      return p.eventsByYear?.[2024]?.danInvitedRaw ?? "";
    case "dan24Inviter":
      return p.eventsByYear?.[2024]?.danInviter ?? "";
    case "dan25Invited":
      return p.eventsByYear?.[2025]?.danInvitedRaw ?? "";
    case "dan25Inviter":
      return p.eventsByYear?.[2025]?.danInviter ?? "";
    case "gift24Recipient":
      return p.eventsByYear?.[2024]?.giftRecipient ?? "";
    case "gift24Item":
      return p.eventsByYear?.[2024]?.giftItem ?? "";
    case "gift24Qty":
      return p.eventsByYear?.[2024]?.giftQtyRaw ?? "";
    case "gift24Sender":
      return p.eventsByYear?.[2024]?.giftSender ?? "";
    case "gift25Recipient":
      return p.eventsByYear?.[2025]?.giftRecipient ?? "";
    case "gift25Item":
      return p.eventsByYear?.[2025]?.giftItem ?? "";
    case "gift25Qty":
      return p.eventsByYear?.[2025]?.giftQtyRaw ?? "";
    case "gift25Sender":
      return p.eventsByYear?.[2025]?.giftSender ?? "";
    default:
      return "";
  }
}

export function PartnersTable({ filters, refreshKey, onSelectPartner, canEdit }: PartnersTableProps) {
  const [data, setData] = useState<PartnerRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingHistoryValue, setEditingHistoryValue] = useState("");
  const [editingCell, setEditingCell] = useState<{ partnerId: string; colId: string } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, refreshKey]);

  useEffect(() => {
    setLoading(true);
    const q = buildQuery(filters, currentPage);
    fetch(`/api/partners?${q}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setData(res.data);
        if (res.pagination) setPagination(res.pagination);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [filters, refreshKey, currentPage]);

  const showOptional = OPTIONAL_HEADERS.filter((h) => filters.showColumns.includes(h.id));
  const showDan = (filters.dan23 || filters.dan24 || filters.dan25) ? DAN_HEADERS : [];
  const giftFilterOn = filters.gift2024 || filters.gift2025 || (filters.giftSender ?? "").trim() !== "";
  const showGift = giftFilterOn
    ? GIFT_HEADERS.filter(
        (h) =>
          (h.id.startsWith("gift24") && (filters.gift2024 || (filters.giftSender ?? "").trim() !== "")) ||
          (h.id.startsWith("gift25") && (filters.gift2025 || (filters.giftSender ?? "").trim() !== ""))
      )
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

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        결과: 총 <span className="font-medium text-foreground">{pagination.total}</span>건
      </p>
      <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {FIXED_HEADERS.map((h) => (
              <TableHead key={h.id} className="whitespace-nowrap">
                {h.label}
              </TableHead>
            ))}
            {showOptional.map((h) => (
              <TableHead key={h.id} className="whitespace-nowrap">
                {h.label}
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
              {FIXED_HEADERS.map((h) => (
                <TableCell key={h.id} onClick={(e) => canEdit && e.stopPropagation()}>
                  {canEdit ? renderEditableCell(p, h.id) : (getCellValue(p, h.id) || "-")}
                </TableCell>
              ))}
              {showOptional.map((h) => (
                <TableCell key={h.id} onClick={(e) => (h.id === "history" || (canEdit && h.id === "businessCardDate")) && e.stopPropagation()}>
                  {h.id === "history" && canEdit && editingHistoryId === p.id ? (
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
                  ) : h.id === "history" && canEdit ? (
                    <div
                      className="min-h-[32px] min-w-[120px] px-2 py-1 rounded border border-transparent hover:border-input cursor-text"
                      onClick={() => startEditHistory(p)}
                    >
                      {getCellValue(p, h.id)}
                    </div>
                  ) : h.id === "history" ? (
                    getCellValue(p, h.id)
                  ) : canEdit && h.id === "businessCardDate" ? (
                    renderEditableCell(p, h.id)
                  ) : (
                    (getCellValue(p, h.id) || "-")
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
