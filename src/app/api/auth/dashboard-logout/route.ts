import { NextResponse } from "next/server";

const COOKIE_NAME = "dashboard_auth";
const USER_ID_COOKIE = "dashboard_user_id";

/** 로그아웃: 대시보드 인증/사용자 쿠키 제거. 모든 계정이 동일 DB를 보도록 세션만 정리 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  const clearOpt = { httpOnly: true, path: "/", maxAge: 0 };

  res.cookies.set(COOKIE_NAME, "", clearOpt);
  res.cookies.set(USER_ID_COOKIE, "", clearOpt);

  return res;
}
