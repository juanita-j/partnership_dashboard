"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

const DROPDOWN_INPUT_CLASS = "h-9 rounded-md border border-input bg-background px-2 py-1 text-sm";

interface FilterBarProps {
  filters: FilterState;
  eventYears: number[];
  onFiltersChange: (f: FilterState) => void;
  onApply: () => void;
  onRefresh: () => void;
}

export function FilterBar({ filters, eventYears, onFiltersChange, onApply, onRefresh }: FilterBarProps) {
  const [danOpen, setDanOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [showYearsOpen, setShowYearsOpen] = useState(false);
  const danRef = useRef<HTMLDivElement>(null);
  const giftRef = useRef<HTMLDivElement>(null);
  const showYearsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showYearsOpen) return;
    const close = (e: MouseEvent) => {
      if (showYearsRef.current?.contains(e.target as Node)) return;
      setShowYearsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showYearsOpen]);

  useEffect(() => {
    if (!danOpen) return;
    const close = (e: MouseEvent) => {
      if (danRef.current?.contains(e.target as Node)) return;
      setDanOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [danOpen]);
  useEffect(() => {
    if (!giftOpen) return;
    const close = (e: MouseEvent) => {
      if (giftRef.current?.contains(e.target as Node)) return;
      setGiftOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [giftOpen]);

  const toggleShowColumn = (id: OptionalColumnId) => {
    const show = filters.showColumns.includes(id);
    onFiltersChange({
      ...filters,
      showColumns: show ? filters.showColumns.filter((c) => c !== id) : [...filters.showColumns, id],
    });
  };

  const selectedShowYears = filters.showEventYears ?? [];
  const toggleShowEventYear = (year: number) => {
    const next = selectedShowYears.includes(year)
      ? selectedShowYears.filter((y) => y !== year)
      : [...selectedShowYears, year].sort((a, b) => a - b);
    onFiltersChange({ ...filters, showEventYears: next });
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
      <div className="space-y-3 !mt-1">
        <div className="rounded-md bg-gray-50/80 p-3">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 items-end">
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
              <Label className="text-xs">히스토리</Label>
              <Input placeholder="검색" value={filters.history} onChange={(e) => onFiltersChange({ ...filters, history: e.target.value })} className="h-9 w-full px-2 py-1 text-sm mt-0.5" />
            </div>
            <div className="min-w-0 flex items-end pb-0.5">
              <Button type="button" size="sm" onClick={onApply} className="h-9">
                적용
              </Button>
            </div>
          </div>
        </div>
        <div className="rounded-md bg-gray-50/80 p-3">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 items-end">
            <div className="min-w-0 flex flex-col gap-0.5">
              <Label className="text-xs font-medium whitespace-nowrap">DAN초청년도</Label>
              <div className="relative min-w-0 flex-1" ref={danRef}>
                <button
                  type="button"
                  onClick={() => setDanOpen((o) => !o)}
                  className={`${DROPDOWN_INPUT_CLASS} w-full min-w-0 text-left flex items-center justify-between gap-1`}
                >
                  <span className="text-sm truncate">
                    {eventYears.filter((y) => !!(filters[`dan${y % 100}`] as boolean)).length > 0
                      ? eventYears.filter((y) => !!(filters[`dan${y % 100}`] as boolean)).map((y) => `DAN${y % 100}`).join(", ")
                      : "선택"}
                  </span>
                  <span className="opacity-70 text-xs shrink-0">{danOpen ? "▲" : "▼"}</span>
                </button>
                {danOpen && (
                  <div className="absolute left-0 top-full z-20 mt-1 min-w-[7rem] rounded-md border border-input bg-background p-2 shadow-md">
                    {eventYears.map((year) => {
                      const yy = year % 100;
                      const key = `dan${yy}` as keyof FilterState;
                      const checked = !!(filters[key] as boolean);
                      return (
                        <label key={year} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-muted/50">
                          <input type="checkbox" checked={checked} onChange={() => toggleDanYear(year)} className="rounded border-input" />
                          DAN{yy}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0 flex flex-col gap-0.5">
              <Label className="text-xs font-medium whitespace-nowrap">DAN초청인</Label>
              <Input placeholder="검색" value={filters.inviter} onChange={(e) => onFiltersChange({ ...filters, inviter: e.target.value })} className="h-9 w-full px-2 py-1 text-sm mt-0.5" />
            </div>
            <div className="min-w-0 flex flex-col gap-0.5">
              <Label className="text-xs font-medium whitespace-nowrap">선물발송년도</Label>
              <div className="relative min-w-0 flex-1" ref={giftRef}>
                <button
                  type="button"
                  onClick={() => setGiftOpen((o) => !o)}
                  className={`${DROPDOWN_INPUT_CLASS} w-full min-w-0 text-left flex items-center justify-between gap-1`}
                >
                  <span className="text-sm truncate">
                    {eventYears.filter((y) => !!(filters[`gift${y}`] as boolean)).length > 0
                      ? eventYears.filter((y) => !!(filters[`gift${y}`] as boolean)).map((y) => `${y % 100}년`).join(", ")
                      : "선택"}
                  </span>
                  <span className="opacity-70 text-xs shrink-0">{giftOpen ? "▲" : "▼"}</span>
                </button>
                {giftOpen && (
                  <div className="absolute left-0 top-full z-20 mt-1 min-w-[7rem] rounded-md border border-input bg-background p-2 shadow-md">
                    {eventYears.map((year) => {
                      const yy = year % 100;
                      const key = `gift${year}` as keyof FilterState;
                      const checked = !!(filters[key] as boolean);
                      return (
                        <label key={year} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-muted/50">
                          <input type="checkbox" checked={checked} onChange={() => toggleGiftYear(year)} className="rounded border-input" />
                          {yy}년
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0 flex flex-col gap-0.5">
              <Label className="text-xs font-medium whitespace-nowrap">선물발송인</Label>
              <Input placeholder="검색" value={filters.giftSender} onChange={(e) => onFiltersChange({ ...filters, giftSender: e.target.value })} className="h-9 w-full px-2 py-1 text-sm mt-0.5" />
            </div>
            <div className="hidden sm:block sm:col-span-3" />
            <div className="min-w-0 flex items-end pb-0.5">
              <Button type="button" size="sm" onClick={onApply} className="h-9">
                적용
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="font-medium text-sm mt-4 rounded py-1.5 px-2 bg-gray-300 text-gray-900">
        SHOW
      </div>
      <div className="flex flex-nowrap items-center gap-2 rounded-md bg-gray-50/80 p-3 overflow-x-auto !mt-1">
        <Label className="text-xs text-muted-foreground shrink-0">연도</Label>
        <div className="relative shrink-0" ref={showYearsRef}>
          <button
            type="button"
            onClick={() => setShowYearsOpen((o) => !o)}
            className={`${DROPDOWN_INPUT_CLASS} min-w-[7rem] text-left flex items-center justify-between gap-1`}
          >
            <span className="text-sm truncate">
              {selectedShowYears.length === 0
                ? "전체"
                : selectedShowYears.map((y) => `${y}년`).join(", ")}
            </span>
            <span className="opacity-70 text-xs shrink-0">{showYearsOpen ? "▲" : "▼"}</span>
          </button>
          {showYearsOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[7rem] rounded-md border border-input bg-background p-2 shadow-md max-h-48 overflow-y-auto">
              {eventYears.map((year) => {
                const checked = selectedShowYears.includes(year);
                return (
                  <label key={year} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleShowEventYear(year)}
                      className="rounded border-input"
                    />
                    {year}년
                  </label>
                );
              })}
            </div>
          )}
        </div>
        {OPTIONAL_COLUMN_IDS.map((id) => (
          <label key={id} className="flex items-center gap-1.5 cursor-pointer text-sm shrink-0">
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
