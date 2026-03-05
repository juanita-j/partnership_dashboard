# 파트너 대시보드 배포 가이드

허가된 이메일 주소를 가진 사용자만 링크로 접속해 로그인할 수 있도록 배포하는 방법입니다.

## 접근 제어 방식

- **로그인**: `ALLOWED_EDITOR_EMAILS`에 등록된 이메일만 로그인 가능 (비밀번호는 Credentials 모드에서 임의 입력)
- **미들웨어**: `/`, `/dashboard` 등은 로그인하지 않으면 `/login`으로 리다이렉트
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

Vercel은 서버리스라 **로컬 파일 시스템의 SQLite를 그대로 쓸 수 없습니다**. 다음 중 하나가 필요합니다.

- **Turso** (SQLite 호환): [turso.tech](https://turso.tech) 에서 DB 생성 후 연결
- **Neon / Vercel Postgres** 등: Postgres로 전환 후 Prisma 스키마를 `provider = "postgresql"` 로 변경

여기서는 **Vercel + 환경 변수만 설정**하는 공통 절차만 안내합니다. DB는 별도로 준비한 뒤 `DATABASE_URL`만 넣으면 됩니다.

### 1단계: Vercel에 배포

1. [vercel.com](https://vercel.com) 로그인
2. **Add New** → **Project** → GitHub에서 `partner-dashboard` 선택
3. **Environment Variables** 에 추가:

| 변수명 | 값 |
|--------|-----|
| `DATABASE_URL` | Turso/Neon 등에서 발급한 연결 URL |
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

## 공통: 허가 이메일 관리

- **추가**: `ALLOWED_EDITOR_EMAILS`에 새 이메일을 쉼표로 추가한 뒤, 배포 플랫폼에서 환경 변수 수정 후 재배포(또는 재시작)
- **제거**: 위 목록에서 해당 이메일을 제거 후 재배포(또는 재시작)

배포 후에는 **허가받은 사람에게만 접속 링크를 전달**하면, 해당 이메일로 로그인한 사용자만 대시보드를 사용할 수 있습니다.
