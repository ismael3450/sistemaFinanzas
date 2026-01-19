import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './dto';
import { Role, CategoryType } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateCategoryDto,
    userId: string,
  ): Promise<CategoryResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN, Role.TREASURER]);

    // Check parent exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, organizationId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    // Check duplicate
    const existing = await this.prisma.category.findFirst({
      where: { organizationId, name: dto.name, parentId: dto.parentId || null },
    });
    if (existing) throw new ConflictException('Category with this name already exists');

    const category = await this.prisma.category.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        type: dto.type || CategoryType.BOTH,
        parentId: dto.parentId,
        color: dto.color,
        icon: dto.icon,
      },
      include: { children: true },
    });

    await this.auditService.log({
      action: 'CREATE',
      module: 'categories',
      entityType: 'Category',
      entityId: category.id,
      userId,
      organizationId,
      newValues: { name: dto.name, type: dto.type },
    });

    return this.mapToResponse(category);
  }

  async findAll(
    organizationId: string,
    userId: string,
    includeInactive = false,
  ): Promise<CategoryResponseDto[]> {
    await this.checkPermission(organizationId, userId);

    const categories = await this.prisma.category.findMany({
      where: {
        organizationId,
        parentId: null, // Only root categories
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        children: {
          where: includeInactive ? {} : { isActive: true },
          include: { children: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((c) => this.mapToResponse(c));
  }

  async findOne(
    organizationId: string,
    categoryId: string,
    userId: string,
  ): Promise<CategoryResponseDto> {
    await this.checkPermission(organizationId, userId);

    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, organizationId },
      include: { children: true, parent: true },
    });

    if (!category) throw new NotFoundException('Category not found');
    return this.mapToResponse(category);
  }

  async update(
    organizationId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
    userId: string,
  ): Promise<CategoryResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN, Role.TREASURER]);

    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, organizationId },
    });
    if (!category) throw new NotFoundException('Category not found');

    // Prevent circular reference
    if (dto.parentId === categoryId) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: dto,
      include: { children: true },
    });

    await this.auditService.log({
      action: 'UPDATE',
      module: 'categories',
      entityType: 'Category',
      entityId: categoryId,
      userId,
      organizationId,
      oldValues: { name: category.name },
      newValues: dto,
    });

    return this.mapToResponse(updated);
  }

  async toggleActive(
    organizationId: string,
    categoryId: string,
    userId: string,
    isActive: boolean,
  ): Promise<CategoryResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN]);

    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, organizationId },
    });
    if (!category) throw new NotFoundException('Category not found');

    // Also toggle children
    await this.prisma.category.updateMany({
      where: { parentId: categoryId },
      data: { isActive },
    });

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: { isActive },
      include: { children: true },
    });

    await this.auditService.log({
      action: 'UPDATE',
      module: 'categories',
      entityType: 'Category',
      entityId: categoryId,
      userId,
      organizationId,
      oldValues: { isActive: !isActive },
      newValues: { isActive },
    });

    return this.mapToResponse(updated);
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

  private mapToResponse(category: any): CategoryResponseDto {
    return {
      id: category.id,
      organizationId: category.organizationId,
      name: category.name,
      description: category.description,
      type: category.type,
      parentId: category.parentId,
      color: category.color,
      icon: category.icon,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      children: category.children?.map(this.mapToResponse.bind(this)),
    };
  }
}
