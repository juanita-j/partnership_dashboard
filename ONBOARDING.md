# 파트너 대시보드 온보딩 가이드 (인수인계용)

처음 저장소를 받은 분이 **기능을 빠르게 이해**하고, **Cursor 등 도구로 안전하게 수정**할 수 있도록 정리한 문서입니다. 상세 기능·API 목록은 [README.md](./README.md)를 함께 보세요.

---

## 1. 이 프로그램이 하는 일

- **파트너(인물) 단위**로 이름, 연락처, 회사, 부서, 재직 상태, 연도별 DAN 초대·선물 기록 등을 **웹에서 조회·편집**합니다.
- **엑셀 템플릿**으로 대량 반영(미리보기 → 적용)과 **필터 조건 그대로 엑셀보내기**를 지원합니다.
- **회사명 표준화(별칭)** 규칙을 별도 화면에서 관리합니다.
- **임원진 카운터파트**는 UI·흐름은 파트너사 목록과 같지만 **별도 PostgreSQL DB**에만 저장됩니다.
- **업데이트 이력**은 대시보드에서 수행한 일부 작업을 감사 로그로 남깁니다.

접근 제어는 대부분 **`/dashboard` 경로 + 미들웨어 + 쿠키** 기반입니다(아래 [인증](#6-인증미들웨어) 참고).

---

## 2. 기술 스택 (한눈에)

| 구분 | 내용 |
|------|------|
| 프레임워크 | **Next.js 15** (App Router), **TypeScript** |
| UI | **Tailwind CSS**, shadcn/ui 스타일 컴포넌트 (`src/components/ui/`) |
| API | Route Handlers (`src/app/api/**/route.ts`) |
| ORM·DB | **Prisma** + **PostgreSQL** (메인 `DATABASE_URL`) |
| 임원진 전용 DB | 동일 스택, 별도 스키마·클라이언트 (`prisma/executive-counterpart.prisma`, `EXECUTIVE_COUNTERPART_DATABASE_URL`) |
| 엑셀 | SheetJS (`xlsx`) |
| 기타 | NextAuth(루트 `/login` 등 레거시 경로용 설정이 있을 수 있음), `fuse.js`(회사명 퍼지 매칭) |

로컬 README에 SQLite 예시가 남아 있을 수 있으나, **`prisma/schema.prisma`의 datasource는 PostgreSQL**입니다. 실제 운영·Vercel은 Postgres URL을 사용합니다.

---

## 3. 화면(URL)과 역할

| 경로 | 탭/제목 | 설명 |
|------|---------|------|
| `/dashboard` | 파트너사 DB 대시보드 | 메인 파트너 목록, 필터, 인라인 편집, 엑셀 업·다운로드, 상세 시트 |
| `/dashboard/executive-counterpart` | 임원진 카운터파트 | 위와 동일 UX, API 베이스는 `/api/executive`, DB는 별도 |
| `/dashboard/company-alias` | 회사명 매핑 조건 | 회사명 별칭 CRUD |
| `/dashboard/audit` | 업데이트 이력 | 감사 로그 조회 |
| `/dashboard/login` | (비밀번호 보호 시) | ID(이메일) + 비밀번호 로그인 |

헤더 네비는 `src/app/dashboard/dashboard-layout-client.tsx`에서 경로(`usePathname`)로 **현재 탭 강조**합니다.

---

## 4. 디렉터리 맵 — “수정은 어디서?”

```
src/app/
  dashboard/           # 각 탭 페이지 (page.tsx)
  api/                 # REST형 라우트
    partners/          # 메인 파트너 CRUD·목록
    executive/         # 임원진 전용 동일 기능
    import/, export/   # 엑셀
    company-alias/
    template/          # 24컬럼 템플릿
    auth/              # dashboard-required, dashboard-login, logout
    dashboard/audit/   # 감사 API 등

src/components/
  partners-table.tsx       # 목록 테이블 (apiRoot로 /api vs /api/executive 분기)
  partner-detail-sheet.tsx # 우측 상세 시트
  excel-upload-dialog.tsx  # 엑셀 미리보기·적용 (apiRoot, importSource)
  filter-bar.tsx

src/lib/
  excel-import.ts, validations.ts, audit.ts, company-display.ts …
  executive-db.ts      # 임원진 Prisma 클라이언트 (미설정 시 503 등)

prisma/
  schema.prisma                 # 메인 DB 모델
  executive-counterpart.prisma  # 임원진 DB 모델
  migrations/                   # 메인 마이그레이션

scripts/
  prisma-generate-executive.cjs # executive 클라이언트 generate (postinstall)
```

**기능을 바꿀 때 검색 키워드 예시**

- 엑셀 컬럼·파싱: `excel-import`, `import/excel`, `import/apply`, `GET /api/template`
- 목록 컬럼·필터: `partners-table`, `filter-bar`, `dashboard/types.ts`
- API 스펙: `src/app/api/partners`, `src/app/api/executive`
- 대시보드 접근 제어: `src/middleware.ts`, `src/app/api/auth/dashboard-*`

---

## 5. 데이터베이스 두 개

| DB | 환경 변수 | 스키마 | 비고 |
|----|-----------|--------|------|
| 메인 | `DATABASE_URL` | `prisma/schema.prisma` | Partner, YearlyEvent, CompanyAlias, 감사 로그 등 |
| 임원진 | `EXECUTIVE_COUNTERPART_DATABASE_URL` | `prisma/executive-counterpart.prisma` | 미설정 시 임원진 API가 동작하지 않을 수 있음 |

**로컬/서버에서 스키마 반영**

- 메인: `npx prisma migrate deploy` (또는 개발 시 `prisma migrate dev`) / README의 `db push`·seed 안내 참고
- 임원진: `npm run db:push:executive` (또는 해당 스키마로 migrate)

`npm install` 시 `postinstall`에서 메인 Prisma generate + executive 클라이언트 생성 스크립트가 실행됩니다.

---

## 6. 인증·미들웨어

- **`src/middleware.ts`**  
  - `DASHBOARD_PASSWORD`가 **비어 있으면**: `/dashboard`·`/api/*`(auth 제외) **쿠키 없이 통과** — 로컬 개발에 유리.  
  - **값이 있으면**: 대시보드 페이지는 로그인 쿠키 없으면 `/dashboard/login`으로 보냄. **`/api/*`(단 `/api/auth/*` 제외)** 도 동일 쿠키를 요구해 **API만 직접 호출하는 것도 차단**됩니다.

- **`/dashboard/login`**  
  - `POST /api/auth/dashboard-login`: 본문에 `id`(허용된 이메일), `password`.  
  - 프로덕션에서 비밀번호 로그인을 쓰려면 **`DASHBOARD_PASSWORD`** 와 **`DASHBOARD_ALLOWED_IDS`**(쉼표 구분 이메일) **둘 다** 필요합니다. 하나만 있으면 로그인 API가 500/에러를 반환할 수 있습니다.

- **NextAuth / `ALLOWED_EDITOR_EMAILS` / `LOGIN_PASSWORD`**  
  - README·코드베이스에 혼재되어 있을 수 있습니다. **현재 `/dashboard` 보호의 실질 기준은 위 `DASHBOARD_*`와 미들웨어**입니다.  
  - 루트 [DEPLOY.md](./DEPLOY.md)의 `LOGIN_PASSWORD` 위주 설명은 **구버전일 수 있으니**, 인수인계 시 **README + 본 문서 + 실제 `middleware.ts`**를 기준으로 맞추는 것을 권장합니다.

---

## 7. Cursor로 원하는 기능을 수정하는 방법

1. **Agent 모드**에서 요청을 구체적으로 적습니다.  
   - 예: “`partners-table`에서 OO 컬럼 추가해줘”, “엑셀 템플릿에 컬럼 하나 더 넣어줘”.
2. **관련 파일을 먼저 열거나 `@파일경로`**로 컨텍스트를 주면 diff가 정확해집니다.
3. **임원진과 메인을 동시에 바꿔야 하는 기능**이면 `apiRoot` 패턴(`/api` vs `/api/executive`)과 `prisma` 스키마 **두 곳**을 언급합니다.
4. **DB 스키마를 바꾼 뒤**에는 반드시 마이그레이션 또는 `db push` + Prisma generate 여부를 확인합니다.
5. 배포 전 **`npm run build`**로 타입·빌드 오류를 한 번 돌려 보세요.

프로젝트 루트에 `.cursor/rules`가 있으면 Cursor가 자동으로 참고할 수 있으니, 팀 규칙이 있으면 그대로 두거나 인수인계 시 설명해 주면 좋습니다.

---

## 8. Vercel에서 반드시 점검할 것

Vercel은 **서버리스**이므로 **파일 DB(SQLite 파일)는 사용할 수 없습니다.** Postgres(Neon 등) 연결 URL이 필요합니다.

### 8.1 환경 변수 (Project → Settings → Environment Variables)

| 변수 | 용도 |
|------|------|
| `DATABASE_URL` | 메인 Postgres (`postgresql://...`) |
| `NEXTAUTH_SECRET` | NextAuth용 시크릿 (프로젝트에 쓰고 있다면 필수) |
| `NEXTAUTH_URL` | 배포 URL과 일치, **끝에 `/` 없이** `https://xxx.vercel.app` |
| `DASHBOARD_PASSWORD` | 대시보드·API 보호용 비밀번호(사용할 때만) |
| `DASHBOARD_ALLOWED_IDS` | 허용 이메일 목록, 쉼표 구분 (`DASHBOARD_PASSWORD` 사용 시 필수) |
| `EXECUTIVE_COUNTERPART_DATABASE_URL` | 임원진 탭 사용 시 **별도** DB URL (없으면 해당 기능 503 등) |

선택·기능별:

- Confluence를 파트너 데이터 소스로 쓰는 경우: README의 `CONFLUENCE_*` 네 변수
- `ALLOWED_EDITOR_EMAILS` 등은 NextAuth 로그인 플로우에 따라 필요 여부가 다름 — 실제 사용하는 로그인 경로를 확인할 것

변경 후에는 **Redeploy**해야 런타임에 반영되는 경우가 많습니다.

### 8.2 DB 테이블 최초 생성

Vercel 빌드만으로 원격 DB에 테이블이 생기지는 않습니다. **로컬**(또는 CI)에서 **배포와 동일한 `DATABASE_URL`**로 한 번 실행합니다.

```bash
npx prisma migrate deploy
# 또는 팀 정책에 맞게 db push
npx prisma db seed   # 초기 별칭 등이 필요하면
```

임원진 DB도 쓰면 **같은 방식으로** `EXECUTIVE_COUNTERPART_DATABASE_URL`을 `.env`에 넣고:

```bash
npm run db:push:executive
```

### 8.3 빌드

- **Install Command**: 기본 `npm install`이면 `postinstall`에서 Prisma generate가 돌아갑니다.
- **Build Command**: 보통 `npm run build` 그대로.

### 8.4 기타

- **Neon**: 서버리스 환경에서는 연결 수 제한이 있을 수 있어, Prisma 문서의 **connection pooling / `pgbouncer`** 권장 설정을 Neon 가이드와 맞추는 것이 좋습니다.
- 도메인을 커스텀하면 **`NEXTAUTH_URL`을 그 도메인으로** 다시 맞춥니다.

---

## 9. 자주 쓰는 명령

```bash
npm install
npm run dev              # 개발 서버
npm run build            # 프로덕션 빌드 검증
npm run db:generate:all  # 메인 + executive Prisma 클라이언트
npm run db:push:executive
npm run lint
```

---

## 10. 인수인계 시 체크리스트 (담당자용)

- [ ] Git 원격 저장소·배포(Vercel) 프로젝트 접근 권한
- [ ] Neon(또는 Postgres) **메인 DB** 연결 정보 및 백업 정책
- [ ] 임원진 탭 사용 시 **두 번째 DB** URL 및 스키마 적용 여부
- [ ] `DASHBOARD_PASSWORD` / `DASHBOARD_ALLOWED_IDS` 실제 값과 갱신 절차
- [ ] `NEXTAUTH_URL`이 현재 프로덕션 URL과 일치하는지
- [ ] [README.md](./README.md)의 엑셀 24컬럼 규칙·필터 동작을 업무 담당자에게 공유했는지
- [ ] [DEPLOY.md](./DEPLOY.md)와 최신 코드(미들웨어·`DASHBOARD_*`) 불일치가 없는지 확인

---

문서 개선 제안은 PR이나 이슈로 남겨 주시면 이후 인수인계에 반영하기 좋습니다.
