# 파트너사 정보 DB 관리 대시보드

파트너사 기본 정보와 연도별 DAN 초대/선물 발송을 관리하는 웹 대시보드입니다.

## 기술 스택

- **Frontend**: Next.js (App Router), TypeScript, TailwindCSS, shadcn/ui 스타일 컴포넌트, React Hook Form, Zod
- **Backend**: Next.js Route Handlers (API)
- **DB**: SQLite + Prisma ORM
- **Auth**: NextAuth (Credentials) + Role 기반 (editor / viewer)
- **Excel**: SheetJS (xlsx)
- **Fuzzy 매칭**: fuse.js (회사명 표준화)

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

의존성 충돌이 나면 `npm install --legacy-peer-deps` 로 설치할 수 있습니다.  
(pnpm 사용 시: `pnpm install`)

### 2. 환경 변수 설정

`.env` 파일을 프로젝트 루트에 생성합니다.

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="랜덤한 시크릿 키"
NEXTAUTH_URL="http://localhost:3000"
ALLOWED_EDITOR_EMAILS="editor@example.com,admin@example.com"
DASHBOARD_PASSWORD=""
```

- `ALLOWED_EDITOR_EMAILS`: 로그인 허용 이메일 목록 (쉼표 구분). 이 목록에 있는 이메일만 로그인 가능하며, 모두 **editor** 권한으로 로그인됩니다.
- `DASHBOARD_PASSWORD`: **(선택)** 대시보드 접속용 비밀번호. 설정하면 `/dashboard` 및 하위 경로 접속 시 비밀번호 입력 화면이 먼저 나오며, 올바른 비밀번호 입력 후 접속하면 메인 대시보드로 이동합니다. 비우거나 설정하지 않으면 비밀번호 없이 접속 가능(로컬 개발용).

### 3. DB 마이그레이션 및 시드

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

- `prisma generate`: Prisma Client 생성
- `migrate deploy`: `prisma/migrations` 마이그레이션 적용 (SQLite 파일 `prisma/dev.db` 생성)
- `db seed`: 회사명 표준화용 CompanyAlias 예시 데이터 삽입 (현대차, 삼성, LG 등)

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속 후 로그인합니다.

- 로그인: `.env`의 `ALLOWED_EDITOR_EMAILS`에 등록된 이메일 + 아무 비밀번호(Credentials 모드)

## 배포 (허가된 이메일만 링크로 접근)

- **허가된 사람만 접근**: `ALLOWED_EDITOR_EMAILS`에 넣은 이메일만 로그인 가능. 배포 후 접속 URL을 해당 사용자에게만 공유하면 됩니다.
- **상세 절차**: [DEPLOY.md](./DEPLOY.md) 참고 (Railway 권장, Vercel 옵션 포함).

### Vercel에서 대시보드 비밀번호 설정

배포된 대시보드 링크로 들어오는 **모든 사용자**가 비밀번호를 입력해야 접속하도록 하려면, Vercel에 환경 변수를 설정하면 됩니다.

1. **Vercel 대시보드** → 해당 프로젝트 선택 → **Settings** → **Environment Variables**
2. **Key**: `DASHBOARD_PASSWORD`
3. **Value**: 사용할 비밀번호(원하는 문자열, 예: `MySecurePass123`)
4. **Environment**: Production(필요 시 Preview/Development도 선택)
5. **Save** 후 재배포(또는 다음 배포부터 적용)

설정 후 `/dashboard` 또는 `/dashboard/...` 로 접속하면 먼저 비밀번호 입력 화면이 나오고, 설정한 비밀번호와 일치하면 대시보드 메인으로 이동합니다. 쿠키로 30일간 인증이 유지됩니다.

## 주요 기능

1. **파트너사 기본 정보 관리**: 이름, 휴대폰, 회사(표준명), 부서, 직함, 전자 메일, 근무처 전화/팩스, 근무지 주소, 재직상태(퇴사/재직/내부이동), 히스토리
2. **연도별 DAN 초대/선물**: 2023/2024/2025년 초청여부·초청인, 24년·25년 선물수신인·품목·발송개수·발송인
3. **엑셀 업로드**: 24컬럼 고정 헤더 템플릿으로 업로드 → 미리보기(diff) 후 적용, 매칭 키(이메일 → 이름+휴대폰 → 이름+회사), 비어 있지 않은 셀만 반영, 변경 시 히스토리 로그
4. **대시보드**: 고정 8컬럼(재직상태, 회사, 이름, 휴대폰, 부서, 직함, 전자 메일, 근무지 주소) + 선택(명함 등록일, 히스토리), DAN/선물 필터 사용 시 해당 컬럼 자동 노출
5. **인라인 편집**: 재직상태 드롭다운(퇴사/재직/내부이동), 히스토리 텍스트 입력 후 저장 → `PATCH /api/partners/:id`
6. **필터**: 재직상태, 이름/회사/부서/직함(부분일치), DAN초청여부(DAN23·DAN24, 'Y' 기준 AND), 선물발송여부(2024·2025, 선물수신인 'Y' 기준 AND), URL 쿼리 동기화
7. **엑셀 다운로드**: 현재 필터 결과를 xlsx로 다운로드(`GET /api/export/xlsx`), 파일명 `partner_dashboard_export_YYYYMMDD_HHMM.xlsx`

## API 개요

- `GET/POST /api/partners` — 목록(필터/페이지네이션), 생성
- `GET/PUT/PATCH/DELETE /api/partners/:id` — 상세, 수정, **PATCH(재직상태·히스토리만 부분 업데이트)**, 삭제
- `PUT /api/partners/:id/events` — 연도별 이벤트 upsert
- `POST /api/import/excel` — 엑셀 업로드, 미리보기(diff) 반환
- `POST /api/import/apply` — diff 적용
- `GET /api/export/xlsx` — 현재 필터 결과 엑셀 다운로드 (쿼리: employmentStatus, name, company, department, title, dan23, dan24, gift2024, gift2025, columns)
- `GET/POST /api/company-alias`, `PUT/DELETE /api/company-alias/:id` — 회사명 매핑 CRUD
- `GET/POST /api/saved-filters`, `DELETE /api/saved-filters/:id` — 저장된 필터
- `GET /api/template` — 24컬럼 엑셀 템플릿 다운로드

## 엑셀 템플릿(24컬럼 고정 헤더)

- `GET /api/template` 로 다운로드하는 엑셀의 **첫 행 헤더** 순서:
  1) 이름 2) 휴대폰 3) 회사 4) 부서 5) 직함 6) 전자 메일 7) 근무처 전화 8) 근무처 팩스 9) 근무지 주소 10) 명함 등록일  
  11) DAN23 초청여부 12) DAN23 초청인 13) DAN24 초청여부 14) DAN24 초청인 15) DAN25 초청여부 16) DAN25 초청인  
  17) 24년 선물수신인 18) 24년 선물품목 19) 24년 선물발송개수 20) 24년 선물발송인  
  21) 25년 선물수신인 22) 25년 선물품목 23) 25년 선물발송개수 24) 25년 선물발송인  
- 위 헤더명을 키로 매핑하여 import/export 시 일관되게 사용합니다.

## 권한

- **viewer**: 조회만 가능 (수정/삭제/엑셀 업로드 불가)
- **editor**: 조회 + 추가/수정/삭제 + 엑셀 업로드 + 회사명 매핑·저장 필터 관리

현재는 allowlist(`ALLOWED_EDITOR_EMAILS`)에 있는 계정만 로그인 가능하며, 모두 editor로 처리됩니다.

---

## 값 강제 금지 (Raw 저장)

- 엑셀/폼에 입력한 **문자열은 그대로** DB에 저장되고 UI에 표시됩니다.
- 초청여부·선물수신인 등은 **문자열**로 저장하며, **필터 로직만** 'Y'(trim 후 완전 일치) 기준으로 동작합니다.

## 대시보드 컬럼/필터

- **고정 8컬럼** (항상 표시, 순서 고정): 재직상태, 회사, 이름, 휴대폰, 부서, 직함, 전자 메일, 근무지 주소.
- **선택 컬럼** (SHOW 체크 시 표시): 명함 등록일, 히스토리.
- **필터 연동 자동 노출**: DAN초청여부 필터(DAN23/DAN24) 사용 시 DAN 관련 컬럼 자동 노출; 선물발송여부(2024/2025) 사용 시 해당 연도 선물 컬럼 자동 노출.
- **FILTER**: 재직상태(퇴사/재직/내부이동), 이름/회사/부서/직함(부분일치), DAN초청여부(DAN23·DAN24 체크, 'Y' AND), 선물발송여부(2024·2025 체크, 선물수신인 'Y' AND). 필터는 URL 쿼리와 동기화됩니다.

## 변경 파일/핵심 위치

| 구분 | 경로 |
|------|------|
| DB 스키마 | `prisma/schema.prisma` |
| Raw 필드 마이그레이션 | `prisma/migrations/20260304100000_add_raw_fields/` |
| 검증 완화 | `src/lib/validations.ts` |
| 엑셀 파싱(Raw 저장) | `src/lib/excel-import.ts` |
| 엑셀 미리보기/적용 | `src/app/api/import/excel/route.ts`, `src/app/api/import/apply/route.ts` |
| 파트너 API + eventsByYear | `src/app/api/partners/route.ts`, `src/app/api/partners/[id]/route.ts` |
| 필터/테이블 UI | `src/components/filter-bar.tsx`, `src/components/partners-table.tsx` |
| 상세 편집(Raw 입력) | `src/components/partner-detail-sheet.tsx` |
| 필터/컬럼 타입·기본값 | `src/app/dashboard/types.ts` |

## 개발 DB 초기화 (선택)

기존 SQLite를 버리고 처음부터 적용하려면:

```bash
# prisma/dev.db 삭제 후
npx prisma migrate deploy
npx prisma db seed
```

또는 `npx prisma migrate reset` (데이터 전부 삭제 후 migrate + seed 한 번에 실행).

## 검증 시나리오 (로컬 실행 후)

1. **템플릿/업로드**: 템플릿 다운로드 → 24컬럼 헤더로 데이터 입력 → 엑셀 업로드 → 미리보기 후 적용 → 성공 시 `/dashboard`에 반영.
2. **기본 화면**: `/dashboard` 진입 시 필터 없이 **전체 파트너 목록**이 즉시 표시(0건이 아님).
3. **재직상태 인라인 편집**: 테이블의 재직상태 셀에서 드롭다운으로 퇴사/재직/내부이동 선택 → 저장 후 새로고침해도 유지.
4. **히스토리 인라인 편집**: SHOW에서 "히스토리" 체크 → 해당 셀 클릭 후 텍스트 입력 → blur 또는 저장 버튼으로 저장 → 새로고침해도 유지.
5. **DAN 필터**: DAN초청여부에서 DAN23·DAN24 체크 후 적용 → 'Y'인 행만 노출, DAN 관련 컬럼이 테이블에 자동 노출.
6. **선물 필터**: 선물발송여부에서 2024·2025 체크 후 적용 → 24년·25년 선물수신인 'Y'인 행만 노출, 선물 관련 컬럼 자동 노출.
7. **엑셀 다운로드**: 필터 적용 후 "엑셀 다운로드" 버튼 클릭 → 현재 결과가 xlsx로 다운로드(기본 8 + 선택 + 필터 연동 컬럼 포함).
8. **URL 동기화**: 필터 변경 시 주소창 쿼리가 바뀌고, 해당 URL을 새로고침해도 동일 필터가 적용된 상태로 로드.
