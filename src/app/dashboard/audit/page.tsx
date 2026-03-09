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

type AuditRow = {
  id: string;
  versionName: string;
  userId: string;
  workType: string;
  detail: string;
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
                            title={row.detail}
                          >
                            <span className="inline-flex items-center gap-1">
                              <span className="truncate">{row.detail}</span>
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
                              <div className="font-medium text-muted-foreground mb-1">상세 내용</div>
                              {row.detailItems && row.detailItems.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1">
                                  {row.detailItems.map((item, i) => (
                                    <li key={i} className="whitespace-pre-wrap break-words">
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="whitespace-pre-wrap break-words">{row.detail}</div>
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
