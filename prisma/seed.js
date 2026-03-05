const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const companyAliases = [
  { normalizedName: "현대차", alias: "hyundai motors", locale: "en" },
  { normalizedName: "현대차", alias: "hyundai motor company", locale: "en" },
  { normalizedName: "현대차", alias: "hyundai motor group", locale: "en" },
  { normalizedName: "현대차", alias: "현대차", locale: "ko" },
  { normalizedName: "현대차", alias: "현대자동차", locale: "ko" },
  { normalizedName: "삼성", alias: "samsung", locale: "en" },
  { normalizedName: "삼성", alias: "samsung electronics", locale: "en" },
  { normalizedName: "삼성", alias: "삼성", locale: "ko" },
  { normalizedName: "삼성", alias: "삼성전자", locale: "ko" },
  { normalizedName: "LG", alias: "lg", locale: "en" },
  { normalizedName: "LG", alias: "lg electronics", locale: "en" },
  { normalizedName: "LG", alias: "엘지", locale: "ko" },
  { normalizedName: "LG", alias: "lg전자", locale: "ko" },
  { normalizedName: "LG", alias: "LG전자", locale: "ko" },
];

async function main() {
  for (const a of companyAliases) {
    await prisma.companyAlias.upsert({
      where: {
        normalizedName_alias: {
          normalizedName: a.normalizedName,
          alias: a.alias,
        },
      },
      create: a,
      update: {},
    });
  }
  console.log("Seed completed: CompanyAlias entries created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
