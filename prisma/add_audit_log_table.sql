-- DashboardAuditLog 테이블이 없을 때만 생성 (한 번만 실행하면 됨)
CREATE TABLE IF NOT EXISTS "DashboardAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DashboardAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DashboardAuditLog_userId_idx" ON "DashboardAuditLog"("userId");
CREATE INDEX IF NOT EXISTS "DashboardAuditLog_createdAt_idx" ON "DashboardAuditLog"("createdAt");
