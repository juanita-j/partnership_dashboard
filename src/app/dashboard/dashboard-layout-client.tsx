"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

  // 창을 닫았다 새 탭/창으로 열면 sessionStorage가 비어 있어 로그인 페이지로 보냄
  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(SESSION_KEY)) {
      router.replace("/dashboard/login");
      return;
    }
    setChecked(true);
  }, [isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

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
              버전 업데이트 이력
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 p-4">
        {children}
      </main>
    </div>
  );
}
