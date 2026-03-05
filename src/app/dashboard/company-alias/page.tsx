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

type AliasRow = { id: string; normalizedName: string; alias: string; locale: string };

export default function CompanyAliasPage() {
  const [list, setList] = useState<AliasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ normalizedName: "", alias: "", locale: "" });
  const [saving, setSaving] = useState(false);
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

  const handleAdd = () => {
    if (!editor) return;
    setEditingId(null);
    setForm({ normalizedName: "", alias: "", locale: "ko" });
    setDialogOpen(true);
  };

  const handleEdit = (row: AliasRow) => {
    if (!editor) return;
    setEditingId(row.id);
    setForm({ normalizedName: row.normalizedName, alias: row.alias, locale: row.locale || "" });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor || !form.normalizedName.trim()) return;
    const aliases = form.alias.split(",").map((a) => a.trim()).filter(Boolean);
    if (editingId) {
      if (!aliases.length) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/company-alias/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ normalizedName: form.normalizedName.trim(), alias: aliases[0], locale: form.locale.trim() || "" }),
        });
        if (!res.ok) throw new Error("수정 실패");
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
          body: JSON.stringify({
            normalizedName: form.normalizedName.trim(),
            alias,
            locale: form.locale.trim() || "",
          }),
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

  const handleDelete = async (id: string) => {
    if (!editor) return;
    if (!confirm("이 매핑을 삭제할까요?")) return;
    try {
      const res = await fetch(`/api/company-alias/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      toast.success("삭제되었습니다.");
      load();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">회사명 표준화 매핑</h1>
        {editor && (
          <Button size="sm" onClick={handleAdd}>
            매핑 추가
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        엑셀/입력 시 회사명이 표준명(normalizedName)으로 자동 변환됩니다. alias에 여러 표기를 등록하세요.
      </p>
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>표준명 (normalizedName)</TableHead>
                <TableHead>별칭 (alias)</TableHead>
                <TableHead>locale</TableHead>
                {editor && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.normalizedName}</TableCell>
                  <TableCell>{row.alias}</TableCell>
                  <TableCell>{row.locale || "-"}</TableCell>
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
                          onClick={() => handleDelete(row.id)}
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
            <DialogTitle>{editingId ? "매핑 수정" : "매핑 추가"}</DialogTitle>
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
                required={!editingId}
                className="mt-1"
              />
              {!editingId && (
                <p className="text-xs text-muted-foreground mt-1">하나의 표준명에 여러 별칭을 등록할 수 있습니다.</p>
              )}
            </div>
            <div>
              <Label>locale (선택)</Label>
              <Input
                value={form.locale}
                onChange={(e) => setForm({ ...form, locale: e.target.value })}
                placeholder="ko / en"
                className="mt-1"
              />
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
