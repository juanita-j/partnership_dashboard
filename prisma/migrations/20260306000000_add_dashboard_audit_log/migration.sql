-- CreateTable
CREATE TABLE "DashboardAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardAuditLog_userId_idx" ON "DashboardAuditLog"("userId");

-- CreateIndex
CREATE INDEX "DashboardAuditLog_createdAt_idx" ON "DashboardAuditLog"("createdAt");
