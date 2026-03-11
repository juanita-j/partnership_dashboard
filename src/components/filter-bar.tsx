"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { FilterState, OptionalColumnId } from "@/app/dashboard/types";
import { OPTIONAL_COLUMN_IDS, EMPLOYMENT_STATUS_VALUES, defaultFilters } from "@/app/dashboard/types";
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
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  const toggleShowColumn = (id: OptionalColumnId) => {
    const show = filters.showColumns.includes(id);
    onFiltersChange({
      ...filters,
      showColumns: show ? filters.showColumns.filter((c) => c !== id) : [...filters.showColumns, id],
    });
  };

  const getDefaultFilterState = (): FilterState => {
    const state: FilterState = { ...defaultFilters };
    eventYears.forEach((year) => {
      const yy = year % 100;
      (state as Record<string, unknown>)[`dan${yy}`] = false;
      (state as Record<string, unknown>)[`dan${yy}Yn`] = "";
      (state as Record<string, unknown>)[`gift${year}`] = false;
      (state as Record<string, unknown>)[`gift${yy}Yn`] = "";
    });
    return state;
  };

  const showEventYears = filters.showEventYears ?? [];
  const toggleShowEventYear = (year: number) => {
    const next = showEventYears.includes(year)
      ? showEventYears.filter((y) => y !== year)
      : [...showEventYears, year].sort((a, b) => a - b);
    onFiltersChange({ ...filters, showEventYears: next });
  };

  const resetFiltersToDefault = () => {
    onFiltersChange(getDefaultFilterState());
    onRefresh();
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="font-medium text-sm rounded py-1.5 px-2 bg-gray-600 text-white">
        FILTER
      </div>
      <div className="rounded-md bg-gray-50/80 p-3 space-y-3">
        <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-9 gap-2 items-end">
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
          <div className="min-w-0">
            <Label className="text-xs">전자메일</Label>
            <Input placeholder="검색" value={filters.email} onChange={(e) => onFiltersChange({ ...filters, email: e.target.value })} className="h-9 w-full px-2 py-1 text-sm mt-0.5" />
          </div>
          <div className="min-w-0">
            <Label className="text-xs">히스토리</Label>
            <Input placeholder="검색" value={filters.history} onChange={(e) => onFiltersChange({ ...filters, history: e.target.value })} className="h-9 w-full px-2 py-1 text-sm mt-0.5" />
          </div>
          <div className="flex items-end pb-0.5">
            <Button size="sm" onClick={onRefresh} className="h-9 px-3 text-sm">
              적용
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs font-medium shrink-0 w-20">DAN초청여부</Label>
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
          <div className="flex items-center gap-1.5 shrink-0">
            <Label className="text-xs text-muted-foreground">초청인</Label>
            <Input placeholder="검색" value={filters.inviter} onChange={(e) => onFiltersChange({ ...filters, inviter: e.target.value })} className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs font-medium shrink-0 w-20">선물발송여부</Label>
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
          <div className="flex items-center gap-1.5 shrink-0">
            <Label className="text-xs text-muted-foreground">선물발송인</Label>
            <Input placeholder="검색" value={filters.giftSender} onChange={(e) => onFiltersChange({ ...filters, giftSender: e.target.value })} className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm" />
          </div>
        </div>
      </div>

      <div className="font-medium text-sm mt-4 rounded py-1.5 px-2 bg-gray-300 text-gray-900">
        SHOW
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-md bg-gray-50/80 p-3">
        <div className="relative flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">연도 선택</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-w-[7rem] justify-between text-sm font-normal"
            onClick={() => setYearDropdownOpen((o) => !o)}
          >
            {showEventYears.length > 0 ? showEventYears.sort((a, b) => a - b).map((y) => `${y}년`).join(", ") : "선택"}
            <span className="ml-1 opacity-70">{yearDropdownOpen ? "▲" : "▼"}</span>
          </Button>
          {yearDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setYearDropdownOpen(false)} aria-hidden />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[7rem] rounded-md border border-input bg-background p-2 shadow-md">
                {eventYears.map((year) => (
                  <label key={year} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={showEventYears.includes(year)}
                      onChange={() => toggleShowEventYear(year)}
                      className="rounded border-input"
                    />
                    {year}년
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
