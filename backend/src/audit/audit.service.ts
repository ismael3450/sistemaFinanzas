import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditFilterDto, AuditLogResponseDto, CreateAuditLogDto } from './dto';
import { Role, Prisma } from '@prisma/client';
import { PaginatedResponseDto } from '../common/dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: dto.action,
          module: dto.module,
          entityType: dto.entityType,
          entityId: dto.entityId,
          userId: dto.userId,
          organizationId: dto.organizationId,
          oldValues: dto.oldValues ? dto.oldValues : undefined,
          newValues: dto.newValues ? dto.newValues : undefined,
          metadata: dto.metadata ? dto.metadata : undefined,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  async findAll(
    organizationId: string,
    userId: string,
    filters: AuditFilterDto,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN]);

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.module && { module: filters.module }),
      ...(filters.action && { action: filters.action }),
      ...(filters.startDate && { createdAt: { gte: filters.startDate } }),
      ...(filters.endDate && { createdAt: { lte: filters.endDate } }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: filters.skip,
        take: filters.take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return new PaginatedResponseDto(
      logs.map(this.mapToResponse),
      total,
      filters.page || 1,
      filters.limit || 10,
    );
  }

  async getModules(organizationId: string, userId: string): Promise<string[]> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN]);

    const modules = await this.prisma.auditLog.findMany({
      where: { organizationId },
      select: { module: true },
      distinct: ['module'],
    });

    return modules.map(m => m.module);
  }

  private async checkPermission(orgId: string, userId: string, roles?: Role[]) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!membership?.isActive) throw new ForbiddenException('Not a member');
    if (roles && !roles.includes(membership.role)) throw new ForbiddenException('Insufficient permissions');
  }

  private mapToResponse(log: any): AuditLogResponseDto {
    return {
      id: log.id,
      organizationId: log.organizationId,
      userId: log.userId,
      userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : undefined,
      action: log.action,
      module: log.module,
      entityType: log.entityType,
      entityId: log.entityId,
      oldValues: log.oldValues,
      newValues: log.newValues,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    };
  }
}
