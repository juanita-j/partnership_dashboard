import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "dashboard_auth";
const SALT = "partner-dashboard-salt";

async function sha256Hex(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API: /api/auth/* (로그인 등)는 인증 없이 허용, 그 외 /api/* 는 대시보드 인증 필수
  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/auth/")) {
      return NextResponse.next();
    }
    const expectedPassword = process.env.DASHBOARD_PASSWORD;
    if (!expectedPassword || expectedPassword.length === 0) {
      return NextResponse.next();
    }
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const expectedToken = await sha256Hex(expectedPassword + SALT);
    if (token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // /dashboard/login 은 비밀번호 입력 페이지 → 체크 제외
  if (pathname === "/dashboard/login") {
    return NextResponse.next();
  }

  // /dashboard 및 그 하위만 보호
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const expectedPassword = process.env.DASHBOARD_PASSWORD;
  if (!expectedPassword || expectedPassword.length === 0) {
    // 비밀번호 미설정 시 모든 접속 허용 (로컬 개발 등)
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const expectedToken = await sha256Hex(expectedPassword + SALT);

  if (token === expectedToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/dashboard/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/api/:path*"],
};
