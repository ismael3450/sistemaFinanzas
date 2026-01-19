import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get organization ID from various sources
    const organizationId =
      request.headers['x-organization-id'] ||
      request.params.organizationId ||
      request.query.organizationId ||
      user.activeOrgId;

    if (!organizationId) {
      throw new BadRequestException(
        'Organization ID is required. Set active organization or provide x-organization-id header.',
      );
    }

    // Verify membership
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

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    if (!membership.isActive) {
      throw new ForbiddenException('Membership is inactive');
    }

    if (!membership.organization.isActive) {
      throw new ForbiddenException('Organization is inactive');
    }

    // Attach to request
    request.organization = membership.organization;
    request.membership = membership;
    request.organizationId = organizationId;

    return true;
  }
}
