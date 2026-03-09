/** 대시보드 표시용: 회사명 맨 뒤 '(주)', '주식회사' 제거 (클라이언트에서 사용) */
export function stripCompanySuffixForDisplay(name: string): string {
  if (!name || typeof name !== "string") return name;
  let t = name.trim();
  const koreanSuffixRe = /\s*(\(\s*주\s*\)|주식회사)\s*$/;
  while (koreanSuffixRe.test(t)) {
    t = t.replace(koreanSuffixRe, "").trim();
  }
  return t;
}
