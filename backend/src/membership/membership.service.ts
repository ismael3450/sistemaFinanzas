import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  InviteMemberDto,
  UpdateMemberRoleDto,
  MemberResponseDto,
} from './dto';
import { Role } from '@prisma/client';
import { PaginationDto, PaginatedResponseDto } from '../common/dto';

@Injectable()
export class MembershipService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Role hierarchy for permission checks
  private roleHierarchy: Record<Role, number> = {
    OWNER: 5,
    ADMIN: 4,
    TREASURER: 3,
    MEMBER: 2,
    VIEWER: 1,
  };

  async inviteMember(
    organizationId: string,
    dto: InviteMemberDto,
    inviterId: string,
  ): Promise<MemberResponseDto> {
    // Check inviter permissions
    const inviterMembership = await this.getMembershipWithCheck(
      organizationId,
      inviterId,
      [Role.OWNER, Role.ADMIN],
    );

    // Cannot invite with higher role than yourself (except OWNER can invite anyone)
    if (
      inviterMembership.role !== Role.OWNER &&
      this.roleHierarchy[dto.role || Role.MEMBER] >= this.roleHierarchy[inviterMembership.role]
    ) {
      throw new ForbiddenException('Cannot invite member with equal or higher role');
    }

    // Find or validate user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User with this email not found. User must register first.');
    }

    // Check if already a member
    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new ConflictException('User is already a member of this organization');
      }
      // Reactivate membership
      const membership = await this.prisma.membership.update({
        where: { id: existingMembership.id },
        data: {
          isActive: true,
          role: dto.role || Role.MEMBER,
          joinedAt: new Date(),
        },
        include: { user: true },
      });

      return this.mapToResponse(membership);
    }

    // Create new membership
    const membership = await this.prisma.membership.create({
      data: {
        userId: user.id,
        organizationId,
        role: dto.role || Role.MEMBER,
        joinedAt: new Date(),
      },
      include: { user: true },
    });

    // Log audit
    await this.auditService.log({
      action: 'INVITE',
      module: 'membership',
      entityType: 'Membership',
      entityId: membership.id,
      userId: inviterId,
      organizationId,
      newValues: { email: dto.email, role: dto.role },
    });

    return this.mapToResponse(membership);
  }

  async findAll(
    organizationId: string,
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<MemberResponseDto>> {
    // Check membership
    await this.getMembershipWithCheck(organizationId, userId);

    const [members, total] = await Promise.all([
      this.prisma.membership.findMany({
        where: { organizationId, isActive: true },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.membership.count({
        where: { organizationId, isActive: true },
      }),
    ]);

    return new PaginatedResponseDto(
      members.map(this.mapToResponse),
      total,
      pagination.page || 1,
      pagination.limit || 10,
    );
  }

  async findOne(
    organizationId: string,
    memberId: string,
    userId: string,
  ): Promise<MemberResponseDto> {
    // Check viewer membership
    await this.getMembershipWithCheck(organizationId, userId);

    const membership = await this.prisma.membership.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
      include: { user: true },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    return this.mapToResponse(membership);
  }

  async updateRole(
    organizationId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
    userId: string,
  ): Promise<MemberResponseDto> {
    // Check permissions
    const requesterMembership = await this.getMembershipWithCheck(
      organizationId,
      userId,
      [Role.OWNER, Role.ADMIN],
    );

    // Find target membership
    const targetMembership = await this.prisma.membership.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
      include: { user: true },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found');
    }

    // Cannot change own role (unless OWNER)
    if (targetMembership.userId === userId && requesterMembership.role !== Role.OWNER) {
      throw new ForbiddenException('Cannot change your own role');
    }

    // Cannot change role of someone with higher/equal role (unless OWNER)
    if (
      requesterMembership.role !== Role.OWNER &&
      this.roleHierarchy[targetMembership.role] >= this.roleHierarchy[requesterMembership.role]
    ) {
      throw new ForbiddenException('Cannot change role of member with equal or higher role');
    }

    // Cannot assign higher role than yourself (unless OWNER)
    if (
      requesterMembership.role !== Role.OWNER &&
      this.roleHierarchy[dto.role] >= this.roleHierarchy[requesterMembership.role]
    ) {
      throw new ForbiddenException('Cannot assign equal or higher role');
    }

    // Cannot remove OWNER role if it's the last owner
    if (targetMembership.role === Role.OWNER && dto.role !== Role.OWNER) {
      const ownerCount = await this.prisma.membership.count({
        where: {
          organizationId,
          role: Role.OWNER,
          isActive: true,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last owner');
      }
    }

    const oldRole = targetMembership.role;

    const membership = await this.prisma.membership.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: { user: true },
    });

    // Log audit
    await this.auditService.log({
      action: 'UPDATE',
      module: 'membership',
      entityType: 'Membership',
      entityId: memberId,
      userId,
      organizationId,
      oldValues: { role: oldRole },
      newValues: { role: dto.role },
    });

    return this.mapToResponse(membership);
  }

  async revokeMembership(
    organizationId: string,
    memberId: string,
    userId: string,
  ): Promise<{ message: string }> {
    // Check permissions
    const requesterMembership = await this.getMembershipWithCheck(
      organizationId,
      userId,
      [Role.OWNER, Role.ADMIN],
    );

    // Find target membership
    const targetMembership = await this.prisma.membership.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found');
    }

    // Cannot revoke own membership
    if (targetMembership.userId === userId) {
      throw new ForbiddenException('Cannot revoke your own membership');
    }

    // Cannot revoke membership of someone with higher/equal role (unless OWNER)
    if (
      requesterMembership.role !== Role.OWNER &&
      this.roleHierarchy[targetMembership.role] >= this.roleHierarchy[requesterMembership.role]
    ) {
      throw new ForbiddenException('Cannot revoke membership of member with equal or higher role');
    }

    // Cannot remove last OWNER
    if (targetMembership.role === Role.OWNER) {
      const ownerCount = await this.prisma.membership.count({
        where: {
          organizationId,
          role: Role.OWNER,
          isActive: true,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last owner');
      }
    }

    await this.prisma.membership.update({
      where: { id: memberId },
      data: { isActive: false },
    });

    // Clear active org if it was this org
    await this.prisma.user.updateMany({
      where: {
        id: targetMembership.userId,
        activeOrgId: organizationId,
      },
      data: { activeOrgId: null },
    });

    // Log audit
    await this.auditService.log({
      action: 'REVOKE',
      module: 'membership',
      entityType: 'Membership',
      entityId: memberId,
      userId,
      organizationId,
      oldValues: { isActive: true },
      newValues: { isActive: false },
    });

    return { message: 'Membership revoked successfully' };
  }

  async leaveOrganization(
    organizationId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Cannot leave if last OWNER
    if (membership.role === Role.OWNER) {
      const ownerCount = await this.prisma.membership.count({
        where: {
          organizationId,
          role: Role.OWNER,
          isActive: true,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot leave organization as the last owner. Transfer ownership first.',
        );
      }
    }

    await this.prisma.membership.update({
      where: { id: membership.id },
      data: { isActive: false },
    });

    // Clear active org
    await this.prisma.user.update({
      where: { id: userId },
      data: { activeOrgId: null },
    });

    return { message: 'Successfully left organization' };
  }

  private async getMembershipWithCheck(
    organizationId: string,
    userId: string,
    requiredRoles?: Role[],
  ) {
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

    return membership;
  }

  private mapToResponse(membership: any): MemberResponseDto {
    return {
      id: membership.id,
      userId: membership.userId,
      organizationId: membership.organizationId,
      role: membership.role,
      isActive: membership.isActive,
      invitedAt: membership.invitedAt,
      joinedAt: membership.joinedAt,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        avatarUrl: membership.user.avatarUrl,
      },
    };
  }
}
