import { NextResponse } from "next/server";

/** 대시보드 접속 시 비밀번호 인증이 필요한지 여부. 로컬에서 비밀번호 미설정 시 false */
export async function GET() {
  const password = (process.env.DASHBOARD_PASSWORD ?? "").trim();
  const ids = (process.env.DASHBOARD_ALLOWED_IDS ?? "").trim();
  const required = password.length > 0 && ids.length > 0;
  return NextResponse.json({ required });
}
