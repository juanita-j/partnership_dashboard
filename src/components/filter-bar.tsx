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
  inviter: "초청인",
  giftSender: "선물 발송인",
  giftItem: "선물 품목",
};

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  onRefresh: () => void;
  canSaveFilter?: boolean;
}

export function FilterBar({ filters, onFiltersChange, onRefresh, canSaveFilter = false }: FilterBarProps) {
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
      <div className="font-medium text-sm text-muted-foreground">FILTER (행 조건)</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
        <div>
          <Label className="text-xs">재직상태</Label>
          <select
            value={filters.employmentStatus}
            onChange={(e) => onFiltersChange({ ...filters, employmentStatus: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
          >
            <option value="">전체</option>
            {EMPLOYMENT_STATUS_VALUES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">이름</Label>
          <Input
            placeholder="부분 검색"
            value={filters.name}
            onChange={(e) => onFiltersChange({ ...filters, name: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">회사</Label>
          <Input
            placeholder="부분 검색"
            value={filters.company}
            onChange={(e) => onFiltersChange({ ...filters, company: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">부서</Label>
          <Input
            placeholder="부분 검색"
            value={filters.department}
            onChange={(e) => onFiltersChange({ ...filters, department: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">직함</Label>
          <Input
            placeholder="부분 검색"
            value={filters.title}
            onChange={(e) => onFiltersChange({ ...filters, title: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">초청인</Label>
          <Input
            placeholder="부분 검색"
            value={filters.inviter}
            onChange={(e) => onFiltersChange({ ...filters, inviter: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">선물발송인</Label>
          <Input
            placeholder="부분 검색"
            value={filters.giftSender}
            onChange={(e) => onFiltersChange({ ...filters, giftSender: e.target.value })}
            className="mt-1"
          />
        </div>
        <div className="flex gap-2 items-end">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            적용
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2 border-t">
        <div className="space-y-2">
          <Label className="text-xs font-medium">DAN초청여부 (Y/N)</Label>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-12">DAN23</span>
              <select
                value={filters.dan23Yn}
                onChange={(e) => onFiltersChange({ ...filters, dan23Yn: e.target.value as "" | "Y" | "N" })}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm w-16"
              >
                <option value="">전체</option>
                <option value="Y">Y</option>
                <option value="N">N</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-12">DAN24</span>
              <select
                value={filters.dan24Yn}
                onChange={(e) => onFiltersChange({ ...filters, dan24Yn: e.target.value as "" | "Y" | "N" })}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm w-16"
              >
                <option value="">전체</option>
                <option value="Y">Y</option>
                <option value="N">N</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-12">DAN25</span>
              <select
                value={filters.dan25Yn}
                onChange={(e) => onFiltersChange({ ...filters, dan25Yn: e.target.value as "" | "Y" | "N" })}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm w-16"
              >
                <option value="">전체</option>
                <option value="Y">Y</option>
                <option value="N">N</option>
              </select>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">선물발송여부 (Y/N)</Label>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-10">24년</span>
              <select
                value={filters.gift24Yn}
                onChange={(e) => onFiltersChange({ ...filters, gift24Yn: e.target.value as "" | "Y" | "N" })}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm w-16"
              >
                <option value="">전체</option>
                <option value="Y">Y</option>
                <option value="N">N</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-10">25년</span>
              <select
                value={filters.gift25Yn}
                onChange={(e) => onFiltersChange({ ...filters, gift25Yn: e.target.value as "" | "Y" | "N" })}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm w-16"
              >
                <option value="">전체</option>
                <option value="Y">Y</option>
                <option value="N">N</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="font-medium text-sm text-muted-foreground mt-4">SHOW (추가 컬럼)</div>
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
              variant="outline"
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
