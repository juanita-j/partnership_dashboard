"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "dashboard_auth";

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const isLoginPage = pathname === "/dashboard/login";

  // 비밀번호 미설정(로컬)이면 로그인 없이 진입, 설정돼 있으면 sessionStorage 없을 때만 로그인으로
  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) {
      setChecked(true);
      return;
    }
    fetch("/api/auth/dashboard-required")
      .then((r) => r.json())
      .then((data: { required?: boolean }) => {
        if (data.required) {
          router.replace("/dashboard/login");
        } else {
          sessionStorage.setItem(SESSION_KEY, "1");
          setChecked(true);
        }
      })
      .catch(() => {
        router.replace("/dashboard/login");
      });
  }, [isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_KEY);
    }
    router.replace("/dashboard/login");
  };

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-sm">확인 중...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-700 bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-lg text-white">
            파트너사 DB 대시보드
          </Link>
          <nav className="flex gap-4">
            <Link href="/dashboard/company-alias" className="text-sm text-gray-400 hover:text-gray-200">
              회사명 매핑 조건
            </Link>
            <Link href="/dashboard/audit" className="text-sm text-gray-400 hover:text-gray-200">
              업데이트 이력
            </Link>
          </nav>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0 border-gray-500 text-gray-200 hover:bg-gray-700 hover:text-white">
          로그아웃
        </Button>
      </header>
      <main className="flex-1 p-4">
        {children}
      </main>
    </div>
  );
}
