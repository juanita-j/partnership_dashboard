-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer'
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'active',
    "name" TEXT NOT NULL,
    "phone" TEXT DEFAULT '',
    "companyNormalized" TEXT NOT NULL DEFAULT '',
    "department" TEXT DEFAULT '',
    "title" TEXT DEFAULT '',
    "email" TEXT DEFAULT '',
    "address" TEXT DEFAULT '',
    "businessCardDate" DATETIME,
    "employmentStatus" TEXT NOT NULL DEFAULT '재직',
    "employmentUpdatedAt" DATETIME,
    "history" TEXT DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "YearlyEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "danInvited" BOOLEAN NOT NULL DEFAULT false,
    "danInviter" TEXT DEFAULT '',
    "giftSent" BOOLEAN NOT NULL DEFAULT false,
    "giftItem" TEXT DEFAULT '',
    "giftQty" INTEGER DEFAULT 0,
    "giftSender" TEXT DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "YearlyEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompanyAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "normalizedName" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "locale" TEXT DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "filtersJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Partner_email_idx" ON "Partner"("email");

-- CreateIndex
CREATE INDEX "Partner_companyNormalized_idx" ON "Partner"("companyNormalized");

-- CreateIndex
CREATE INDEX "Partner_status_employmentStatus_idx" ON "Partner"("status", "employmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "YearlyEvent_partnerId_year_key" ON "YearlyEvent"("partnerId", "year");

-- CreateIndex
CREATE INDEX "YearlyEvent_year_idx" ON "YearlyEvent"("year");

-- CreateIndex
CREATE INDEX "YearlyEvent_giftItem_idx" ON "YearlyEvent"("giftItem");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAlias_normalizedName_alias_key" ON "CompanyAlias"("normalizedName", "alias");

-- CreateIndex
CREATE INDEX "CompanyAlias_alias_idx" ON "CompanyAlias"("alias");
