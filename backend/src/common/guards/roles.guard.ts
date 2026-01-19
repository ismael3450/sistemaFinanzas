import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const organizationId =
      request.params.organizationId ||
      request.body?.organizationId ||
      user.activeOrgId;

    if (!organizationId) {
      throw new ForbiddenException('No organization context');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('Not a member of this organization');
    }

    // Role hierarchy: OWNER > ADMIN > TREASURER > MEMBER > VIEWER
    const roleHierarchy: Record<Role, number> = {
      OWNER: 5,
      ADMIN: 4,
      TREASURER: 3,
      MEMBER: 2,
      VIEWER: 1,
    };

    const userRoleLevel = roleHierarchy[membership.role];
    const hasRequiredRole = requiredRoles.some(
      (role) => userRoleLevel >= roleHierarchy[role],
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Attach organization to request for later use
    request.organization = membership.organization;
    request.membership = membership;

    return true;
  }
}
