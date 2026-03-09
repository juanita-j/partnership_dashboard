import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const COOKIE_NAME = "dashboard_auth";
const USER_ID_COOKIE = "dashboard_user_id";
const SALT = "partner-dashboard-salt";

function tokenFromPassword(password: string): string {
  return createHash("sha256").update(password + SALT).digest("hex");
}

function parseAllowedIds(envValue: string | undefined): string[] {
  if (!envValue || !envValue.trim()) return [];
  return envValue
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** 이메일 형식 간단 검사 */
function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export async function POST(request: NextRequest) {
  const expectedPasswordRaw = process.env.DASHBOARD_PASSWORD ?? "";
  const expectedPassword = expectedPasswordRaw.trim();
  const allowedIds = parseAllowedIds(process.env.DASHBOARD_ALLOWED_IDS);

  if (expectedPassword.length === 0) {
    return NextResponse.json(
      { error: "비밀번호가 설정되지 않았습니다." },
      { status: 500 }
    );
  }
  if (allowedIds.length === 0) {
    return NextResponse.json(
      { error: "허용된 ID가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let body: { id?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const idRaw = typeof body.id === "string" ? body.id : "";
  const id = idRaw.trim().toLowerCase();
  const password = (typeof body.password === "string" ? body.password : "").trim();

  if (!id) {
    return NextResponse.json(
      { error: "아이디나 비밀번호가 잘못되었습니다." },
      { status: 400 }
    );
  }
  if (!looksLikeEmail(id)) {
    return NextResponse.json(
      { error: "아이디나 비밀번호가 잘못되었습니다." },
      { status: 400 }
    );
  }
  if (!allowedIds.includes(id)) {
    return NextResponse.json(
      { error: "아이디나 비밀번호가 잘못되었습니다." },
      { status: 401 }
    );
  }
  if (password !== expectedPassword) {
    return NextResponse.json(
      { error: "아이디나 비밀번호가 잘못되었습니다." },
      { status: 401 }
    );
  }

  const token = tokenFromPassword(expectedPassword);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res.cookies.set(USER_ID_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return res;
}
