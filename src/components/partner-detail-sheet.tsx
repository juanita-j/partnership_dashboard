"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type PartnerDetail = {
  id: string;
  status: string;
  name: string;
  phone: string | null;
  companyNormalized: string;
  department: string | null;
  title: string | null;
  email: string | null;
  address: string | null;
  businessCardDateRaw: string | null;
  employmentStatus: string;
  employmentUpdatedAtRaw: string | null;
  history: string | null;
  eventsByYear: Record<
    number,
    {
      danInvitedRaw?: string;
      danInviter?: string;
      giftSentRaw?: string;
      giftItem?: string;
      giftQtyRaw?: string;
      giftSender?: string;
    }
  >;
};

interface PartnerDetailSheetProps {
  partnerId: string | null;
  eventYears?: number[];
  onClose: () => void;
  onSaved: () => void;
  canEdit: boolean;
}

const DEFAULT_YEARS = [2023, 2024, 2025];

export function PartnerDetailSheet({
  partnerId,
  eventYears = DEFAULT_YEARS,
  onClose,
  onSaved,
  canEdit,
}: PartnerDetailSheetProps) {
  const [open, setOpen] = useState(!!partnerId);
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [events, setEvents] = useState<Record<number, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOpen(!!partnerId);
    if (!partnerId || partnerId === "new") {
      setPartner(null);
      setForm({
        status: "active",
        name: "",
        phone: "",
        companyNormalized: "",
        department: "",
        title: "",
        email: "",
        address: "",
        businessCardDateRaw: "",
        employmentStatus: "재직",
        employmentUpdatedAtRaw: "",
        history: "",
      });
      setEvents(
        Object.fromEntries(
          eventYears.map((y) => [
            y,
            {
              danInvitedRaw: "",
              danInviter: "",
              giftSentRaw: "",
              giftItem: "",
              giftQtyRaw: "",
              giftSender: "",
            },
          ])
        )
      );
      return;
    }
    setLoading(true);
    fetch(`/api/partners/${partnerId}`)
      .then((r) => r.json())
      .then((data) => {
        setPartner(data);
        setForm({
          status: data.status ?? "active",
          name: data.name ?? "",
          phone: data.phone ?? "",
          companyNormalized: data.companyNormalized ?? "",
          department: data.department ?? "",
          title: data.title ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          businessCardDateRaw: data.businessCardDateRaw ?? "",
          employmentStatus: data.employmentStatus ?? "재직",
          employmentUpdatedAtRaw: data.employmentUpdatedAtRaw ?? "",
          history: data.history ?? "",
        });
        const allYears = [...new Set([...eventYears, ...Object.keys(data.eventsByYear ?? {}).map(Number)])].sort((a, b) => a - b);
        const evMap: Record<number, Record<string, unknown>> = {};
        allYears.forEach((y) => {
          const ev = data.eventsByYear?.[y];
          evMap[y] = {
            danInvitedRaw: ev?.danInvitedRaw ?? "",
            danInviter: ev?.danInviter ?? "",
            giftSentRaw: ev?.giftSentRaw ?? "",
            giftItem: ev?.giftItem ?? "",
            giftQtyRaw: ev?.giftQtyRaw ?? "",
            giftSender: ev?.giftSender ?? "",
          };
        });
        setEvents(evMap);
      })
      .catch(() => setPartner(null))
      .finally(() => setLoading(false));
  }, [partnerId, eventYears]);

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      if (partnerId === "new") {
        const res = await fetch("/api/partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("생성 실패");
        const created = await res.json();
        for (const y of Object.keys(events).map(Number).sort((a, b) => a - b)) {
          const ev = events[y];
          await fetch(`/api/partners/${created.id}/events`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              year: y,
              danInvitedRaw: ev?.danInvitedRaw ?? "",
              danInviter: ev?.danInviter ?? "",
              giftSentRaw: ev?.giftSentRaw ?? "",
              giftItem: ev?.giftItem ?? "",
              giftQtyRaw: ev?.giftQtyRaw ?? "",
              giftSender: ev?.giftSender ?? "",
            }),
          });
        }
        toast.success("파트너가 추가되었습니다.");
        onSaved();
        onClose();
        return;
      }
      if (partner?.id) {
        const res = await fetch(`/api/partners/${partner.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("수정 실패");
        for (const y of Object.keys(events).map(Number).sort((a, b) => a - b)) {
          const ev = events[y];
          await fetch(`/api/partners/${partner.id}/events`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              year: y,
              danInvitedRaw: ev?.danInvitedRaw ?? "",
              danInviter: ev?.danInviter ?? "",
              giftSentRaw: ev?.giftSentRaw ?? "",
              giftItem: ev?.giftItem ?? "",
              giftQtyRaw: ev?.giftQtyRaw ?? "",
              giftSender: ev?.giftSender ?? "",
            }),
          });
        }
        toast.success("저장되었습니다.");
        onSaved();
        onClose();
      }
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit || !partner?.id) return;
    if (!confirm("이 파트너를 삭제할까요?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/partners/${partner.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      toast.success("삭제되었습니다.");
      onSaved();
      onClose();
    } catch {
      toast.error("삭제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const isNew = partnerId === "new";
  const title = isNew ? "파트너 추가" : (partner?.name ?? "상세");

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {loading ? (
          <div className="py-8 text-center">로딩 중...</div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="grid gap-2">
              <Label>상태 (자유 입력)</Label>
              <Input
                value={String(form.status ?? "")}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                placeholder="active / non_active"
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label>이름 *</Label>
              <Input
                value={String(form.name ?? "")}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label>회사</Label>
              <Input
                value={String(form.companyNormalized ?? "")}
                onChange={(e) => setForm({ ...form, companyNormalized: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label>이메일</Label>
              <Input
                value={String(form.email ?? "")}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label>휴대폰</Label>
              <Input
                value={String(form.phone ?? "")}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label>부서</Label>
              <Input
                value={String(form.department ?? "")}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label>직함</Label>
              <Input
                value={String(form.title ?? "")}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label>회사 주소</Label>
              <Input
                value={String(form.address ?? "")}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label>재직상태 (자유 입력)</Label>
              <Input
                value={String(form.employmentStatus ?? "")}
                onChange={(e) => setForm({ ...form, employmentStatus: e.target.value })}
                placeholder="재직 / 휴직 / 퇴직 / N/A"
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label>명함 등록일 (원문)</Label>
              <Input
                value={String(form.businessCardDateRaw ?? "")}
                onChange={(e) => setForm({ ...form, businessCardDateRaw: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label>재직상태 업데이트일자 (원문)</Label>
              <Input
                value={String(form.employmentUpdatedAtRaw ?? "")}
                onChange={(e) => setForm({ ...form, employmentUpdatedAtRaw: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label>비고(히스토리)</Label>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={String(form.history ?? "")}
                onChange={(e) => setForm({ ...form, history: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div>
              <h4 className="font-medium mb-2">연도별 이벤트 (값 그대로 저장)</h4>
              {Object.keys(events)
                .map(Number)
                .sort((a, b) => a - b)
                .map((y) => (
                <div key={y} className="border rounded p-3 mb-2 space-y-2">
                  <span className="font-medium">{y}년</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Label>초청여부(원문)</Label>
                    <Input
                      value={String(events[y]?.danInvitedRaw ?? "")}
                      onChange={(e) =>
                        setEvents({
                          ...events,
                          [y]: { ...events[y], danInvitedRaw: e.target.value },
                        })
                      }
                      placeholder="O, X, N/A 등"
                      disabled={!canEdit}
                    />
                    <Label>초청인</Label>
                    <Input
                      value={String(events[y]?.danInviter ?? "")}
                      onChange={(e) =>
                        setEvents({
                          ...events,
                          [y]: { ...events[y], danInviter: e.target.value },
                        })
                      }
                      disabled={!canEdit}
                    />
                    <Label>선물 발송여부(원문)</Label>
                    <Input
                      value={String(events[y]?.giftSentRaw ?? "")}
                      onChange={(e) =>
                        setEvents({
                          ...events,
                          [y]: { ...events[y], giftSentRaw: e.target.value },
                        })
                      }
                      placeholder="O, X, N/A 등"
                      disabled={!canEdit}
                    />
                    <Label>품목</Label>
                    <Input
                      value={String(events[y]?.giftItem ?? "")}
                      onChange={(e) =>
                        setEvents({
                          ...events,
                          [y]: { ...events[y], giftItem: e.target.value },
                        })
                      }
                      disabled={!canEdit}
                    />
                    <Label>발송 개수(원문)</Label>
                    <Input
                      value={String(events[y]?.giftQtyRaw ?? "")}
                      onChange={(e) =>
                        setEvents({
                          ...events,
                          [y]: { ...events[y], giftQtyRaw: e.target.value },
                        })
                      }
                      placeholder="1, N/A 등"
                      disabled={!canEdit}
                    />
                    <Label>발송인</Label>
                    <Input
                      value={String(events[y]?.giftSender ?? "")}
                      onChange={(e) =>
                        setEvents({
                          ...events,
                          [y]: { ...events[y], giftSender: e.target.value },
                        })
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              ))}
            </div>
            {canEdit && (
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "저장 중..." : "저장"}
                </Button>
                {!isNew && partner?.id && (
                  <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                    삭제
                  </Button>
                )}
                <SheetClose className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 py-2">
                  닫기
                </SheetClose>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
