import { NextResponse } from "next/server";
import { getConfluenceDebugInfo } from "@/lib/confluence";

/**
 * GET /api/debug/confluence
 * Confluence 연동 상태 디버그용. 비밀(토큰·이메일)은 반환하지 않음.
 * - configured: 환경 변수 설정 여부
 * - pageIdUsed: 실제 사용 중인 페이지 ID(숫자)
 * - shortLinkResolved: short key(WSw9JwE)를 숫자 ID로 변환했는지
 * - attachmentCount: 엑셀 첨부 파일 개수
 * - attachmentNames: 첨부 파일 이름 목록
 * - error: 실패 시 에러 메시지
 */
export async function GET() {
  try {
    const info = await getConfluenceDebugInfo();
    return NextResponse.json(info);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        configured: false,
        pageIdUsed: null,
        shortLinkResolved: false,
        attachmentCount: 0,
        attachmentNames: [],
        error: message,
      },
      { status: 500 }
    );
  }
}
