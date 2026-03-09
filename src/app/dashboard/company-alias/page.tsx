"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type AliasRow = { id: string; normalizedName: string; alias: string; locale?: string };

/** 표준명별로 묶어 한 행에 표시 */
type GroupedRow = { normalizedName: string; aliases: string[]; ids: string[] };

function groupByNormalizedName(list: AliasRow[]): GroupedRow[] {
  const byName = new Map<string, { aliases: string[]; ids: string[] }>();
  for (const row of list) {
    const cur = byName.get(row.normalizedName) ?? { aliases: [], ids: [] };
    cur.aliases.push(row.alias);
    cur.ids.push(row.id);
    byName.set(row.normalizedName, cur);
  }
  return Array.from(byName.entries())
    .map(([normalizedName, { aliases, ids }]) => ({ normalizedName, aliases, ids }))
    .sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));
}

export default function CompanyAliasPage() {
  const [list, setList] = useState<AliasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIds, setEditingIds] = useState<string[] | null>(null);
  const [form, setForm] = useState({ normalizedName: "", alias: "" });
  const [saving, setSaving] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const editor = true;

  const load = () => {
    fetch("/api/company-alias")
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setList(data) : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = groupByNormalizedName(list);
  const sortedGrouped =
    sortOrder === "desc" ? [...grouped].sort((a, b) => b.normalizedName.localeCompare(a.normalizedName)) : grouped;

  const handleAdd = () => {
    if (!editor) return;
    setEditingIds(null);
    setForm({ normalizedName: "", alias: "" });
    setDialogOpen(true);
  };

  const handleEdit = (row: GroupedRow) => {
    if (!editor) return;
    setEditingIds(row.ids);
    setForm({ normalizedName: row.normalizedName, alias: row.aliases.join(", ") });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor || !form.normalizedName.trim()) return;
    const aliases = form.alias.split(",").map((a) => a.trim()).filter(Boolean);
    if (editingIds?.length) {
      if (!aliases.length) return;
      setSaving(true);
      try {
        for (const id of editingIds) {
          const res = await fetch(`/api/company-alias/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("삭제 실패");
        }
        for (const alias of aliases) {
          const res = await fetch("/api/company-alias", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ normalizedName: form.normalizedName.trim(), alias }),
          });
          if (!res.ok) throw new Error("저장 실패");
        }
        toast.success("수정되었습니다.");
        setDialogOpen(false);
        load();
      } catch {
        toast.error("수정에 실패했습니다.");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!aliases.length) return;
    setSaving(true);
    try {
      for (const alias of aliases) {
        const res = await fetch("/api/company-alias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ normalizedName: form.normalizedName.trim(), alias }),
        });
        if (!res.ok) throw new Error("저장 실패");
      }
      toast.success(`${aliases.length}개 매핑이 추가되었습니다.`);
      setDialogOpen(false);
      load();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: GroupedRow) => {
    if (!editor) return;
    if (!confirm(`표준명 "${row.normalizedName}"의 매핑 ${row.ids.length}개를 모두 삭제할까요?`)) return;
    try {
      for (const id of row.ids) {
        const res = await fetch(`/api/company-alias/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("삭제 실패");
      }
      toast.success("삭제되었습니다.");
      load();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">회사명 매핑 조건</h1>
        {editor && (
          <Button size="sm" onClick={handleAdd}>
            매핑 추가
          </Button>
        )}
      </div>
      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
        <li>엑셀파일로 업로드/직접 입력한 회사명 중 &apos;별칭&apos;에 해당되는 회사명이 &apos;표준명&apos;으로 자동 변환됩니다.</li>
        <li>한국 회사명은 한국어로 통일, 글로벌 회사명은 알파벳 표기로 통일합니다.</li>
      </ul>
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
                >
                  <span className="inline-flex items-center gap-0.5">
                    표준명
                    <span className="text-muted-foreground">{sortOrder === "asc" ? " ↑" : " ↓"}</span>
                  </span>
                </TableHead>
                <TableHead>별칭</TableHead>
                {editor && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGrouped.map((row) => (
                <TableRow key={row.normalizedName}>
                  <TableCell className="font-medium">{row.normalizedName}</TableCell>
                  <TableCell>{row.aliases.join(", ")}</TableCell>
                  {editor && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
                          수정
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(row)}
                        >
                          삭제
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIds?.length ? "매핑 수정" : "매핑 추가"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>표준명 (저장될 회사명)</Label>
              <Input
                value={form.normalizedName}
                onChange={(e) => setForm({ ...form, normalizedName: e.target.value })}
                placeholder="예: 현대차"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>별칭 (엑셀/입력에 나올 수 있는 표기)</Label>
              <Input
                value={form.alias}
                onChange={(e) => setForm({ ...form, alias: e.target.value })}
                placeholder="여러 개일 경우 쉼표(,)로 구분. 예: hyundai motors, 현대자동차"
                required={!editingIds?.length}
                className="mt-1"
              />
              {!editingIds?.length && (
                <p className="text-xs text-muted-foreground mt-1">하나의 표준명에 여러 별칭을 등록할 수 있습니다.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </Button>
              <DialogClose className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 py-2">
                취소
              </DialogClose>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
