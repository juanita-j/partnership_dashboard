/**
 * prisma generate 시 EXECUTIVE_COUNTERPART_DATABASE_URL 없으면 placeholder로 생성만 수행.
 * 런타임에는 반드시 실제 URL을 .env / 호스팅 환경 변수로 설정하세요.
 */
const { execSync } = require("child_process");
const path = require("path");

if (!process.env.EXECUTIVE_COUNTERPART_DATABASE_URL?.trim()) {
  process.env.EXECUTIVE_COUNTERPART_DATABASE_URL =
    "postgresql://placeholder:placeholder@127.0.0.1:5432/executive_gen_placeholder?schema=public";
}

const schema = path.join(__dirname, "..", "prisma", "executive-counterpart.prisma");
execSync(`npx prisma generate --schema "${schema}"`, { stdio: "inherit", env: process.env });
