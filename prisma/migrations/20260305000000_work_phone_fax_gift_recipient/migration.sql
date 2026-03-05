-- Partner: add workPhone, workFax
ALTER TABLE "Partner" ADD COLUMN "workPhone" TEXT DEFAULT '';
ALTER TABLE "Partner" ADD COLUMN "workFax" TEXT DEFAULT '';

-- YearlyEvent: add giftRecipient (24년/25년 선물수신인). SQLite does not support DROP COLUMN easily, so we add new column only.
-- If giftSentRaw existed, we keep it; add giftRecipient. (Current schema already has giftSentRaw removed and giftRecipient - so we need to add column to existing table.)
ALTER TABLE "YearlyEvent" ADD COLUMN "giftRecipient" TEXT DEFAULT '';
