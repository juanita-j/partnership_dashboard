"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/filter-bar";
import { PartnersTable } from "@/components/partners-table";
import { PartnerDetailSheet } from "@/components/partner-detail-sheet";
import { ExcelUploadDialog } from "@/components/excel-upload-dialog";
import { Button } from "@/components/ui/button";
import { Upload, Plus, Download } from "lucide-react";
import type { FilterState } from "./types";
import { defaultFilters } from "./types";

function filtersFromSearchParams(sp: URLSearchParams): FilterState {
  return {
    employmentStatus: sp.get("employmentStatus") ?? "",
    name: sp.get("name") ?? "",
    company: sp.get("company") ?? "",
    department: sp.get("department") ?? "",
    title: sp.get("title") ?? "",
    dan23: sp.get("dan23") === "true",
    dan24: sp.get("dan24") === "true",
    dan25: sp.get("dan25") === "true",
    dan23Yn: (sp.get("dan23Yn") === "Y" || sp.get("dan23Yn") === "N" ? sp.get("dan23Yn") : "") as FilterState["dan23Yn"],
    dan24Yn: (sp.get("dan24Yn") === "Y" || sp.get("dan24Yn") === "N" ? sp.get("dan24Yn") : "") as FilterState["dan24Yn"],
    dan25Yn: (sp.get("dan25Yn") === "Y" || sp.get("dan25Yn") === "N" ? sp.get("dan25Yn") : "") as FilterState["dan25Yn"],
    gift2024: sp.get("gift2024") === "true",
    gift2025: sp.get("gift2025") === "true",
    gift24Yn: (sp.get("gift24Yn") === "Y" || sp.get("gift24Yn") === "N" ? sp.get("gift24Yn") : "") as FilterState["gift24Yn"],
    gift25Yn: (sp.get("gift25Yn") === "Y" || sp.get("gift25Yn") === "N" ? sp.get("gift25Yn") : "") as FilterState["gift25Yn"],
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
  };
}

function filtersToSearchParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.employmentStatus) p.set("employmentStatus", f.employmentStatus);
  if (f.name) p.set("name", f.name);
  if (f.company) p.set("company", f.company);
  if (f.department) p.set("department", f.department);
  if (f.title) p.set("title", f.title);
  if (f.dan23) p.set("dan23", "true");
  if (f.dan24) p.set("dan24", "true");
  if (f.dan25) p.set("dan25", "true");
  if (f.dan23Yn) p.set("dan23Yn", f.dan23Yn);
  if (f.dan24Yn) p.set("dan24Yn", f.dan24Yn);
  if (f.dan25Yn) p.set("dan25Yn", f.dan25Yn);
  if (f.gift2024) p.set("gift2024", "true");
  if (f.gift2025) p.set("gift2025", "true");
  if (f.gift24Yn) p.set("gift24Yn", f.gift24Yn);
  if (f.gift25Yn) p.set("gift25Yn", f.gift25Yn);
  if (f.inviter) p.set("inviter", f.inviter);
  if (f.giftSender) p.set("giftSender", f.giftSender);
  if (f.showColumns.length) p.set("showColumns", JSON.stringify(f.showColumns));
  return p;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [filters, setFiltersState] = useState<FilterState>(defaultFilters);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [excelOpen, setExcelOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const editor = true;

  useEffect(() => {
    setFiltersState(filtersFromSearchParams(searchParams));
  }, [searchParams]);

  const setFilters = useCallback((f: FilterState) => {
    setFiltersState(f);
    const q = filtersToSearchParams(f).toString();
    const url = q ? `?${q}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const exportUrl =
    typeof window !== "undefined"
      ? `/api/export/xlsx?${filtersToSearchParams(filters).toString()}&columns=${encodeURIComponent(JSON.stringify(filters.showColumns))}`
      : "#";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">파트너사 목록</h1>
        <div className="flex gap-2">
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
              <a href="/api/template" download="partner_template.xlsx">
                <Button variant="outline" size="sm" type="button">
                  템플릿 다운로드
                </Button>
              </a>
              <Button variant="outline" size="sm" onClick={() => setExcelOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                엑셀 업로드
              </Button>
              <Button size="sm" onClick={() => setSelectedPartnerId("new")}>
                <Plus className="h-4 w-4 mr-2" />
                파트너 추가
              </Button>
            </>
          )}
        </div>
      </div>
      <FilterBar filters={filters} onFiltersChange={setFilters} onRefresh={refresh} canSaveFilter={!!editor} />
      <PartnersTable
        filters={filters}
        refreshKey={refreshKey}
        onSelectPartner={setSelectedPartnerId}
        onRefresh={refresh}
        canEdit={!!editor}
      />
      <PartnerDetailSheet
        partnerId={selectedPartnerId}
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
