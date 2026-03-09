import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const COOKIE_NAME = "dashboard_auth";
const SALT = "partner-dashboard-salt";

function tokenFromPassword(password: string): string {
  return createHash("sha256").update(password + SALT).digest("hex");
}

export async function POST(request: NextRequest) {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected || expected.length === 0) {
    return NextResponse.json(
      { error: "비밀번호가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password !== expected) {
    return NextResponse.json(
      { error: "비밀번호가 일치하지 않습니다." },
      { status: 401 }
    );
  }

  const token = tokenFromPassword(expected);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // maxAge 미설정 → 세션 쿠키. 브라우저(탭)를 모두 닫았다가 다시 접속하면 삭제되어 비밀번호 입력 화면이 다시 뜸.
  });
  return res;
}
