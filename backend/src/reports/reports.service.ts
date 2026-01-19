import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReportQueryDto, PeriodSummaryDto, CategoryReportDto, CategoryReportItemDto,
  AccountReportItemDto, TrendsReportDto, TrendDataPointDto,
} from './dto';
import { TransactionType, TransactionStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getPeriodSummary(
    organizationId: string,
    userId: string,
    query: ReportQueryDto,
  ): Promise<PeriodSummaryDto> {
    await this.checkPermission(organizationId, userId);

    const dateFilter = this.buildDateFilter(query);

    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          organizationId,
          type: TransactionType.INCOME,
          status: TransactionStatus.COMPLETED,
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: {
          organizationId,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.COMPLETED,
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount || BigInt(0);
    const totalExpense = expenseAgg._sum.amount || BigInt(0);
    const netBalance = totalIncome - totalExpense;

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { currency: true },
    });

    return {
      totalIncome: totalIncome.toString(),
      totalExpense: totalExpense.toString(),
      netBalance: netBalance.toString(),
      transactionCount: incomeAgg._count + expenseAgg._count,
      incomeCount: incomeAgg._count,
      expenseCount: expenseAgg._count,
      currency: org?.currency || 'USD',
    };
  }

  async getCategoryReport(
    organizationId: string,
    userId: string,
    query: ReportQueryDto,
  ): Promise<CategoryReportDto> {
    await this.checkPermission(organizationId, userId);

    const dateFilter = this.buildDateFilter(query);

    const transactions = await this.prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: {
        organizationId,
        status: TransactionStatus.COMPLETED,
        categoryId: { not: null },
        ...dateFilter,
      },
      _sum: { amount: true },
      _count: true,
    });

    const categories = await this.prisma.category.findMany({
      where: { organizationId },
    });
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const incomeItems: CategoryReportItemDto[] = [];
    const expenseItems: CategoryReportItemDto[] = [];
    let totalIncome = BigInt(0);
    let totalExpense = BigInt(0);

    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME) {
        totalIncome += t._sum.amount || BigInt(0);
      } else if (t.type === TransactionType.EXPENSE) {
        totalExpense += t._sum.amount || BigInt(0);
      }
    });

    transactions.forEach(t => {
      const item = {
        categoryId: t.categoryId!,
        categoryName: categoryMap.get(t.categoryId!) || 'Unknown',
        totalAmount: (t._sum.amount || BigInt(0)).toString(),
        transactionCount: t._count,
        percentage: 0,
      };

      if (t.type === TransactionType.INCOME) {
        item.percentage = totalIncome > 0
          ? Number((BigInt(100) * (t._sum.amount || BigInt(0))) / totalIncome)
          : 0;
        incomeItems.push(item);
      } else if (t.type === TransactionType.EXPENSE) {
        item.percentage = totalExpense > 0
          ? Number((BigInt(100) * (t._sum.amount || BigInt(0))) / totalExpense)
          : 0;
        expenseItems.push(item);
      }
    });

    return {
      incomeByCategory: incomeItems.sort((a, b) => Number(BigInt(b.totalAmount) - BigInt(a.totalAmount))),
      expenseByCategory: expenseItems.sort((a, b) => Number(BigInt(b.totalAmount) - BigInt(a.totalAmount))),
    };
  }

  async getAccountReport(
    organizationId: string,
    userId: string,
    query: ReportQueryDto,
  ): Promise<AccountReportItemDto[]> {
    await this.checkPermission(organizationId, userId);

    const dateFilter = this.buildDateFilter(query);

    const accounts = await this.prisma.account.findMany({
      where: { organizationId, isActive: true },
    });

    const results: AccountReportItemDto[] = [];

    for (const account of accounts) {
      const [incomeAgg, expenseAgg] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: {
            organizationId,
            toAccountId: account.id,
            type: TransactionType.INCOME,
            status: TransactionStatus.COMPLETED,
            ...dateFilter,
          },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.transaction.aggregate({
          where: {
            organizationId,
            fromAccountId: account.id,
            type: TransactionType.EXPENSE,
            status: TransactionStatus.COMPLETED,
            ...dateFilter,
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      results.push({
        accountId: account.id,
        accountName: account.name,
        currentBalance: account.currentBalance.toString(),
        totalIncome: (incomeAgg._sum.amount || BigInt(0)).toString(),
        totalExpense: (expenseAgg._sum.amount || BigInt(0)).toString(),
        transactionCount: incomeAgg._count + expenseAgg._count,
      });
    }

    return results;
  }

  async getTrendsReport(
    organizationId: string,
    userId: string,
    query: ReportQueryDto,
  ): Promise<TrendsReportDto> {
    await this.checkPermission(organizationId, userId);

    const dateFilter = this.buildDateFilter(query);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        organizationId,
        status: TransactionStatus.COMPLETED,
        ...dateFilter,
      },
      select: { type: true, amount: true, transactionDate: true },
      orderBy: { transactionDate: 'asc' },
    });

    // Group by day
    const dailyMap = new Map<string, { income: bigint; expense: bigint }>();
    const monthlyMap = new Map<string, { income: bigint; expense: bigint }>();

    transactions.forEach(t => {
      const dayKey = t.transactionDate.toISOString().split('T')[0];
      const monthKey = dayKey.substring(0, 7);

      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, { income: BigInt(0), expense: BigInt(0) });
      }
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { income: BigInt(0), expense: BigInt(0) });
      }

      const daily = dailyMap.get(dayKey)!;
      const monthly = monthlyMap.get(monthKey)!;

      if (t.type === TransactionType.INCOME) {
        daily.income += t.amount;
        monthly.income += t.amount;
      } else if (t.type === TransactionType.EXPENSE) {
        daily.expense += t.amount;
        monthly.expense += t.amount;
      }
    });

    const dailyTrends: TrendDataPointDto[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      income: data.income.toString(),
      expense: data.expense.toString(),
      net: (data.income - data.expense).toString(),
    }));

    const monthlyTrends: TrendDataPointDto[] = Array.from(monthlyMap.entries()).map(([date, data]) => ({
      date,
      income: data.income.toString(),
      expense: data.expense.toString(),
      net: (data.income - data.expense).toString(),
    }));

    return { dailyTrends, monthlyTrends };
  }

  private buildDateFilter(query: ReportQueryDto) {
    const filter: any = {};
    if (query.startDate || query.endDate) {
      filter.transactionDate = {};
      if (query.startDate) filter.transactionDate.gte = query.startDate;
      if (query.endDate) filter.transactionDate.lte = query.endDate;
    }
    return filter;
  }

  private async checkPermission(orgId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!membership?.isActive) throw new ForbiddenException('Not a member');
  }
}
