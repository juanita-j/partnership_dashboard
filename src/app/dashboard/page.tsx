"use client";

import { useState, useCallback, useEffect } from "react";
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
    gift2024: sp.get("gift2024") === "true",
    gift2025: sp.get("gift2025") === "true",
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
  if (f.gift2024) p.set("gift2024", "true");
  if (f.gift2025) p.set("gift2025", "true");
  if (f.inviter) p.set("inviter", f.inviter);
  if (f.giftSender) p.set("giftSender", f.giftSender);
  if (f.showColumns.length) p.set("showColumns", JSON.stringify(f.showColumns));
  return p;
}

export default function DashboardPage() {
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
