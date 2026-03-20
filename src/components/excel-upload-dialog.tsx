"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type MergeDiffItem = {
  action: "create" | "update";
  partnerId?: string;
  matchKey: string;
  changes?: string[];
  partner?: { name?: string; companyNormalized?: string; email?: string };
};

interface ExcelUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onApplied: () => void;
  /** 기본 `/api`, 임원진은 `/api/executive` */
  apiRoot?: string;
  /** 감사 로그(import_apply) 구분용. 예: `executive_counterpart` */
  importSource?: string;
}

export function ExcelUploadDialog({
  open,
  onClose,
  onApplied,
  apiRoot = "/api",
  importSource,
}: ExcelUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [diff, setDiff] = useState<MergeDiffItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setDiff(null);
  };

  const handlePreview = async () => {
    if (!file) {
      toast.error("파일을 선택하세요.");
      return;
    }
    setLoading(true);
    setDiff(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${apiRoot}/import/excel`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.message || errBody?.error || "업로드 실패";
        throw new Error(typeof msg === "string" ? msg : "엑셀 파싱에 실패했습니다.");
      }
      const data = await res.json();
      setDiff(data.diff ?? []);
      toast.success(`총 ${data.totalRows ?? 0}행 분석됨. 변경사항을 확인한 뒤 적용하세요.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "엑셀 파싱에 실패했습니다.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!diff?.length) {
      toast.error("먼저 엑셀을 업로드하고 미리보기를 실행하세요.");
      return;
    }
    setApplying(true);
    /** Vercel 10s 제한에 맞추기 위해 청크당 행 수 축소 (요청당 DB 작업 수 감소) */
    const CHUNK_SIZE = 25;
    let totalCreated = 0;
    let totalUpdated = 0;
    try {
      for (let i = 0; i < diff.length; i += CHUNK_SIZE) {
        const chunk = diff.slice(i, i + CHUNK_SIZE);
        const res = await fetch(`${apiRoot}/import/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diff: chunk }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error((errBody?.error as string) || "적용 실패");
        }
        const data = await res.json();
        totalCreated += data.created ?? 0;
        totalUpdated += data.updated ?? 0;
      }
      try {
        await fetch("/api/dashboard/audit/log-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            created: totalCreated,
            updated: totalUpdated,
            filename: file?.name ?? "",
            ...(importSource ? { source: importSource } : {}),
          }),
        });
      } catch {
        // 이력 기록 실패해도 적용 완료는 유지
      }
      toast.success(`적용 완료: 신규 ${totalCreated}건, 수정 ${totalUpdated}건`);
      setDiff(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onApplied();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "적용에 실패했습니다.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>엑셀 업로드 (미리보기 후 적용)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="text-sm"
            />
            <Button size="sm" onClick={handlePreview} disabled={!file || loading}>
              {loading ? "분석 중..." : "미리보기"}
            </Button>
          </div>
          {diff && (
            <>
              <div className="rounded border p-3 max-h-60 overflow-y-auto space-y-3">
                <p className="text-sm font-medium">변경 예정: {diff.length}건</p>
                {diff.slice(0, 20).map((item, i) => (
                  <div key={i} className="text-sm border-b border-border pb-2 last:border-0">
                    <p className="font-medium text-foreground">
                      {item.action === "create" ? "신규" : "수정"}: {(item.partner?.name && item.partner.name !== "(이름없음)") ? item.partner.name : item.matchKey}
                    </p>
                    {item.action === "update" && item.changes?.length ? (
                      <p className="mt-1 text-muted-foreground">
                        <span className="font-medium text-foreground/80">수정 항목: </span>
                        {item.changes.map((c, j) => (
                          <span key={j}>
                            {j > 0 && " · "}
                            {c}
                          </span>
                        ))}
                      </p>
                    ) : item.action === "create" ? (
                      <p className="mt-1 text-muted-foreground">신규 생성 (회사/이름/휴대폰 등 엑셀 행 기준)</p>
                    ) : null}
                  </div>
                ))}
                {diff.length > 20 && (
                  <p className="text-muted-foreground text-xs">... 외 {diff.length - 20}건</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleApply} disabled={applying}>
                  {applying ? "적용 중..." : "적용"}
                </Button>
                <DialogClose className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 py-2">
                  취소
                </DialogClose>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
