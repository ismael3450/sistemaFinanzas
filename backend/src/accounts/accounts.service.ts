import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MoneyService } from '../common/utils/money.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  AccountResponseDto,
  AccountBalanceDto,
} from './dto';
import { Role } from '@prisma/client';
import { PaginationDto, PaginatedResponseDto } from '../common/dto';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private moneyService: MoneyService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateAccountDto,
    userId: string,
  ): Promise<AccountResponseDto> {
    // Check permissions
    await this.checkPermission(organizationId, userId, [
      Role.OWNER,
      Role.ADMIN,
      Role.TREASURER,
    ]);

    // Check for duplicate name
    const existing = await this.prisma.account.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Account with this name already exists');
    }

    const initialBalance = BigInt(dto.initialBalance || 0);

    const account = await this.prisma.account.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        accountType: dto.accountType,
        currency: dto.currency || 'USD',
        initialBalance,
        currentBalance: initialBalance,
        color: dto.color,
        icon: dto.icon,
      },
    });

    // Log audit
    await this.auditService.log({
      action: 'CREATE',
      module: 'accounts',
      entityType: 'Account',
      entityId: account.id,
      userId,
      organizationId,
      newValues: { name: dto.name, accountType: dto.accountType },
    });

    return this.mapToResponse(account);
  }

  async findAll(
    organizationId: string,
    userId: string,
    pagination: PaginationDto,
    includeInactive: boolean = false,
  ): Promise<PaginatedResponseDto<AccountResponseDto>> {
    // Check membership
    await this.checkPermission(organizationId, userId);

    const where = {
      organizationId,
      ...(includeInactive ? {} : { isActive: true }),
    };

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.account.count({ where }),
    ]);

    return new PaginatedResponseDto(
      accounts.map(this.mapToResponse),
      total,
      pagination.page || 1,
      pagination.limit || 10,
    );
  }

  async findOne(
    organizationId: string,
    accountId: string,
    userId: string,
  ): Promise<AccountResponseDto> {
    await this.checkPermission(organizationId, userId);

    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.mapToResponse(account);
  }

  async getBalance(
    organizationId: string,
    accountId: string,
    userId: string,
  ): Promise<AccountBalanceDto> {
    await this.checkPermission(organizationId, userId);

    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        currentBalance: true,
        currency: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return {
      id: account.id,
      name: account.name,
      currentBalance: account.currentBalance.toString(),
      currency: account.currency,
      formattedBalance: this.moneyService.format(
        account.currentBalance,
        account.currency as any,
      ),
    };
  }

  async getAllBalances(
    organizationId: string,
    userId: string,
  ): Promise<AccountBalanceDto[]> {
    await this.checkPermission(organizationId, userId);

    const accounts = await this.prisma.account.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        currentBalance: true,
        currency: true,
      },
      orderBy: { name: 'asc' },
    });

    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      currentBalance: account.currentBalance.toString(),
      currency: account.currency,
      formattedBalance: this.moneyService.format(
        account.currentBalance,
        account.currency as any,
      ),
    }));
  }

  async update(
    organizationId: string,
    accountId: string,
    dto: UpdateAccountDto,
    userId: string,
  ): Promise<AccountResponseDto> {
    await this.checkPermission(organizationId, userId, [
      Role.OWNER,
      Role.ADMIN,
      Role.TREASURER,
    ]);

    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Check for duplicate name if name is being updated
    if (dto.name && dto.name !== account.name) {
      const existing = await this.prisma.account.findUnique({
        where: {
          organizationId_name: {
            organizationId,
            name: dto.name,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Account with this name already exists');
      }
    }

    const oldValues = { name: account.name, description: account.description };

    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: dto,
    });

    // Log audit
    await this.auditService.log({
      action: 'UPDATE',
      module: 'accounts',
      entityType: 'Account',
      entityId: accountId,
      userId,
      organizationId,
      oldValues,
      newValues: dto,
    });

    return this.mapToResponse(updated);
  }

  async toggleActive(
    organizationId: string,
    accountId: string,
    userId: string,
    isActive: boolean,
  ): Promise<AccountResponseDto> {
    await this.checkPermission(organizationId, userId, [
      Role.OWNER,
      Role.ADMIN,
    ]);

    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: { isActive },
    });

    // Log audit
    await this.auditService.log({
      action: 'UPDATE',
      module: 'accounts',
      entityType: 'Account',
      entityId: accountId,
      userId,
      organizationId,
      oldValues: { isActive: !isActive },
      newValues: { isActive },
    });

    return this.mapToResponse(updated);
  }

  // Internal method to update balance (used by transactions)
  async updateBalance(
    accountId: string,
    amount: bigint,
    operation: 'add' | 'subtract',
  ): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const newBalance =
      operation === 'add'
        ? account.currentBalance + amount
        : account.currentBalance - amount;

    await this.prisma.account.update({
      where: { id: accountId },
      data: { currentBalance: newBalance },
    });
  }

  private async checkPermission(
    organizationId: string,
    userId: string,
    requiredRoles?: Role[],
  ): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('Not a member of this organization');
    }

    if (requiredRoles && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private mapToResponse(account: any): AccountResponseDto {
    return {
      id: account.id,
      organizationId: account.organizationId,
      name: account.name,
      description: account.description,
      accountType: account.accountType,
      currency: account.currency,
      initialBalance: account.initialBalance.toString(),
      currentBalance: account.currentBalance.toString(),
      isActive: account.isActive,
      color: account.color,
      icon: account.icon,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
