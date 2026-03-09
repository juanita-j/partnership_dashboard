"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { FilterState, OptionalColumnId } from "@/app/dashboard/types";
import { OPTIONAL_COLUMN_IDS, EMPLOYMENT_STATUS_VALUES } from "@/app/dashboard/types";
import { toast } from "sonner";

const OPTIONAL_LABELS: Record<OptionalColumnId, string> = {
  businessCardDate: "명함 등록일",
  history: "히스토리",
  danInvited: "DAN초청여부",
  inviter: "DAN초청인",
  giftRecipient: "선물수신여부",
  giftItem: "선물품목",
  giftQty: "선물발송개수",
  giftSender: "선물발송인",
};

interface FilterBarProps {
  filters: FilterState;
  eventYears: number[];
  onFiltersChange: (f: FilterState) => void;
  onRefresh: () => void;
  canSaveFilter?: boolean;
}

export function FilterBar({ filters, eventYears, onFiltersChange, onRefresh, canSaveFilter = false }: FilterBarProps) {
  const [savedList, setSavedList] = useState<{ id: string; name: string; filtersJson: string }[]>([]);
  const [savedId, setSavedId] = useState("");
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/saved-filters")
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setSavedList(data) : []))
      .catch(() => {});
  }, []);

  const applySaved = (json: string) => {
    try {
      const f = JSON.parse(json) as FilterState;
      onFiltersChange({ ...filters, ...f });
    } catch (_) {}
  };

  const toggleShowColumn = (id: OptionalColumnId) => {
    const show = filters.showColumns.includes(id);
    onFiltersChange({
      ...filters,
      showColumns: show ? filters.showColumns.filter((c) => c !== id) : [...filters.showColumns, id],
    });
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="font-medium text-sm rounded py-1.5 px-2 bg-gray-600 text-white">
        FILTER (기본 정보)
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-8 gap-2 items-end rounded-md bg-gray-50/80 p-2">
        <div className="min-w-0">
          <Label className="text-xs">재직상태</Label>
          <select
            value={filters.employmentStatus}
            onChange={(e) => onFiltersChange({ ...filters, employmentStatus: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-0.5"
          >
            <option value="">전체</option>
            {EMPLOYMENT_STATUS_VALUES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <Label className="text-xs">이름</Label>
          <Input
            placeholder="검색"
            value={filters.name}
            onChange={(e) => onFiltersChange({ ...filters, name: e.target.value })}
            className="h-9 w-full px-2 py-1 text-sm mt-0.5"
          />
        </div>
        <div className="min-w-0">
          <Label className="text-xs">회사</Label>
          <Input
            placeholder="검색"
            value={filters.company}
            onChange={(e) => onFiltersChange({ ...filters, company: e.target.value })}
            className="h-9 w-full px-2 py-1 text-sm mt-0.5"
          />
        </div>
        <div className="min-w-0">
          <Label className="text-xs">부서</Label>
          <Input
            placeholder="검색"
            value={filters.department}
            onChange={(e) => onFiltersChange({ ...filters, department: e.target.value })}
            className="h-9 w-full px-2 py-1 text-sm mt-0.5"
          />
        </div>
        <div className="min-w-0">
          <Label className="text-xs">직함</Label>
          <Input
            placeholder="검색"
            value={filters.title}
            onChange={(e) => onFiltersChange({ ...filters, title: e.target.value })}
            className="h-9 w-full px-2 py-1 text-sm mt-0.5"
          />
        </div>
        <div className="min-w-0">
          <Label className="text-xs">초청인</Label>
          <Input
            placeholder="검색"
            value={filters.inviter}
            onChange={(e) => onFiltersChange({ ...filters, inviter: e.target.value })}
            className="h-9 w-full px-2 py-1 text-sm mt-0.5"
          />
        </div>
        <div className="min-w-0">
          <Label className="text-xs">선물발송인</Label>
          <Input
            placeholder="검색"
            value={filters.giftSender}
            onChange={(e) => onFiltersChange({ ...filters, giftSender: e.target.value })}
            className="h-9 w-full px-2 py-1 text-sm mt-0.5"
          />
        </div>
        <div className="flex items-end pb-0.5">
          <Button size="sm" onClick={onRefresh} className="h-7 px-2 text-xs">
            적용
          </Button>
        </div>
      </div>
      <div className="border-t pt-4 mt-2">
        <div className="font-medium text-sm mb-2 rounded py-1.5 px-2 bg-gray-600 text-white">
          FILTER (DAN/연말선물)
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50/80 p-3">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 flex-nowrap">
              <Label className="text-xs font-medium shrink-0">DAN초청여부 (Y/N)</Label>
              <div className="flex items-center gap-2 flex-nowrap">
                {eventYears.map((year) => {
                  const yy = year % 100;
                  const keyYn = `dan${yy}Yn` as keyof FilterState;
                  return (
                    <div key={year} className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-muted-foreground">DAN{yy}</span>
                      <select
                        value={String(filters[keyYn] ?? "")}
                        onChange={(e) => onFiltersChange({ ...filters, [keyYn]: e.target.value as "" | "Y" | "N" })}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm w-16"
                      >
                        <option value="">전체</option>
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-nowrap">
              <Label className="text-xs font-medium shrink-0">선물발송여부 (Y/N)</Label>
              <div className="flex items-center gap-2 flex-nowrap">
                {eventYears.map((year) => {
                  const yy = year % 100;
                  const keyYn = `gift${yy}Yn` as keyof FilterState;
                  return (
                    <div key={year} className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-muted-foreground">{yy}년</span>
                      <select
                        value={String(filters[keyYn] ?? "")}
                        onChange={(e) => onFiltersChange({ ...filters, [keyYn]: e.target.value as "" | "Y" | "N" })}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm w-16"
                      >
                        <option value="">전체</option>
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="font-medium text-sm mt-4 rounded py-1.5 px-2 bg-gray-300 text-gray-900">
        SHOW
      </div>
      <div className="flex flex-wrap gap-2 rounded-md bg-gray-50/80 p-2">
        {OPTIONAL_COLUMN_IDS.map((id) => (
          <label key={id} className="flex items-center gap-1.5 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={filters.showColumns.includes(id)}
              onChange={() => toggleShowColumn(id)}
              className="rounded border-input"
            />
            {OPTIONAL_LABELS[id]}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-2">
        {savedList.length > 0 && (
          <>
            <Label className="text-xs">저장된 필터:</Label>
            <select
              value={savedId}
              onChange={(e) => {
                const id = e.target.value;
                setSavedId(id);
                const item = savedList.find((s) => s.id === id);
                if (item) applySaved(item.filtersJson);
              }}
              className="w-48 h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">선택</option>
              {savedList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </>
        )}
        {canSaveFilter && (
          <>
            <Input
              placeholder="필터 이름"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="w-40"
            />
            <Button
              size="sm"
              disabled={!saveName.trim() || saving}
              onClick={async () => {
                if (!saveName.trim()) return;
                setSaving(true);
                try {
                  const res = await fetch("/api/saved-filters", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: saveName.trim(), filtersJson: JSON.stringify(filters) }),
                  });
                  if (!res.ok) throw new Error("저장 실패");
                  const created = await res.json();
                  setSavedList((prev) => [{ id: created.id, name: created.name, filtersJson: created.filtersJson }, ...prev]);
                  setSaveName("");
                  toast.success("필터 저장됨");
                } catch {
                  toast.error("저장 실패");
                } finally {
                  setSaving(false);
                }
              }}
            >
              현재 필터 저장
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
