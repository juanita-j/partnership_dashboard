import { NextResponse } from "next/server";
import { isExecutiveDbConfigured } from "@/lib/executive-db";

export function executiveDbNotConfiguredResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "임원진 카운터파트 DB가 설정되지 않았습니다. EXECUTIVE_COUNTERPART_DATABASE_URL을 설정하고 테이블을 생성하세요.",
    },
    { status: 503 }
  );
}

export function requireExecutiveDb(): NextResponse | null {
  if (!isExecutiveDbConfigured()) return executiveDbNotConfiguredResponse();
  return null;
}
