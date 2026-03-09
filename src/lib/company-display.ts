/** 대시보드 표시용: 회사명에서 '(주)', '주식회사' 전부 제거 (위치 무관, 클라이언트에서 사용) */
export function stripCompanySuffixForDisplay(name: string): string {
  if (!name || typeof name !== "string") return name;
  let t = name.trim();
  // 맨 앞·중간·맨 뒤 모두 제거: (주), 주식회사
  t = t.replace(/\s*\(\s*주\s*\)\s*/g, " ");
  t = t.replace(/\s*주식회사\s*/g, " ");
  return t.replace(/\s+/g, " ").trim();
}
