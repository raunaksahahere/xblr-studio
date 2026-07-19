const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      role: true,
      organization: true,
    }
  });
  console.log('--- Seeded Users ---');
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
