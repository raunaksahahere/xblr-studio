import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with roles, permissions, users, and organizations...');

  // 1. Create Core Permissions
  const permissionsList = [
    { name: 'company:create', description: 'Create new company entities' },
    { name: 'company:view', description: 'View company profiles' },
    { name: 'company:edit', description: 'Edit company master data' },
    { name: 'project:create', description: 'Initiate filing projects' },
    { name: 'project:view', description: 'View filing project details' },
    { name: 'project:edit', description: 'Modify project configurations' },
    { name: 'document:upload', description: 'Upload compliance documents' },
    { name: 'document:view', description: 'Preview or download documents' },
    { name: 'document:delete', description: 'Remove documents from scope' },
    { name: 'review:override', description: 'Override extracted fact values' },
    { name: 'review:save', description: 'Save draft reviewer annotations' },
    { name: 'review:view', description: 'Inspect review dashboard' },
    { name: 'validation:clear', description: 'Clear active calculation errors' },
    { name: 'validation:view', description: 'Inspect validation dashboard' },
    { name: 'audit:view', description: 'Inspect system-wide audit trail logs' },
    { name: 'api:write', description: 'Generate organization API keys' },
  ];

  const dbPermissions: any = {};
  for (const perm of permissionsList) {
    dbPermissions[perm.name] = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  // 2. Create Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'System Administrator' },
  });

  const reviewerRole = await prisma.role.upsert({
    where: { name: 'REVIEWER' },
    update: {},
    create: { name: 'REVIEWER', description: 'Professional Auditor / Reviewer' },
  });

  const preparerRole = await prisma.role.upsert({
    where: { name: 'PREPARER' },
    update: {},
    create: { name: 'PREPARER', description: 'Filing Preparer' },
  });

  const clientRole = await prisma.role.upsert({
    where: { name: 'CLIENT' },
    update: {},
    create: { name: 'CLIENT', description: 'Corporate Client Portal user' },
  });

  // 3. Map Permissions to Roles
  // Admin gets all
  for (const perm of Object.values(dbPermissions) as any[]) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Reviewer permissions
  const reviewerPerms = [
    'company:create', 'company:view', 'company:edit',
    'project:create', 'project:view', 'project:edit',
    'document:view', 'document:upload', 'document:delete',
    'review:override', 'review:save', 'review:view',
    'validation:clear', 'validation:view', 'audit:view', 'api:write'
  ];
  for (const name of reviewerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: reviewerRole.id, permissionId: dbPermissions[name].id } },
      update: {},
      create: { roleId: reviewerRole.id, permissionId: dbPermissions[name].id },
    });
  }

  // Preparer permissions
  const preparerPerms = [
    'company:view', 'project:create', 'project:view', 'project:edit',
    'document:view', 'document:upload', 'document:delete', 'review:view', 'validation:view'
  ];
  for (const name of preparerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: preparerRole.id, permissionId: dbPermissions[name].id } },
      update: {},
      create: { roleId: preparerRole.id, permissionId: dbPermissions[name].id },
    });
  }

  // Client permissions
  const clientPerms = [
    'company:view', 'project:view', 'document:view', 'document:upload', 'review:view', 'validation:view'
  ];
  for (const name of clientPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: clientRole.id, permissionId: dbPermissions[name].id } },
      update: {},
      create: { roleId: clientRole.id, permissionId: dbPermissions[name].id },
    });
  }

  // 4. Create default organization
  const organization = await prisma.organization.upsert({
    where: { id: 'org-tax-consultants-111' },
    update: {},
    create: {
      id: 'org-tax-consultants-111',
      name: 'Taxation & Audit Consultants Ltd.',
      billingEmail: 'billing@auditconsultants.com',
      subscriptions: {
        create: {
          plan: 'ENTERPRISE',
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // 5. Create Seed Users
  const usersToSeed = [
    {
      email: 'admin@xbrlstudio.com',
      password: 'AdminSecretPass123',
      name: 'Prian Dev (Admin)',
      roleId: adminRole.id,
    },
    {
      email: 'reviewer@xbrlstudio.com',
      password: 'ReviewerSecretPass123',
      name: 'Rohan Sharma (Reviewer)',
      roleId: reviewerRole.id,
    },
    {
      email: 'preparer@xbrlstudio.com',
      password: 'PreparerSecretPass123',
      name: 'Sneha Patel (Preparer)',
      roleId: preparerRole.id,
    },
    {
      email: 'client@xbrlstudio.com',
      password: 'ClientSecretPass123',
      name: 'Amit Patel (Corporate Client)',
      roleId: clientRole.id,
    },
  ];

  for (const u of usersToSeed) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: {
        email: u.email,
        passwordHash,
        name: u.name,
        roleId: u.roleId,
        organizationId: organization.id,
      },
    });
  }

  // 6. Create Seed Company
  const company = await prisma.company.upsert({
    where: { cin: 'L17110MH1973PLC019786' },
    update: {},
    create: {
      cin: 'L17110MH1973PLC019786',
      name: 'Reliance Industries Limited',
      legalName: 'Reliance Industries Limited',
      registeredOffice: '3rd Floor, Maker Chambers IV, 222 Nariman Point, Mumbai, Maharashtra 400021',
      email: 'investor.relations@ril.com',
      phone: '022-35555000',
      organizationId: organization.id,
      profiles: {
        create: {
          sector: 'Conglomerate',
          authorizedCapital: 15000000000.00,
          paidUpCapital: 6765000000.00,
          activeStatus: 'ACTIVE',
          directorNames: 'Mukesh Ambani, Nita Ambani, Anant Ambani',
        },
      },
    },
  });

  // 7. Create Seed Financial Year
  await prisma.financialYear.upsert({
    where: { companyId_label: { companyId: company.id, label: '2024-2025' } },
    update: {},
    create: {
      companyId: company.id,
      organizationId: organization.id,
      label: '2024-2025',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-03-31'),
      reportingStandard: 'IND_AS',
      scheduleIiiDivision: 'DIVISION_II',
      taxonomyVersion: '2024',
      status: 'DRAFT',
    },
  });

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
