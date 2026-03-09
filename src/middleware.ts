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
  matcher: ["/dashboard", "/dashboard/:path*"],
};
