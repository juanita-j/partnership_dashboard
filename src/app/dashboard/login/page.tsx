"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DashboardLoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/dashboard-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id.trim(), password }),
      });
      await res.json().catch(() => ({}));
      if (!res.ok) {
        setError("아이디나 비밀번호가 잘못되었습니다.");
        return;
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("dashboard_auth", "1");
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-xl font-semibold text-center">
          네이버 파트너십 DB 대시보드
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            inputMode="email"
            autoComplete="username"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="이메일 주소 (ID) 입력"
            className="w-full"
            disabled={loading}
          />
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            className="w-full"
            disabled={loading}
          />
          {error && (
            <p className="text-sm text-destructive text-center" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "확인 중..." : "로그인"}
          </Button>
        </form>
      </div>
    </div>
  );
}
