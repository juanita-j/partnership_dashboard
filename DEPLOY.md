# 파트너 대시보드 배포 가이드

허가된 이메일 주소를 가진 사용자만 링크로 접속해 로그인할 수 있도록 배포하는 방법입니다.

## 접근 제어 및 데이터 보안

- **로그인**: `ALLOWED_EDITOR_EMAILS`에 등록된 이메일만 로그인 가능 (비밀번호는 Credentials 모드에서 임의 입력)
- **프로덕션 필수**: 프로덕션(`NODE_ENV=production`)에서는 `ALLOWED_EDITOR_EMAILS`를 **반드시 설정**해야 합니다. 비어 있으면 로그인이 모두 거부되어, DB/엑셀 데이터가 외부에 노출되는 경로를 원천 차단합니다.
- **미들웨어**: `/`, `/dashboard` 등은 로그인하지 않으면 `/login`으로 리다이렉트
- **API**: 파트너·엑셀 내보내기·임포트 등 DB 데이터를 다루는 모든 API는 **인증된 세션**이 있을 때만 응답하며, 미인증 요청은 401을 반환합니다. API 응답에는 캐시 방지·노출 제한 헤더가 적용됩니다.
- 배포 후 **접속 링크**를 허가된 사람에게만 공유하면 됩니다.

---

## 방법 1: Railway 배포 (권장, SQLite 그대로 사용)

Railway는 SQLite 파일을 디스크에 저장할 수 있어 현재 프로젝트를 **수정 없이** 배포할 수 있습니다.

### 1단계: Railway 계정 및 프로젝트

1. [railway.app](https://railway.app) 가입 후 로그인
2. **New Project** → **Deploy from GitHub repo** 선택
3. GitHub 저장소 연결 후 `partner-dashboard` 저장소 선택

### 2단계: 환경 변수 설정

Railway 프로젝트 → **Variables** 탭에서 아래 변수 추가:

| 변수명 | 값 | 비고 |
|--------|-----|------|
| `DATABASE_URL` | `file:./prisma/dev.db` | Railway가 볼륨 마운트 시 그대로 사용 가능. 또는 **Volume** 추가 후 경로 지정 (아래 참고) |
| `NEXTAUTH_SECRET` | 랜덤 문자열 32자 이상 | `openssl rand -base64 32` 로 생성 |
| `NEXTAUTH_URL` | `https://your-app-name.up.railway.app` | 배포 후 부여된 URL로 변경 |
| `ALLOWED_EDITOR_EMAILS` | `user1@company.com,user2@company.com` | **로그인 허용 이메일**, 쉼표로 구분 |

**SQLite 파일 유지 (Volume):**

1. Railway 대시보드에서 서비스 선택 → **Settings** → **Volumes** → **Add Volume**
2. 마운트 경로 예: `/data`
3. 환경 변수 수정: `DATABASE_URL=file:/data/prisma/dev.db`

### 3단계: 빌드 및 DB 초기화

Railway는 `npm run build`를 자동 실행합니다. DB는 다음 중 하나로 처리합니다.

**옵션 A – Railway CLI로 마이그레이션 실행**

```bash
npm i -g @railway/cli
railway login
railway link  # 프로젝트 선택
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

**옵션 B – 배포 후 한 번만 수동 실행**

- Railway 서비스에 **Shell** 또는 **One-off command**가 있으면:
  - `npx prisma migrate deploy`
  - `npx prisma db seed`

### 4단계: 배포 확인

- 배포가 끝나면 **Settings** → **Domains** 에서 URL 확인 (예: `https://partner-dashboard-production.up.railway.app`)
- `NEXTAUTH_URL`을 이 URL과 동일하게 설정했는지 확인
- 해당 URL로 접속 → 로그인 화면 → `ALLOWED_EDITOR_EMAILS`에 넣은 이메일 + 아무 비밀번호로 로그인

### 5단계: 링크 공유

- **접속 링크**: `https://your-app-name.up.railway.app`
- 이 링크는 허가된 이메일 소유자에게만 전달하면 됩니다. 링크만으로는 로그인되지 않고, 반드시 허용된 이메일로 로그인해야 대시보드를 이용할 수 있습니다.

---

## 방법 2: Vercel 배포

Vercel은 **서버리스**라서 요청마다 서버가 새로 뜨고, **로컬 파일(예: `dev.db`)을 저장·공유할 수 없습니다.**  
그래서 **“인터넷에 있는 DB”에 접속하는 주소**가 필요하고, 이걸 **DATABASE_URL**에 넣습니다.

- **쉽게 말해**: `DATABASE_URL` = “내가 쓸 DB에 접속하는 주소”.  
  Turso나 Neon 같은 **클라우드 DB 서비스**에 가입해서 DB를 하나 만든 뒤, 그 서비스 **대시보드에 나오는 “연결 주소(Connection URL)”**를 복사해 넣으면 됩니다.

- **Railway**: 서버가 계속 떠 있으니까 `file:./prisma/dev.db` 같은 **파일 경로**를 넣으면 됨.
- **Vercel**: 파일 경로 불가 → **Turso** 또는 **Neon** 같은 **클라우드 DB 서비스**에 DB를 만들고, 그 서비스가 주는 **연결 URL**을 `DATABASE_URL`에 넣음.

**연결 URL 예시**
- Turso: `libsql://partner-dashboard-xxx.turso.io` (토큰은 별도 환경변수)
- Neon: `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`  
  → Neon 쓰려면 Prisma 스키마를 `provider = "postgresql"` 로 바꿔야 함.

아래는 **Turso**로 DB 만들고 연결 URL 구하는 방법입니다 (현재 프로젝트는 SQLite라서 Turso가 수정 범위가 가장 적음).

---

### Vercel용 DATABASE_URL 구하기 (Turso 사용)

1. **Turso 가입**  
   [turso.tech](https://turso.tech) 접속 → Sign up (GitHub 등으로 가능).

2. **DB 생성**  
   로그인 후 **Create database** → 이름 예: `partner-dashboard` → 지역 선택 → Create.

3. **연결 정보 복사**  
   생성된 DB 클릭 → **Connect** 탭 (또는 Connection strings) 이동  
   - **URL** 이 적힌 부분을 복사 (예: `libsql://partner-dashboard-xxx.turso.io`)  
   - **Auth token** 도 표시됨 → 나중에 `TURSO_AUTH_TOKEN` 같은 이름으로 Vercel 환경변수에 넣을 수 있음.

4. **Prisma에서 Turso 쓰는 설정**  
   이 프로젝트는 기본이 SQLite 파일이라, Turso를 쓰려면:
   - `DATABASE_URL` 형식: Turso 문서에 나온 대로 `libsql://...` URL 사용.
   - Prisma가 `libsql:` 프로토콜을 쓰려면 드라이버 설정이 필요할 수 있음.  
   **가장 간단한 방법**: Turso 대시보드에서 **“Prisma” 연동 안내**가 있으면 그대로 따라 `schema.prisma`의 `url`과 드라이버를 맞추고, 나온 **연결 URL**을 그대로 `DATABASE_URL`에 넣으면 됩니다.

   (정리: **연결 URL = Turso 대시보드에서 DB 선택 후 Connect/Connection string 에 나오는 그 주소**를 복사해서 `DATABASE_URL` 값으로 넣는 것.)

Neon을 쓰면 Postgres용 URL을 쓰고, Prisma 스키마를 `postgresql`로 바꾼 뒤 마이그레이션을 다시 맞추면 됩니다.

---

### 1단계: Vercel에 배포

1. [vercel.com](https://vercel.com) 로그인
2. **Add New** → **Project** → GitHub에서 `partner-dashboard` 선택
3. **Environment Variables** 에 추가:

| 변수명 | 값 |
|--------|-----|
| `DATABASE_URL` | 위에서 만든 **Turso(또는 Neon) 연결 URL** (Turso면 `libsql://...` 형태, Neon이면 `postgresql://...` 형태) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` 로 생성한 값 |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` (배포 후 URL로 수정) |
| `ALLOWED_EDITOR_EMAILS` | `user1@company.com,user2@company.com` |

4. **Deploy** 실행

### 2단계: DB 마이그레이션

Vercel은 빌드 시 파일 시스템에 DB를 만들 수 없으므로, **로컬에서** 연결해서 마이그레이션을 실행합니다.

```bash
# .env에 배포용 DATABASE_URL 설정 후
npx prisma migrate deploy
npx prisma db seed
```

### 3단계: 접속 및 링크 공유

- 배포 URL(예: `https://partner-dashboard.vercel.app`)로 접속
- 허용된 이메일로 로그인 후 사용
- 이 URL만 허가된 사람에게 공유하면 됩니다.

---

### "There is a problem with the server configuration" 오류일 때

이 메시지는 **NextAuth**가 프로덕션에서 필요한 설정을 못 찾았을 때 나옵니다. 아래를 순서대로 확인하세요.

1. **`NEXTAUTH_SECRET`**
   - Vercel **Project → Settings → Environment Variables**에 **정확히** `NEXTAUTH_SECRET` 이름으로 등록했는지 확인 (오타 없이).
   - 값은 32자 이상 랜덤 문자열. 터미널에서 `openssl rand -base64 32` 실행해서 나온 값을 복사해 넣기.
   - **Environment**가 **Production** (및 필요하면 Preview)에 체크돼 있는지 확인.

2. **`NEXTAUTH_URL`**
   - Vercel이 준 **실제 배포 URL**과 완전히 같아야 함.
   - 예: `https://partner-dashboard-xxx.vercel.app` (맨 뒤 슬래시 없이, `https` 사용).
   - "View Web"으로 들어가는 그 주소를 그대로 `NEXTAUTH_URL` 값으로 넣기.

3. **환경 변수 반영**
   - 값을 수정했다면 **저장** 후, **Deployments** 탭에서 최신 배포 선택 → **Redeploy** 한 번 실행 (환경 변수는 재배포 후 적용됨).

4. **서버 로그로 원인 확인**
   - Vercel **Project → Deployments** → 해당 배포 클릭 → **Functions** 또는 **Logs** 탭에서 에러 메시지 확인.
   - `NEXTAUTH_SECRET is missing` 또는 DB 연결 오류 등이 보이면 그에 맞게 수정.

---

## 공통: 허가 이메일 관리

- **추가**: `ALLOWED_EDITOR_EMAILS`에 새 이메일을 쉼표로 추가한 뒤, 배포 플랫폼에서 환경 변수 수정 후 재배포(또는 재시작)
- **제거**: 위 목록에서 해당 이메일을 제거 후 재배포(또는 재시작)

배포 후에는 **허가받은 사람에게만 접속 링크를 전달**하면, 해당 이메일로 로그인한 사용자만 대시보드를 사용할 수 있습니다.
