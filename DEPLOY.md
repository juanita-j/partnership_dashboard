# 파트너 대시보드 배포 가이드

접속 비밀번호를 아는 사람만 로그인할 수 있도록 배포하는 방법입니다.

## 접근 제어 및 데이터 보안

- **로그인**: **비밀번호만** 입력하면 됩니다. 환경 변수 `LOGIN_PASSWORD`에 넣은 값과 일치해야 대시보드를 볼 수 있습니다.
- **프로덕션 필수**: 프로덕션(`NODE_ENV=production`)에서는 `LOGIN_PASSWORD`를 **반드시 설정**해야 합니다. 비어 있으면 로그인이 모두 거부됩니다.
- **미들웨어**: `/`, `/dashboard` 등은 로그인하지 않으면 `/login`으로 리다이렉트
- **API**: 파트너·엑셀 내보내기·임포트 등 DB 데이터를 다루는 모든 API는 **인증된 세션**이 있을 때만 응답하며, 미인증 요청은 401을 반환합니다. API 응답에는 캐시 방지·노출 제한 헤더가 적용됩니다.
- 배포 후 **접속 링크와 비밀번호**를 필요한 사람에게만 공유하면 됩니다.

---

## DB 안내

이 프로젝트는 **PostgreSQL**을 사용합니다. `DATABASE_URL`에는 **Postgres 연결 URL** (`postgresql://...`)을 넣어야 합니다.

- **Railway**: Railway에서 **PostgreSQL** 추가 후 연결 URL 사용.
- **Vercel**: **Neon** 등 Postgres 호스팅에 DB 생성 후 연결 URL 사용.

---

## 방법 1: Railway 배포

### 1단계: Railway 계정 및 프로젝트

1. [railway.app](https://railway.app) 가입 후 로그인
2. **New Project** → **Deploy from GitHub repo** 선택 후 `partner-dashboard` 저장소 선택
3. 같은 프로젝트에 **New** → **Database** → **PostgreSQL** 추가 (연결 URL 자동 생성됨)

### 2단계: 환경 변수 설정

Railway 프로젝트 → **Variables** 탭에서:

| 변수명 | 값 | 비고 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://...` | Postgres 추가 시 부여되는 연결 URL |
| `NEXTAUTH_SECRET` | 랜덤 문자열 32자 이상 | `openssl rand -base64 32` 로 생성 |
| `NEXTAUTH_URL` | `https://your-app-name.up.railway.app` | 배포 후 부여된 URL로 변경 |
| `LOGIN_PASSWORD` | 사용할 접속 비밀번호 | **로그인 시 입력하는 비밀번호** (프로덕션 필수) |

### 3단계: 빌드 및 DB 초기화

DB 테이블 생성은 한 번 실행합니다:

```bash
npm i -g @railway/cli
railway login
railway link  # 프로젝트 선택
railway run npx prisma db push
railway run npx prisma db seed
```

### 4단계: 배포 확인

- 배포가 끝나면 **Settings** → **Domains** 에서 URL 확인 (예: `https://partner-dashboard-production.up.railway.app`)
- `NEXTAUTH_URL`을 이 URL과 동일하게 설정했는지 확인
- 해당 URL로 접속 → 로그인 화면 → `LOGIN_PASSWORD`에 설정한 **비밀번호만** 입력 후 로그인

### 5단계: 링크 공유

- **접속 링크**: `https://your-app-name.up.railway.app`
- 링크와 **접속 비밀번호**를 필요한 사람에게만 전달하면 됩니다. 비밀번호를 모르면 로그인할 수 없습니다.

---

## 방법 2: Vercel 배포

Vercel은 **서버리스**라서 로컬 파일 DB를 쓸 수 없습니다. **Neon**(Postgres) 같은 클라우드 DB에 DB를 만든 뒤, 그 **연결 URL**을 `DATABASE_URL`에 넣습니다.

---

### Vercel용 DATABASE_URL 구하기 (Neon 사용)

1. **Neon 가입**  
   [neon.tech](https://neon.tech) 접속 → Sign up (GitHub 등).

2. **프로젝트·DB 생성**  
   로그인 후 **New Project** → 이름·리전 선택 후 생성.  
   대시보드에 **Connection string**이 나옵니다.

3. **연결 URL 복사**  
   **Connection string**에서 **URI** 형식(예: `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)을 복사합니다.  
   이 값을 그대로 `DATABASE_URL`에 넣으면 됩니다.

---

### 1단계: Vercel에 배포

1. [vercel.com](https://vercel.com) 로그인
2. **Add New** → **Project** → GitHub에서 `partner-dashboard` 선택
3. **Environment Variables** 에 추가:

| 변수명 | 값 |
|--------|-----|
| `DATABASE_URL` | Neon에서 복사한 **Postgres 연결 URL** (`postgresql://...` 로 시작) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` 로 생성한 값 |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` (배포 후 실제 URL로 수정) |
| `LOGIN_PASSWORD` | **접속 비밀번호** (로그인 화면에서 입력하는 값. 이 비밀번호를 아는 사람만 대시보드 접근 가능. 프로덕션 필수) |

4. **Deploy** 실행

**비밀번호 설정 요약:**  
Vercel **Settings → Environment Variables**에서 `LOGIN_PASSWORD`를 추가하고, 사용할 비밀번호 문자열을 넣으면 됩니다. (예: `mypassword123`) 배포 후 접속 시 로그인 화면에 이 비밀번호를 입력한 사람만 대시보드가 보입니다. 값 변경 후에는 **Redeploy** 해야 적용됩니다.

**기존에 `ALLOWED_EDITOR_EMAILS`를 쓰던 경우:**  
해당 변수는 **삭제**하고, 위 표처럼 **`LOGIN_PASSWORD`** 하나만 추가하면 됩니다. (이메일 제한 없이 비밀번호만 맞으면 접속 가능)

### 2단계: DB 테이블 생성 (필수)

Vercel은 빌드 시 DB를 만들 수 없으므로, **로컬에서** Neon DB에 테이블을 한 번 올립니다.

1. 로컬 `.env`에 **Neon에서 복사한 같은 `DATABASE_URL`** 넣기.
2. 아래 실행:

```bash
npx prisma db push
npx prisma db seed
```

이후 Vercel 앱에서 로그인하면 같은 Neon DB를 사용합니다.

### 3단계: 접속 및 링크 공유

- 배포 URL(예: `https://partner-dashboard.vercel.app`)로 접속
- 로그인 화면에서 `LOGIN_PASSWORD`에 설정한 **비밀번호** 입력 후 로그인
- 접속 링크와 비밀번호를 필요한 사람에게만 공유하면 됩니다.

---

### `The table 'public.CompanyAlias' does not exist` (또는 테이블 없음) 오류일 때

**원인**: Neon DB에 테이블이 한 번도 생성되지 않았습니다. `DATABASE_URL`만 넣고 **테이블 생성 단계**를 하지 않으면 발생합니다.

**해결** (로컬에서 한 번만 실행):

1. 로컬 프로젝트 루트에 `.env` 파일을 만들고, **Vercel에 넣은 것과 같은 Neon 연결 URL**을 넣습니다.
   ```env
   DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
   ```
2. 터미널에서 아래를 순서대로 실행합니다.
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
3. `db push`가 성공하면 Neon DB에 모든 테이블(Partner, CompanyAlias, User 등)이 생성됩니다. `db seed`는 회사명 매핑 등 초기 데이터를 넣습니다.
4. 이후 Vercel 앱에서 엑셀 업로드 등이 정상 동작합니다.

---

### `the URL must start with the protocol file:` (Prisma) 오류일 때

이 프로젝트는 **PostgreSQL**만 사용합니다. `DATABASE_URL`에 **Neon 등 Postgres URL** (`postgresql://...`)을 넣어야 합니다.

- **Turso** (`libsql://...`)나 **파일 경로** (`file:./prisma/dev.db`)를 넣으면 이 오류가 납니다.
- **Neon**에서 DB 만들고 연결 URL 복사 → Vercel 환경 변수 `DATABASE_URL`에 붙여넣기.
- 그다음 **로컬**에서 같은 URL로 `npx prisma db push`와 `npx prisma db seed` 한 번 실행해야 로그인이 됩니다.

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

## 공통: 접속 비밀번호 관리

- **변경**: 배포 플랫폼(Vercel/Railway) **Settings → Environment Variables**에서 `LOGIN_PASSWORD` 값을 수정한 뒤 **재배포**(또는 재시작)하면 새 비밀번호가 적용됩니다.
- **유의**: 접속 링크와 비밀번호를 아는 사람만 로그인할 수 있으므로, 비밀번호는 필요한 사람에게만 공유하세요.
