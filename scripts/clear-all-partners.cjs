const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const yearly = await prisma.yearlyEvent.deleteMany({});
  const partners = await prisma.partner.deleteMany({});
  console.log("Deleted", yearly.count, "yearly events and", partners.count, "partners.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
