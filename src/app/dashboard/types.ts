/** 기본 컬럼 8개: 항상 표시, 순서 고정 */
export const FIXED_COLUMN_IDS = [
  "employmentStatus",
  "company",
  "name",
  "phone",
  "department",
  "title",
  "email",
  "address",
] as const;

/** 선택 컬럼: SHOW 체크 시 테이블에 추가 */
export const OPTIONAL_COLUMN_IDS = ["businessCardDate", "history"] as const;

/** 필터 활성화 시 자동 노출되는 DAN 컬럼 */
export const DAN_AUTO_COLUMNS = [
  "dan23Invited",
  "dan23Inviter",
  "dan24Invited",
  "dan24Inviter",
  "dan25Invited",
  "dan25Inviter",
] as const;

/** 필터 활성화 시 자동 노출되는 선물 컬럼 */
export const GIFT_AUTO_COLUMNS = [
  "gift24Recipient",
  "gift24Item",
  "gift24Qty",
  "gift24Sender",
  "gift25Recipient",
  "gift25Item",
  "gift25Qty",
  "gift25Sender",
] as const;

export type OptionalColumnId = (typeof OPTIONAL_COLUMN_IDS)[number];
export type DanAutoColumnId = (typeof DAN_AUTO_COLUMNS)[number];
export type GiftAutoColumnId = (typeof GIFT_AUTO_COLUMNS)[number];

export const EMPLOYMENT_STATUS_VALUES = ["퇴사", "재직", "내부이동"] as const;
export type EmploymentStatusValue = (typeof EMPLOYMENT_STATUS_VALUES)[number];

export interface FilterState {
  employmentStatus: string;
  name: string;
  company: string;
  department: string;
  title: string;
  dan23: boolean;
  dan24: boolean;
  dan25: boolean;
  gift2024: boolean;
  gift2025: boolean;
  inviter: string;
  giftSender: string;
  showColumns: OptionalColumnId[];
}

export const defaultFilters: FilterState = {
  employmentStatus: "",
  name: "",
  company: "",
  department: "",
  title: "",
  dan23: false,
  dan24: false,
  dan25: false,
  gift2024: false,
  gift2025: false,
  inviter: "",
  giftSender: "",
  showColumns: [],
};
