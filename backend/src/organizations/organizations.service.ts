import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
  OrganizationWithStatsDto,
} from './dto';
import { generateSlug, generateUniqueSlug } from '../common/utils/slug.util';
import { Role } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(
    dto: CreateOrganizationDto,
    userId: string,
  ): Promise<OrganizationResponseDto> {
    // Generate unique slug
    let slug = generateSlug(dto.name);
    const existingSlug = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      slug = generateUniqueSlug(dto.name);
    }

    // Create organization with owner membership
    const organization = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          logoUrl: dto.logoUrl,
          currency: dto.currency || 'USD',
          timezone: dto.timezone || 'America/El_Salvador',
          fiscalYearStart: dto.fiscalYearStart || 1,
          createdById: userId,
        },
      });

      // Create owner membership
      await tx.membership.create({
        data: {
          userId,
          organizationId: org.id,
          role: Role.OWNER,
          joinedAt: new Date(),
        },
      });

      // Set as active organization for user
      await tx.user.update({
        where: { id: userId },
        data: { activeOrgId: org.id },
      });

      return org;
    });

    // Log audit
    await this.auditService.log({
      action: 'CREATE',
      module: 'organizations',
      entityType: 'Organization',
      entityId: organization.id,
      userId,
      organizationId: organization.id,
      newValues: { name: organization.name, slug: organization.slug },
    });

    return this.mapToResponse(organization);
  }

  async findAll(userId: string): Promise<OrganizationResponseDto[]> {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        organization: true,
      },
    });

    return memberships.map((m) => this.mapToResponse(m.organization));
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<OrganizationWithStatsDto> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: id,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Organization not found or access denied');
    }

    // Get stats
    const [memberCount, accountCount, totalBalance] = await Promise.all([
      this.prisma.membership.count({
        where: { organizationId: id, isActive: true },
      }),
      this.prisma.account.count({
        where: { organizationId: id, isActive: true },
      }),
      this.prisma.account.aggregate({
        where: { organizationId: id, isActive: true },
        _sum: { currentBalance: true },
      }),
    ]);

    return {
      ...this.mapToResponse(membership.organization),
      memberCount,
      accountCount,
      totalBalance: (totalBalance._sum.currentBalance || BigInt(0)).toString(),
    };
  }

  async findBySlug(
    slug: string,
    userId: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check membership
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: organization.id,
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapToResponse(organization);
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
    userId: string,
  ): Promise<OrganizationResponseDto> {
    // Check membership and role
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: id,
        },
      },
      include: { organization: true },
    });

    if (!membership) {
      throw new NotFoundException('Organization not found');
    }

    if (
        membership.role !== Role.OWNER &&
        membership.role !== Role.ADMIN
    ) {
      throw new ForbiddenException('Only owners and admins can update organization');
    }

    const oldValues = {
      name: membership.organization.name,
      description: membership.organization.description,
      currency: membership.organization.currency,
    };

    const organization = await this.prisma.organization.update({
      where: { id },
      data: dto,
    });

    // Log audit
    await this.auditService.log({
      action: 'UPDATE',
      module: 'organizations',
      entityType: 'Organization',
      entityId: id,
      userId,
      organizationId: id,
      oldValues,
      newValues: dto,
    });

    return this.mapToResponse(organization);
  }

  async setActiveOrganization(
    organizationId: string,
    userId: string,
  ): Promise<{ message: string }> {
    // Check membership
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

    await this.prisma.user.update({
      where: { id: userId },
      data: { activeOrgId: organizationId },
    });

    return { message: 'Active organization updated' };
  }

  async toggleActive(
    id: string,
    userId: string,
    isActive: boolean,
  ): Promise<OrganizationResponseDto> {
    // Only owner can activate/deactivate
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: id,
        },
      },
    });

    if (!membership || membership.role !== Role.OWNER) {
      throw new ForbiddenException('Only owner can activate/deactivate organization');
    }

    const organization = await this.prisma.organization.update({
      where: { id },
      data: { isActive },
    });

    // Log audit
    await this.auditService.log({
      action: 'UPDATE',
      module: 'organizations',
      entityType: 'Organization',
      entityId: id,
      userId,
      organizationId: id,
      oldValues: { isActive: !isActive },
      newValues: { isActive },
    });

    return this.mapToResponse(organization);
  }

  private mapToResponse(organization: any): OrganizationResponseDto {
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      logoUrl: organization.logoUrl,
      currency: organization.currency,
      timezone: organization.timezone,
      fiscalYearStart: organization.fiscalYearStart,
      isActive: organization.isActive,
      createdById: organization.createdById,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}
