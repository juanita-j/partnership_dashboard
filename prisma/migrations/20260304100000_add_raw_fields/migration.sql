-- Partner: add raw string columns for date fields (keep existing columns for compatibility)
ALTER TABLE "Partner" ADD COLUMN "businessCardDateRaw" TEXT;
ALTER TABLE "Partner" ADD COLUMN "employmentUpdatedAtRaw" TEXT;

-- YearlyEvent: add raw columns, then recreate table without boolean/int to use only raw
CREATE TABLE "YearlyEvent_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "danInvitedRaw" TEXT,
    "danInviter" TEXT DEFAULT '',
    "giftSentRaw" TEXT,
    "giftItem" TEXT DEFAULT '',
    "giftQtyRaw" TEXT,
    "giftSender" TEXT DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "YearlyEvent_new_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "YearlyEvent_new" ("id", "partnerId", "year", "danInvitedRaw", "danInviter", "giftSentRaw", "giftItem", "giftQtyRaw", "giftSender", "createdAt", "updatedAt")
SELECT "id", "partnerId", "year",
  CASE WHEN "danInvited" = 1 THEN 'true' ELSE 'false' END,
  COALESCE("danInviter", ''),
  CASE WHEN "giftSent" = 1 THEN 'true' ELSE 'false' END,
  COALESCE("giftItem", ''),
  CAST(COALESCE("giftQty", 0) AS TEXT),
  COALESCE("giftSender", ''),
  "createdAt", "updatedAt"
FROM "YearlyEvent";

DROP TABLE "YearlyEvent";

ALTER TABLE "YearlyEvent_new" RENAME TO "YearlyEvent";

CREATE UNIQUE INDEX "YearlyEvent_partnerId_year_key" ON "YearlyEvent"("partnerId", "year");
CREATE INDEX "YearlyEvent_year_idx" ON "YearlyEvent"("year");
CREATE INDEX "YearlyEvent_giftItem_idx" ON "YearlyEvent"("giftItem");
