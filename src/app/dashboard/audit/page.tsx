"use client";

import { useState, useEffect, useCallback } from "react";
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

type AuditRow = {
  id: string;
  userId: string;
  action: string;
  actionLabel: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

export default function AuditPage() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [userIdFilter, setUserIdFilter] = useState("");
  const [page, setPage] = useState(1);

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
      const d = new Date(iso);
      return d.toLocaleString("ko-KR");
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold">ID별 버전 업데이트</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="ID(이메일)로 필터"
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
                  <TableHead className="w-[160px]">일시</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>작업 유형</TableHead>
                  <TableHead>대상 ID</TableHead>
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
                  data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(row.createdAt)}</TableCell>
                      <TableCell className="text-sm">{row.userId}</TableCell>
                      <TableCell className="text-sm">{row.actionLabel}</TableCell>
                      <TableCell className="text-xs font-mono">{row.entityId ?? "-"}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={row.details ?? ""}>
                        {row.details ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))
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
