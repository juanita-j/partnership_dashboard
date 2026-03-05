import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { EXCEL_HEADERS } from "@/lib/excel-import";

export async function GET() {
  const headers = [...EXCEL_HEADERS];
  const sampleRow = [
    "홍길동",
    "010-1234-5678",
    "현대차",
    "영업팀",
    "과장",
    "hong@example.com",
    "02-1234-5678",
    "02-1234-5679",
    "서울시 강남구",
    "2024-01-15",
    "",
    "Y",
    "김담당",
    "Y",
    "김담당",
    "",
    "",
    "Y",
    "스테이셔너리 세트",
    "1",
    "이발송",
    "Y",
    "선물품목",
    "2",
    "박발송",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "파트너");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=partner_template.xlsx",
    },
  });
}
