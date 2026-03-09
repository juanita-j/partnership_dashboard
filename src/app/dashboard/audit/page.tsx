"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { stripCompanySuffixForDisplay } from "@/lib/company-display";

type AuditRow = {
  id: string;
  versionName: string;
  userId: string;
  workType: string;
  detailSummary: string;
  detailItems?: string[];
  createdAt: string;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

export default function AuditPage() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [userIdFilter, setUserIdFilter] = useState("");
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleDetail = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (userIdFilter.trim()) params.set("userId", userIdFilter.trim());
    params.set("page", String(page));
    params.set("limit", "50");
    fetch(`/api/dashboard/audit?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        setData(Array.isArray(res.data) ? res.data : []);
        setPagination(res.pagination ?? null);
      })
      .catch(() => {
        setData([]);
        setPagination(null);
      })
      .finally(() => setLoading(false));
  }, [userIdFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("ko-KR");
    } catch {
      return iso;
    }
  };

  /** "회사: A, 이름: B" 형태 파싱 */
  const parseCompanyName = (line: string): { name?: string; company?: string } => {
    const nameMatch = line.match(/이름:\s*([^,]+)/);
    const companyMatch = line.match(/회사:\s*([^,]+)/);
    return {
      name: nameMatch ? nameMatch[1].trim() : undefined,
      company: companyMatch ? companyMatch[1].trim() : undefined,
    };
  };

  /** 상세 항목이 JSON 형태( summary + changes )인지 확인 */
  const parseDetailJson = (line: string): { summary: string; changes: string[] } | null => {
    const t = line.trim();
    if (!t.startsWith("{")) return null;
    try {
      const o = JSON.parse(t) as { summary?: string; changes?: string[] };
      if (o && (o.summary != null || (Array.isArray(o.changes) && o.changes.length > 0)))
        return { summary: o.summary ?? "", changes: Array.isArray(o.changes) ? o.changes : [] };
    } catch {
      return null;
    }
    return null;
  };

  /** "필드명 이전 → 이후" 를 "필드명 (이전 → 이후)" 로 포맷 */
  const formatChangeWithParens = (c: string): string => {
    const arrow = " → ";
    const idx = c.indexOf(arrow);
    if (idx === -1) return c;
    const before = c.slice(0, idx).trim();
    const after = c.slice(idx + arrow.length).trim();
    const spaceIdx = before.lastIndexOf(" ");
    if (spaceIdx <= 0) return `${before} (${after})`;
    const label = before.slice(0, spaceIdx).trim();
    const oldVal = before.slice(spaceIdx + 1).trim();
    return `${label} (${oldVal}${arrow}${after})`;
  };

  type DetailEntry = { kind: "수정" | "신규" | "삭제" | "엑셀"; name: string; detail: string };

  /** 상세 항목을 예시 포맷용 평탄 목록으로 변환 */
  const flattenDetailEntries = (items: string[]): DetailEntry[] => {
    const entries: DetailEntry[] = [];
    const getCat = (s: string) => {
      const t = s.trim();
      if (t.startsWith("파트너 삭제")) return "파트너 삭제";
      if (t.startsWith("파트너 추가")) return "파트너 추가";
      if (t.startsWith("신규") || t.includes("건 추가") || t.includes("건 수정")) return "엑셀파일 업로드";
      if (parseDetailJson(t)) return "파트너 수정";
      if (t.startsWith("회사:") || t.includes("회사:") || t === "파트너 수정") return "파트너 수정";
      return "기타";
    };
    for (const item of items) {
      const cat = getCat(item);
      let dataLine = item.trim();
      if (cat === "파트너 삭제" && dataLine.startsWith("파트너 삭제:"))
        dataLine = dataLine.slice("파트너 삭제:".length).trim();
      if (cat === "파트너 추가" && dataLine.startsWith("파트너 추가:"))
        dataLine = dataLine.slice("파트너 추가:".length).trim();

      const json = parseDetailJson(dataLine);
      if (json) {
        const { name } = parseCompanyName(json.summary);
        const displayName = name ?? "(이름없음)";
        const changeStr =
          json.changes.length > 0
            ? json.changes.map(formatChangeWithParens).join(", ")
            : "";
        entries.push({ kind: "수정", name: displayName, detail: changeStr });
        continue;
      }
      if (cat === "파트너 삭제") {
        const { name } = parseCompanyName(dataLine);
        entries.push({ kind: "삭제", name: name ?? "(이름없음)", detail: "" });
        continue;
      }
      if (cat === "파트너 추가") {
        const { name } = parseCompanyName(dataLine);
        entries.push({
          kind: "신규",
          name: name ?? "(이름없음)",
          detail: "신규 생성 (회사/이름/휴대폰 등 엑셀 행 기준)",
        });
        continue;
      }
      if (cat === "엑셀파일 업로드") {
        entries.push({ kind: "엑셀", name: "", detail: dataLine });
        continue;
      }
      if (cat === "파트너 수정" && dataLine) {
        const { name } = parseCompanyName(dataLine);
        entries.push({ kind: "수정", name: name ?? "(이름없음)", detail: dataLine });
      }
    }
    return entries;
  };

  /** 상세 토글 본문: "변경 내용: N건" + 수정/신규/삭제 목록 포맷 */
  const renderDetailBody = (detailItems: string[]) => {
    const entries = flattenDetailEntries(detailItems);
    if (entries.length === 0) return null;
    return (
      <div className="space-y-4 text-sm">
        <p className="font-medium text-foreground">변경 내용: {entries.length}건</p>
        <div className="space-y-3">
          {entries.map((e, i) => (
            <div key={i} className="space-y-1">
              {e.kind === "엑셀" ? (
                <p className="text-foreground">{e.detail}</p>
              ) : (
                <>
                  <p className="font-medium text-foreground">
                    {e.kind === "수정" && "수정: "}
                    {e.kind === "신규" && "신규: "}
                    {e.kind === "삭제" && "삭제: "}
                    {e.name}
                  </p>
                  {e.detail ? (
                    <p className="text-muted-foreground pl-0">
                      {e.kind === "수정" ? "수정 항목: " : ""}
                      {e.detail}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold">업데이트 이력</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="수정인명(이메일)으로 필터"
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
          className="max-w-xs h-9"
        />
        <Button size="sm" variant="outline" onClick={() => setPage(1)} disabled={loading}>
          조회
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>버전명</TableHead>
                  <TableHead>일시</TableHead>
                  <TableHead>수정인명</TableHead>
                  <TableHead>작업유형</TableHead>
                  <TableHead>상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      기록이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => {
                    const isExpanded = expandedIds.has(row.id);
                    return (
                      <Fragment key={row.id}>
                        <TableRow>
                          <TableCell className="text-sm font-medium">{row.versionName}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{formatDate(row.createdAt)}</TableCell>
                          <TableCell className="text-sm">{row.userId}</TableCell>
                          <TableCell className="text-sm">{row.workType}</TableCell>
                          <TableCell
                            className="text-sm max-w-[320px] truncate cursor-pointer select-none hover:bg-muted/50 align-middle"
                            onClick={() => toggleDetail(row.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleDetail(row.id);
                              }
                            }}
                            title={row.detailSummary}
                          >
                            <span className="inline-flex items-center gap-1">
                              <span className="truncate">{row.detailSummary}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                              )}
                            </span>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={5} className="p-3 text-sm border-t border-border/50">
                              {row.detailItems && row.detailItems.length > 0
                                ? renderDetailBody(row.detailItems)
                                : <div className="whitespace-pre-wrap break-words">{row.detailSummary}</div>}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                이전
              </Button>
              <span>
                {page} / {pagination.totalPages} (총 {pagination.total}건)
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
