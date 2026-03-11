"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { FilterState, OptionalColumnId } from "@/app/dashboard/types";
import { OPTIONAL_COLUMN_IDS, EMPLOYMENT_STATUS_VALUES } from "@/app/dashboard/types";
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
}

export function FilterBar({ filters, eventYears, onFiltersChange, onRefresh }: FilterBarProps) {
  const toggleShowColumn = (id: OptionalColumnId) => {
    const show = filters.showColumns.includes(id);
    onFiltersChange({
      ...filters,
      showColumns: show ? filters.showColumns.filter((c) => c !== id) : [...filters.showColumns, id],
    });
  };

  const toggleDanYear = (year: number) => {
    const yy = year % 100;
    const key = `dan${yy}` as keyof FilterState;
    const cur = !!(filters[key] as boolean);
    onFiltersChange({ ...filters, [key]: !cur, [`dan${yy}Yn`]: "" });
  };

  const toggleGiftYear = (year: number) => {
    const yy = year % 100;
    const key = `gift${year}` as keyof FilterState;
    const cur = !!(filters[key] as boolean);
    onFiltersChange({ ...filters, [key]: !cur, [`gift${yy}Yn`]: "" });
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="font-medium text-sm rounded py-1.5 px-2 bg-gray-600 text-white">
        FILTER
      </div>
      <div className="space-y-3">
        <div className="rounded-md bg-gray-50/80 p-3">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 items-end">
            <div className="min-w-0">
              <Label className="text-xs">재직상태</Label>
              <select
                value={filters.employmentStatus}
                onChange={(e) => onFiltersChange({ ...filters, employmentStatus: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-0.5"
              >
                <option value="">전체</option>
                {EMPLOYMENT_STATUS_VALUES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <Label className="text-xs">이름</Label>
              <Input placeholder="검색" value={filters.name} onChange={(e) => onFiltersChange({ ...filters, name: e.target.value })} className="h-9 w-full px-2 py-1 text-sm mt-0.5" />
            </div>
            <div className="min-w-0">
              <Label className="text-xs">회사</Label>
              <Input placeholder="검색" value={filters.company} onChange={(e) => onFiltersChange({ ...filters, company: e.target.value })} className="h-9 w-full px-2 py-1 text-sm mt-0.5" />
            </div>
            <div className="min-w-0">
              <Label className="text-xs">부서</Label>
              <Input placeholder="검색" value={filters.department} onChange={(e) => onFiltersChange({ ...filters, department: e.target.value })} className="h-9 w-full px-2 py-1 text-sm mt-0.5" />
            </div>
            <div className="min-w-0">
              <Label className="text-xs">직함</Label>
              <Input placeholder="검색" value={filters.title} onChange={(e) => onFiltersChange({ ...filters, title: e.target.value })} className="h-9 w-full px-2 py-1 text-sm mt-0.5" />
            </div>
            <div className="min-w-0">
              <Label className="text-xs">휴대폰</Label>
              <Input placeholder="검색" value={filters.phone} onChange={(e) => onFiltersChange({ ...filters, phone: e.target.value })} className="h-9 w-full px-2 py-1 text-sm mt-0.5" />
            </div>
          </div>
        </div>
        <div className="rounded-md bg-gray-50/80 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs font-medium shrink-0 w-24">DAN초청년도</Label>
            {eventYears.map((year) => {
              const yy = year % 100;
              const key = `dan${yy}` as keyof FilterState;
              const checked = !!(filters[key] as boolean);
              return (
                <label key={year} className="flex items-center gap-1.5 shrink-0 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDanYear(year)}
                    className="rounded border-input"
                  />
                  <span className="text-xs">DAN{yy}</span>
                </label>
              );
            })}
            <div className="flex items-center gap-1.5 shrink-0">
              <Label className="text-xs text-muted-foreground">DAN초청인</Label>
              <Input placeholder="검색" value={filters.inviter} onChange={(e) => onFiltersChange({ ...filters, inviter: e.target.value })} className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm" />
            </div>
            <Label className="text-xs font-medium shrink-0 w-24 ml-1">선물발송년도</Label>
            {eventYears.map((year) => {
              const yy = year % 100;
              const key = `gift${year}` as keyof FilterState;
              const checked = !!(filters[key] as boolean);
              return (
                <label key={year} className="flex items-center gap-1.5 shrink-0 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleGiftYear(year)}
                    className="rounded border-input"
                  />
                  <span className="text-xs">{yy}년</span>
                </label>
              );
            })}
            <div className="flex items-center gap-1.5 shrink-0">
              <Label className="text-xs text-muted-foreground">선물발송인</Label>
              <Input placeholder="검색" value={filters.giftSender} onChange={(e) => onFiltersChange({ ...filters, giftSender: e.target.value })} className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm" />
            </div>
            <Button size="sm" onClick={onRefresh} className="h-9 px-3 text-sm shrink-0 ml-auto">
              적용
            </Button>
          </div>
        </div>
      </div>

      <div className="font-medium text-sm mt-4 rounded py-1.5 px-2 bg-gray-300 text-gray-900">
        SHOW
      </div>
      <div className="flex flex-wrap gap-2 rounded-md bg-gray-50/80 p-3">
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
    </div>
  );
}
