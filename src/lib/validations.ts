import { z } from "zod";

export const EMPLOYMENT_STATUS_ENUM = z.enum(["이직", "퇴사", "내부이동", "재직"]);

export const partnerCreateSchema = z.object({
  status: z.string().optional().default("active"),
  name: z.string().min(1, "이름 필수"),
  phone: z.string().optional().default(""),
  companyNormalized: z.string().optional().default(""),
  department: z.string().optional().default(""),
  title: z.string().optional().default(""),
  email: z.string().optional().default(""),
  workPhone: z.string().optional().default(""),
  workFax: z.string().optional().default(""),
  address: z.string().optional().default(""),
  hq: z.string().optional().default(""),
  businessCardDate: z.string().optional(),
  businessCardDateRaw: z.string().optional(),
  employmentStatus: z.string().optional().default("재직"),
  employmentUpdatedAt: z.string().optional(),
  employmentUpdatedAtRaw: z.string().optional(),
  history: z.string().optional().default(""),
});

export const partnerUpdateSchema = partnerCreateSchema.partial();

/** PATCH: 재직상태(3값만) / 히스토리 부분 업데이트 */
export const partnerPatchSchema = z.object({
  employmentStatus: EMPLOYMENT_STATUS_ENUM.optional(),
  history: z.string().optional(),
});

/** 연도별 이벤트: 모두 문자열(raw) 그대로 저장 */
export const yearlyEventSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  danInvitedRaw: z.string().optional().default(""),
  danInviter: z.string().optional().default(""),
  giftRecipient: z.string().optional().default(""),
  giftItem: z.string().optional().default(""),
  giftQtyRaw: z.string().optional().default(""),
  giftSender: z.string().optional().default(""),
});

export type PartnerCreateInput = z.infer<typeof partnerCreateSchema>;
export type PartnerUpdateInput = z.infer<typeof partnerUpdateSchema>;
export type YearlyEventInput = z.infer<typeof yearlyEventSchema>;
