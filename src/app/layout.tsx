import type { Metadata } from "next";
import { Nanum_Gothic } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const nanumGothic = Nanum_Gothic({
  weight: ["400", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "파트너사 정보 DB 관리 대시보드",
  description: "파트너사 기본정보 및 연도별 DAN/선물 발송 관리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`antialiased ${nanumGothic.className}`}>
        <Providers>
          {children}
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
