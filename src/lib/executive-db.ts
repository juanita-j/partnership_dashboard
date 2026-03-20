import { PrismaClient } from "@/generated/prisma-executive-client";

/** 로컬 generate 전용 placeholder URL (실제 운영에서는 반드시 실 DB URL로 교체) */
const PLACEHOLDER_MARKER = "executive_gen_placeholder";

const globalFor = globalThis as unknown as { executivePrisma?: PrismaClient };

export function isExecutiveDbConfigured(): boolean {
  const u = process.env.EXECUTIVE_COUNTERPART_DATABASE_URL?.trim() ?? "";
  return u.length > 0 && !u.includes(PLACEHOLDER_MARKER);
}

export function getExecutivePrisma(): PrismaClient {
  if (!isExecutiveDbConfigured()) {
    throw new Error("EXECUTIVE_COUNTERPART_DATABASE_URL is not configured");
  }
  const url = process.env.EXECUTIVE_COUNTERPART_DATABASE_URL!.trim();
  if (!globalFor.executivePrisma) {
    globalFor.executivePrisma = new PrismaClient({
      datasources: { db: { url } },
    });
  }
  return globalFor.executivePrisma;
}
