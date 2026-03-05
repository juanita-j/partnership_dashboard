import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-lg">
            파트너사 DB 대시보드
          </Link>
          <nav className="flex gap-4">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              파트너 목록
            </Link>
            <Link href="/dashboard/company-alias" className="text-sm text-muted-foreground hover:text-foreground">
              회사명 매핑
            </Link>
          </nav>
        </div>
        <div>
          <Link href="/api/auth/signout?callbackUrl=/login" className="text-sm text-muted-foreground hover:text-foreground">
            로그아웃
          </Link>
        </div>
      </header>
      <main className="flex-1 p-4">
        {children}
      </main>
    </div>
  );
}
