import { PrismaClient, Role, CategoryType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create subscription plans
  const plans = await Promise.all([
    prisma.subscriptionPlan.upsert({
      where: { name: 'Free' },
      update: {},
      create: {
        name: 'Free',
        description: 'Plan gratuito para empezar',
        price: 0,
        currency: 'USD',
        interval: 'month',
        maxUsers: 2,
        maxAccounts: 3,
        maxTransactions: 100,
        hasExports: false,
        hasReports: true,
        hasAuditLog: false,
        hasApiAccess: false,
        trialDays: 0,
        sortOrder: 0,
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { name: 'Basic' },
      update: {},
      create: {
        name: 'Basic',
        description: 'Plan básico para organizaciones pequeñas',
        price: 999, // $9.99
        currency: 'USD',
        interval: 'month',
        maxUsers: 5,
        maxAccounts: 10,
        maxTransactions: 500,
        hasExports: true,
        hasReports: true,
        hasAuditLog: false,
        hasApiAccess: false,
        trialDays: 14,
        sortOrder: 1,
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { name: 'Professional' },
      update: {},
      create: {
        name: 'Professional',
        description: 'Plan profesional con todas las funciones',
        price: 2499, // $24.99
        currency: 'USD',
        interval: 'month',
        maxUsers: 20,
        maxAccounts: 50,
        maxTransactions: 5000,
        hasExports: true,
        hasReports: true,
        hasAuditLog: true,
        hasApiAccess: false,
        trialDays: 14,
        sortOrder: 2,
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { name: 'Enterprise' },
      update: {},
      create: {
        name: 'Enterprise',
        description: 'Plan empresarial sin límites',
        price: 9999, // $99.99
        currency: 'USD',
        interval: 'month',
        maxUsers: -1, // unlimited
        maxAccounts: -1,
        maxTransactions: -1,
        hasExports: true,
        hasReports: true,
        hasAuditLog: true,
        hasApiAccess: true,
        trialDays: 30,
        sortOrder: 3,
      },
    }),
  ]);

  console.log(`✅ Created ${plans.length} subscription plans`);

  // Create admin user
  const hashedPassword = await argon2.hash('Admin123!');
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      emailVerified: true,
      isActive: true,
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-organization' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-organization',
      description: 'Organización de demostración',
      currency: 'USD',
      timezone: 'America/El_Salvador',
      createdById: adminUser.id,
    },
  });

  console.log(`✅ Created demo organization: ${demoOrg.name}`);

  // Create membership for admin
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: adminUser.id,
        organizationId: demoOrg.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      organizationId: demoOrg.id,
      role: Role.OWNER,
      joinedAt: new Date(),
    },
  });

  // Set active organization for admin
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { activeOrgId: demoOrg.id },
  });

  console.log(`✅ Created membership for admin in demo organization`);

  // Create subscription for demo org (Free plan)
  const freePlan = plans.find(p => p.name === 'Free');
  if (freePlan) {
    await prisma.organizationSubscription.upsert({
      where: { organizationId: demoOrg.id },
      update: {},
      create: {
        organizationId: demoOrg.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`✅ Created subscription for demo organization`);
  }

  // Create default categories
  const defaultCategories = [
    // Income categories
    { name: 'Donaciones', type: CategoryType.INCOME, icon: 'heart', color: '#10B981' },
    { name: 'Ofrendas', type: CategoryType.INCOME, icon: 'gift', color: '#059669' },
    { name: 'Diezmos', type: CategoryType.INCOME, icon: 'trending-up', color: '#047857' },
    { name: 'Cuotas', type: CategoryType.INCOME, icon: 'users', color: '#0D9488' },
    { name: 'Ventas', type: CategoryType.INCOME, icon: 'shopping-cart', color: '#0891B2' },
    { name: 'Otros Ingresos', type: CategoryType.INCOME, icon: 'plus-circle', color: '#0284C7' },
    
    // Expense categories
    { name: 'Servicios Básicos', type: CategoryType.EXPENSE, icon: 'zap', color: '#F59E0B' },
    { name: 'Alquiler', type: CategoryType.EXPENSE, icon: 'home', color: '#D97706' },
    { name: 'Sueldos', type: CategoryType.EXPENSE, icon: 'briefcase', color: '#B45309' },
    { name: 'Mantenimiento', type: CategoryType.EXPENSE, icon: 'tool', color: '#92400E' },
    { name: 'Compras', type: CategoryType.EXPENSE, icon: 'shopping-bag', color: '#EF4444' },
    { name: 'Eventos', type: CategoryType.EXPENSE, icon: 'calendar', color: '#DC2626' },
    { name: 'Transporte', type: CategoryType.EXPENSE, icon: 'truck', color: '#B91C1C' },
    { name: 'Otros Gastos', type: CategoryType.EXPENSE, icon: 'minus-circle', color: '#991B1B' },
  ];

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: {
        organizationId_name_parentId: {
          organizationId: demoOrg.id,
          name: cat.name,
          parentId: null as unknown as string,
        },
      },
      update: {},
      create: {
        organizationId: demoOrg.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
      },
    });
  }

  console.log(`✅ Created ${defaultCategories.length} default categories`);

  // Create default accounts
  const defaultAccounts = [
    { name: 'Caja Chica', accountType: 'cash', color: '#10B981', icon: 'wallet' },
    { name: 'Banco Principal', accountType: 'bank', color: '#3B82F6', icon: 'landmark' },
  ];

  for (const acc of defaultAccounts) {
    await prisma.account.upsert({
      where: {
        organizationId_name: {
          organizationId: demoOrg.id,
          name: acc.name,
        },
      },
      update: {},
      create: {
        organizationId: demoOrg.id,
        name: acc.name,
        accountType: acc.accountType,
        color: acc.color,
        icon: acc.icon,
        currency: 'USD',
      },
    });
  }

  console.log(`✅ Created ${defaultAccounts.length} default accounts`);

  // Create default payment methods
  const defaultPaymentMethods = [
    { name: 'Efectivo' },
    { name: 'Transferencia Bancaria' },
    { name: 'Cheque' },
    { name: 'Tarjeta de Crédito' },
    { name: 'Tarjeta de Débito' },
  ];

  for (const pm of defaultPaymentMethods) {
    await prisma.paymentMethod.upsert({
      where: {
        organizationId_name: {
          organizationId: demoOrg.id,
          name: pm.name,
        },
      },
      update: {},
      create: {
        organizationId: demoOrg.id,
        name: pm.name,
      },
    });
  }

  console.log(`✅ Created ${defaultPaymentMethods.length} default payment methods`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
