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

  /** "회사: A, 이름: B" 형태를 "이름: B, 회사: A"로 파싱해 반환. 없으면 원문 */
  const parseCompanyName = (line: string): { name?: string; company?: string } => {
    const nameMatch = line.match(/이름:\s*([^,]+)/);
    const companyMatch = line.match(/회사:\s*([^,]+)/);
    return {
      name: nameMatch ? nameMatch[1].trim() : undefined,
      company: companyMatch ? companyMatch[1].trim() : undefined,
    };
  };

  /** 상세 한 줄을 "파트너 삭제 (이름: xxx, 회사: xxx)" 형태로 포맷. 회사명은 맨 뒤 (주)·주식회사 제거 후 표시 */
  const formatDetailLine = (category: string, dataLine: string): string => {
    const { name, company } = parseCompanyName(dataLine);
    if (name !== undefined || company !== undefined) {
      const parts = [];
      if (name !== undefined) parts.push(`이름: ${name}`);
      if (company !== undefined) parts.push(`회사: ${stripCompanySuffixForDisplay(company)}`);
      return `${category} (${parts.join(", ")})`;
    }
    return dataLine || category;
  };

  /** 상세 항목에서 유형과 데이터 부분 분리 (토글 열렸을 때 그룹별 표시용) */
  const groupDetailItems = (items: string[]) => {
    const groups: Record<string, string[]> = {};
    const order = ["파트너 삭제", "파트너 추가", "파트너 수정", "엑셀파일 업로드", "기타"];
    const getCat = (s: string) => {
      const t = s.trim();
      if (t.startsWith("파트너 삭제")) return "파트너 삭제";
      if (t.startsWith("파트너 추가")) return "파트너 추가";
      if (t.startsWith("신규") || t.includes("건 추가") || t.includes("건 수정")) return "엑셀파일 업로드";
      if (t.startsWith("회사:") || t.includes("회사:") || t === "파트너 수정") return "파트너 수정";
      return "기타";
    };
    const getDataPart = (s: string, cat: string) => {
      const t = s.trim();
      if (cat === "파트너 삭제" && t.startsWith("파트너 삭제:")) return t.slice("파트너 삭제:".length).trim();
      if (cat === "파트너 추가" && t.startsWith("파트너 추가:")) return t.slice("파트너 추가:".length).trim();
      if (cat === "파트너 수정") return t;
      return t;
    };
    for (const item of items) {
      const cat = getCat(item);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(getDataPart(item, cat));
    }
    return order.filter((cat) => groups[cat]?.length).map((cat) => ({ category: cat, lines: groups[cat]! }));
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
                              <div className="font-medium text-muted-foreground mb-2">상세 내용</div>
                              {row.detailItems && row.detailItems.length > 0 ? (
                                <div className="space-y-4">
                                  {groupDetailItems(row.detailItems).map(({ category, lines }) => (
                                    <div key={category}>
                                      <div className="font-medium text-foreground mb-1">
                                        {category} ({lines.length}건)
                                      </div>
                                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                                        {lines.map((line, i) => (
                                          <li key={i} className="break-words">
                                            {["파트너 삭제", "파트너 추가", "파트너 수정"].includes(category)
                                              ? formatDetailLine(category, line)
                                              : line}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="whitespace-pre-wrap break-words">{row.detailSummary}</div>
                              )}
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
