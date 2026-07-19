const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const memory = await prisma.companyMemory.findMany();
  console.log('--- CompanyMemory Records ---');
  console.log(JSON.stringify(memory, null, 2));

  const projects = await prisma.project.findMany({
    include: {
      company: true,
    }
  });
  console.log('--- Projects ---');
  console.log(JSON.stringify(projects, null, 2));
}

main().finally(() => prisma.$disconnect());
