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

/** 선택 컬럼: SHOW 체크 시 테이블에 추가 (그룹 선택 시 연도별 컬럼 확장) */
export const OPTIONAL_COLUMN_IDS = [
  "businessCardDate",
  "history",
  "danInvited",
  "inviter",
  "giftRecipient",
  "giftItem",
  "giftQty",
  "giftSender",
] as const;

/** 필터 활성화 시 자동 노출되는 DAN 컬럼 (연도는 EVENT_YEARS 기반 동적 생성) */
export const DAN_AUTO_COLUMNS = [
  "dan23Invited",
  "dan23Inviter",
  "dan24Invited",
  "dan24Inviter",
  "dan25Invited",
  "dan25Inviter",
  "dan26Invited",
  "dan26Inviter",
] as const;

/** 필터 활성화 시 자동 노출되는 선물 컬럼 (연도는 EVENT_YEARS 기반 동적 생성) */
export const GIFT_AUTO_COLUMNS = [
  "gift24Recipient",
  "gift24Item",
  "gift24Qty",
  "gift24Sender",
  "gift25Recipient",
  "gift25Item",
  "gift25Qty",
  "gift25Sender",
  "gift26Recipient",
  "gift26Item",
  "gift26Qty",
  "gift26Sender",
] as const;

export type OptionalColumnId = (typeof OPTIONAL_COLUMN_IDS)[number];
export type DanAutoColumnId = (typeof DAN_AUTO_COLUMNS)[number];
export type GiftAutoColumnId = (typeof GIFT_AUTO_COLUMNS)[number];

export const EMPLOYMENT_STATUS_VALUES = ["이직", "퇴사", "내부이동", "재직"] as const;
export type EmploymentStatusValue = (typeof EMPLOYMENT_STATUS_VALUES)[number];

/** FILTER용 DAN/선물 Y/N */
export type FilterYn = "" | "Y" | "N";

export interface FilterState {
  employmentStatus: string;
  name: string;
  company: string;
  department: string;
  title: string;
  phone: string;
  email: string;
  history: string;
  inviter: string;
  giftSender: string;
  showColumns: OptionalColumnId[];
  /** SHOW에서 선택한 연도 (DAN/선물 컬럼을 이 연도들만 표시) */
  showEventYears?: number[];
  /** 동적 연도용: dan23, dan24, ..., dan26 / dan23Yn, ... / gift2024, ... / gift24Yn, ... */
  [key: string]: string | boolean | FilterYn | OptionalColumnId[] | number[] | undefined;
}

export const defaultFilters: FilterState = {
  employmentStatus: "",
  name: "",
  company: "",
  department: "",
  title: "",
  phone: "",
  email: "",
  history: "",
  inviter: "",
  giftSender: "",
  showColumns: [],
  showEventYears: [],
};
