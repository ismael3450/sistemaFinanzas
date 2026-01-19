import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto, PaymentMethodResponseDto } from './dto';
import { Role } from '@prisma/client';

@Injectable()
export class PaymentMethodsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(
    organizationId: string,
    dto: CreatePaymentMethodDto,
    userId: string,
  ): Promise<PaymentMethodResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN, Role.TREASURER]);

    const existing = await this.prisma.paymentMethod.findUnique({
      where: { organizationId_name: { organizationId, name: dto.name } },
    });
    if (existing) throw new ConflictException('Payment method already exists');

    const pm = await this.prisma.paymentMethod.create({
      data: { organizationId, name: dto.name, description: dto.description },
    });

    await this.auditService.log({
      action: 'CREATE',
      module: 'payment-methods',
      entityType: 'PaymentMethod',
      entityId: pm.id,
      userId,
      organizationId,
      newValues: { name: dto.name },
    });

    return this.mapToResponse(pm);
  }

  async findAll(organizationId: string, userId: string, includeInactive = false): Promise<PaymentMethodResponseDto[]> {
    await this.checkPermission(organizationId, userId);

    const methods = await this.prisma.paymentMethod.findMany({
      where: { organizationId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });

    return methods.map(this.mapToResponse);
  }

  async findOne(organizationId: string, pmId: string, userId: string): Promise<PaymentMethodResponseDto> {
    await this.checkPermission(organizationId, userId);

    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id: pmId, organizationId },
    });
    if (!pm) throw new NotFoundException('Payment method not found');

    return this.mapToResponse(pm);
  }

  async update(
    organizationId: string,
    pmId: string,
    dto: UpdatePaymentMethodDto,
    userId: string,
  ): Promise<PaymentMethodResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN, Role.TREASURER]);

    const pm = await this.prisma.paymentMethod.findFirst({ where: { id: pmId, organizationId } });
    if (!pm) throw new NotFoundException('Payment method not found');

    const updated = await this.prisma.paymentMethod.update({
      where: { id: pmId },
      data: dto,
    });

    await this.auditService.log({
      action: 'UPDATE',
      module: 'payment-methods',
      entityType: 'PaymentMethod',
      entityId: pmId,
      userId,
      organizationId,
      oldValues: { name: pm.name },
      newValues: dto,
    });

    return this.mapToResponse(updated);
  }

  async toggleActive(organizationId: string, pmId: string, userId: string, isActive: boolean): Promise<PaymentMethodResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN]);

    const pm = await this.prisma.paymentMethod.findFirst({ where: { id: pmId, organizationId } });
    if (!pm) throw new NotFoundException('Payment method not found');

    const updated = await this.prisma.paymentMethod.update({
      where: { id: pmId },
      data: { isActive },
    });

    return this.mapToResponse(updated);
  }

  private async checkPermission(orgId: string, userId: string, roles?: Role[]) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!membership?.isActive) throw new ForbiddenException('Not a member');
    if (roles && !roles.includes(membership.role)) throw new ForbiddenException('Insufficient permissions');
  }

  private mapToResponse(pm: any): PaymentMethodResponseDto {
    return {
      id: pm.id,
      organizationId: pm.organizationId,
      name: pm.name,
      description: pm.description,
      isActive: pm.isActive,
      createdAt: pm.createdAt,
      updatedAt: pm.updatedAt,
    };
  }
}
