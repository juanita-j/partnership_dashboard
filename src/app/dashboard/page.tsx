"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/filter-bar";
import { PartnersTable } from "@/components/partners-table";
import { PartnerDetailSheet } from "@/components/partner-detail-sheet";
import { ExcelUploadDialog } from "@/components/excel-upload-dialog";
import { Button } from "@/components/ui/button";
import { Upload, Plus, Download } from "lucide-react";
import type { FilterState, FilterYn } from "./types";
import { defaultFilters } from "./types";

/** 기본 표시 연도. 2026년 등은 엑셀 업로드로 DB에 연도가 생긴 뒤 /api/event-years에 포함되면 그때부터 표시됨 */
const DEFAULT_EVENT_YEARS = [2023, 2024, 2025];

function filtersFromSearchParams(sp: URLSearchParams, eventYears: number[]): FilterState {
  const base: FilterState = {
    employmentStatus: sp.get("employmentStatus") ?? "",
    name: sp.get("name") ?? "",
    company: sp.get("company") ?? "",
    department: sp.get("department") ?? "",
    title: sp.get("title") ?? "",
    inviter: sp.get("inviter") ?? "",
    giftSender: sp.get("giftSender") ?? "",
    showColumns: (() => {
      try {
        const j = sp.get("showColumns");
        if (!j) return [];
        return JSON.parse(j) as FilterState["showColumns"];
      } catch {
        return [];
      }
    })(),
    showEventYears: (() => {
      const v = sp.get("showEventYears");
      if (!v) return [];
      return v.split(",").map((y) => parseInt(y.trim(), 10)).filter((y) => !isNaN(y));
    })(),
  };
  for (const year of eventYears) {
    const yy = year % 100;
    base[`dan${yy}`] = sp.get(`dan${yy}`) === "true";
    const danYn = sp.get(`dan${yy}Yn`);
    base[`dan${yy}Yn`] = (danYn === "Y" || danYn === "N" ? danYn : "") as FilterYn;
    base[`gift${year}`] = sp.get(`gift${year}`) === "true";
    const giftYn = sp.get(`gift${yy}Yn`);
    base[`gift${yy}Yn`] = (giftYn === "Y" || giftYn === "N" ? giftYn : "") as FilterYn;
  }
  return base;
}

function filtersToSearchParams(f: FilterState, eventYears: number[]): URLSearchParams {
  const p = new URLSearchParams();
  if (f.employmentStatus) p.set("employmentStatus", f.employmentStatus);
  if (f.name) p.set("name", f.name);
  if (f.company) p.set("company", f.company);
  if (f.department) p.set("department", f.department);
  if (f.title) p.set("title", f.title);
  if (f.inviter) p.set("inviter", f.inviter);
  if (f.giftSender) p.set("giftSender", f.giftSender);
  if (f.showColumns.length) p.set("showColumns", JSON.stringify(f.showColumns));
  if (f.showEventYears?.length) p.set("showEventYears", f.showEventYears.join(","));
  for (const year of eventYears) {
    const yy = year % 100;
    if (f[`dan${yy}`]) p.set(`dan${yy}`, "true");
    if (f[`dan${yy}Yn`]) p.set(`dan${yy}Yn`, String(f[`dan${yy}Yn`]));
    if (f[`gift${year}`]) p.set(`gift${year}`, "true");
    if (f[`gift${yy}Yn`]) p.set(`gift${yy}Yn`, String(f[`gift${yy}Yn`]));
  }
  return p;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [eventYears, setEventYears] = useState<number[]>(DEFAULT_EVENT_YEARS);
  const [filters, setFiltersState] = useState<FilterState>(defaultFilters);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [excelOpen, setExcelOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const editor = true;

  useEffect(() => {
    fetch("/api/event-years")
      .then((r) => r.json())
      .then((data: { years?: number[] }) => {
        if (!Array.isArray(data.years) || data.years.length === 0) return;
        const sorted = [...data.years].sort((a, b) => a - b);
        setEventYears(sorted);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setFiltersState(filtersFromSearchParams(searchParams, eventYears));
  }, [searchParams, eventYears]);

  const setFilters = useCallback(
    (f: FilterState) => {
      setFiltersState(f);
      const q = filtersToSearchParams(f, eventYears).toString();
      const url = q ? `?${q}` : window.location.pathname;
      window.history.replaceState(null, "", url);
    },
    [eventYears]
  );

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    fetch("/api/event-years")
      .then((r) => r.json())
      .then((data: { years?: number[] }) => {
        if (Array.isArray(data.years) && data.years.length > 0) {
          setEventYears([...data.years].sort((a, b) => a - b));
        }
      })
      .catch(() => {});
  }, []);

  const exportUrl =
    `/api/export/xlsx?${filtersToSearchParams(filters, eventYears).toString()}&columns=${encodeURIComponent(JSON.stringify(filters.showColumns))}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold">파트너사 목록</h1>
        <div className="flex gap-2">
          {editor && (
            <a href="/api/template" download="partner_template.xlsx">
              <Button variant="outline" size="sm" type="button">
                템플릿 다운로드
              </Button>
            </a>
          )}
          <a
            href={exportUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
          >
            <Button variant="outline" size="sm" type="button">
              <Download className="h-4 w-4 mr-2" />
              엑셀 다운로드
            </Button>
          </a>
          {editor && (
            <>
              <Button variant="outline" size="sm" onClick={() => setExcelOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                엑셀 업로드
              </Button>
              <Button size="sm" onClick={() => setSelectedPartnerId("new")}>
                <Plus className="h-4 w-4 mr-2" />
                파트너사 추가
              </Button>
            </>
          )}
        </div>
      </div>
      <FilterBar filters={filters} eventYears={eventYears} onFiltersChange={setFilters} onRefresh={refresh} />
      <PartnersTable
        filters={filters}
        eventYears={eventYears}
        refreshKey={refreshKey}
        onSelectPartner={setSelectedPartnerId}
        onRefresh={refresh}
        canEdit={!!editor}
      />
      <PartnerDetailSheet
        partnerId={selectedPartnerId}
        eventYears={eventYears}
        onClose={() => setSelectedPartnerId(null)}
        onSaved={refresh}
        canEdit={!!editor}
      />
      <ExcelUploadDialog open={excelOpen} onClose={() => setExcelOpen(false)} onApplied={refresh} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-4">로딩 중...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
