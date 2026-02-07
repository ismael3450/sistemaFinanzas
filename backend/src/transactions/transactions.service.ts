import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountsService } from '../accounts/accounts.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  VoidTransactionDto,
  TransactionFilterDto,
  TransactionResponseDto,
} from './dto';
import { Role, TransactionType, TransactionStatus, Prisma } from '@prisma/client';
import { PaginatedResponseDto } from '../common/dto';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private accountsService: AccountsService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateTransactionDto,
    userId: string,
  ): Promise<TransactionResponseDto> {
    await this.checkPermission(organizationId, userId, [
      Role.OWNER, Role.ADMIN, Role.TREASURER, Role.MEMBER,
    ]);

    // Validate accounts based on type
    this.validateTransactionAccounts(dto);

    const amount = BigInt(dto.amount);
    const reference = dto.reference?.trim() || this.generateReference();

    // Use transaction for atomic operations
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Create transaction
      const txn = await tx.transaction.create({
        data: {
          organizationId,
          type: dto.type,
          status: TransactionStatus.COMPLETED,
          amount,
          currency: dto.currency || 'USD',
          description: dto.description,
          reference,
          categoryId: dto.categoryId,
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          paymentMethodId: dto.paymentMethodId,
          createdById: userId,
          transactionDate: dto.transactionDate,
        },
        include: {
          category: true,
          fromAccount: true,
          toAccount: true,
          paymentMethod: true,
          createdBy: true,
          attachments: true,
        },
      });

      // Update account balances
      if (dto.type === TransactionType.INCOME && dto.toAccountId) {
        await tx.account.update({
          where: { id: dto.toAccountId },
          data: { currentBalance: { increment: amount } },
        });
      } else if (dto.type === TransactionType.EXPENSE && dto.fromAccountId) {
        await tx.account.update({
          where: { id: dto.fromAccountId },
          data: { currentBalance: { decrement: amount } },
        });
      } else if (dto.type === TransactionType.TRANSFER) {
        if (dto.fromAccountId) {
          await tx.account.update({
            where: { id: dto.fromAccountId },
            data: { currentBalance: { decrement: amount } },
          });
        }
        if (dto.toAccountId) {
          await tx.account.update({
            where: { id: dto.toAccountId },
            data: { currentBalance: { increment: amount } },
          });
        }
      }

      return txn;
    });

    await this.auditService.log({
      action: 'CREATE',
      module: 'transactions',
      entityType: 'Transaction',
      entityId: transaction.id,
      userId,
      organizationId,
      newValues: { type: dto.type, amount: dto.amount },
    });

    return this.mapToResponse(transaction);
  }

  async findAll(
    organizationId: string,
    userId: string,
    filters: TransactionFilterDto,
  ): Promise<PaginatedResponseDto<TransactionResponseDto>> {
    await this.checkPermission(organizationId, userId);

    const where: Prisma.TransactionWhereInput = {
      organizationId,
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.accountId && {
        OR: [
          { fromAccountId: filters.accountId },
          { toAccountId: filters.accountId },
        ],
      }),
      ...(filters.startDate && { transactionDate: { gte: filters.startDate } }),
      ...(filters.endDate && { transactionDate: { lte: filters.endDate } }),
      ...(filters.search && {
        OR: [
          { description: { contains: filters.search, mode: 'insensitive' } },
          { reference: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          category: true,
          fromAccount: true,
          toAccount: true,
          paymentMethod: true,
          createdBy: true,
          attachments: true,
        },
        orderBy: { transactionDate: 'desc' },
        skip: filters.skip,
        take: filters.take,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return new PaginatedResponseDto(
      transactions.map(this.mapToResponse),
      total,
      filters.page || 1,
      filters.limit || 10,
    );
  }

  async findOne(
    organizationId: string,
    transactionId: string,
    userId: string,
  ): Promise<TransactionResponseDto> {
    await this.checkPermission(organizationId, userId);

    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, organizationId },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        paymentMethod: true,
        createdBy: true,
        attachments: true,
      },
    });

    if (!transaction) throw new NotFoundException('Transaction not found');
    return this.mapToResponse(transaction);
  }

  async update(
    organizationId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
    userId: string,
  ): Promise<TransactionResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN, Role.TREASURER]);

    const existing = await this.prisma.transaction.findFirst({
      where: { id: transactionId, organizationId },
    });

    if (!existing) throw new NotFoundException('Transaction not found');
    if (existing.status === TransactionStatus.VOIDED) {
      throw new BadRequestException('Cannot update voided transaction');
    }

    // For simplicity, only allow updating description, reference, category, payment method
    const updated = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        description: dto.description,
        reference: dto.reference,
        categoryId: dto.categoryId,
        paymentMethodId: dto.paymentMethodId,
      },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        paymentMethod: true,
        createdBy: true,
        attachments: true,
      },
    });

    await this.auditService.log({
      action: 'UPDATE',
      module: 'transactions',
      entityType: 'Transaction',
      entityId: transactionId,
      userId,
      organizationId,
      oldValues: { description: existing.description },
      newValues: dto,
    });

    return this.mapToResponse(updated);
  }

  async voidTransaction(
    organizationId: string,
    transactionId: string,
    dto: VoidTransactionDto,
    userId: string,
  ): Promise<TransactionResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN]);

    const existing = await this.prisma.transaction.findFirst({
      where: { id: transactionId, organizationId },
    });

    if (!existing) throw new NotFoundException('Transaction not found');
    if (existing.status === TransactionStatus.VOIDED) {
      throw new BadRequestException('Transaction already voided');
    }

    const amount = existing.amount;

    // Reverse the transaction in atomic operation
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Reverse account balances
      if (existing.type === TransactionType.INCOME && existing.toAccountId) {
        await tx.account.update({
          where: { id: existing.toAccountId },
          data: { currentBalance: { decrement: amount } },
        });
      } else if (existing.type === TransactionType.EXPENSE && existing.fromAccountId) {
        await tx.account.update({
          where: { id: existing.fromAccountId },
          data: { currentBalance: { increment: amount } },
        });
      } else if (existing.type === TransactionType.TRANSFER) {
        if (existing.fromAccountId) {
          await tx.account.update({
            where: { id: existing.fromAccountId },
            data: { currentBalance: { increment: amount } },
          });
        }
        if (existing.toAccountId) {
          await tx.account.update({
            where: { id: existing.toAccountId },
            data: { currentBalance: { decrement: amount } },
          });
        }
      }

      return tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.VOIDED,
          voidedAt: new Date(),
          voidReason: dto.reason,
        },
        include: {
          category: true,
          fromAccount: true,
          toAccount: true,
          paymentMethod: true,
          createdBy: true,
          attachments: true,
        },
      });
    });

    await this.auditService.log({
      action: 'VOID',
      module: 'transactions',
      entityType: 'Transaction',
      entityId: transactionId,
      userId,
      organizationId,
      oldValues: { status: existing.status },
      newValues: { status: TransactionStatus.VOIDED, voidReason: dto.reason },
    });

    return this.mapToResponse(transaction);
  }

  async addAttachment(
    organizationId: string,
    transactionId: string,
    userId: string,
    file: { fileName: string; fileUrl: string; fileType: string; fileSize: number },
  ): Promise<TransactionResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN, Role.TREASURER, Role.MEMBER]);

    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, organizationId },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');

    await this.prisma.transactionAttachment.create({
      data: {
        transactionId,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        fileType: file.fileType,
        fileSize: file.fileSize,
      },
    });

    return this.findOne(organizationId, transactionId, userId);
  }

  private validateTransactionAccounts(dto: CreateTransactionDto): void {
    switch (dto.type) {
      case TransactionType.INCOME:
        if (!dto.toAccountId) {
          throw new BadRequestException('INCOME requires toAccountId');
        }
        break;
      case TransactionType.EXPENSE:
        if (!dto.fromAccountId) {
          throw new BadRequestException('EXPENSE requires fromAccountId');
        }
        break;
      case TransactionType.TRANSFER:
        if (!dto.fromAccountId || !dto.toAccountId) {
          throw new BadRequestException('TRANSFER requires both fromAccountId and toAccountId');
        }
        if (dto.fromAccountId === dto.toAccountId) {
          throw new BadRequestException('Cannot transfer to the same account');
        }
        break;
    }
  }

  private async checkPermission(orgId: string, userId: string, roles?: Role[]) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!membership?.isActive) throw new ForbiddenException('Not a member');
    if (roles && !roles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private mapToResponse(txn: any): TransactionResponseDto {
    return {
      id: txn.id,
      organizationId: txn.organizationId,
      type: txn.type,
      status: txn.status,
      amount: txn.amount.toString(),
      currency: txn.currency,
      description: txn.description,
      reference: txn.reference,
      categoryId: txn.categoryId,
      categoryName: txn.category?.name,
      fromAccountId: txn.fromAccountId,
      fromAccountName: txn.fromAccount?.name,
      toAccountId: txn.toAccountId,
      toAccountName: txn.toAccount?.name,
      paymentMethodId: txn.paymentMethodId,
      paymentMethodName: txn.paymentMethod?.name,
      createdById: txn.createdById,
      createdByName: txn.createdBy ? `${txn.createdBy.firstName} ${txn.createdBy.lastName}` : '',
      transactionDate: txn.transactionDate,
      createdAt: txn.createdAt,
      updatedAt: txn.updatedAt,
      voidedAt: txn.voidedAt,
      voidReason: txn.voidReason,
      attachments: txn.attachments?.map((a: any) => ({
        id: a.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileType: a.fileType,
        fileSize: a.fileSize,
        createdAt: a.createdAt,
      })),
    };
  }

  private generateReference(): string {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate(),
    ).padStart(2, '0')}`;
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `TRX-${datePart}-${randomPart}`;
  }
}
