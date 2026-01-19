import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditFilterDto, AuditLogResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../common/decorators';
import { PaginatedResponseDto } from '../common/dto';

@ApiTags('Audit')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, type: [AuditLogResponseDto] })
  async findAll(
    @Param('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Query() filters: AuditFilterDto,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    return this.auditService.findAll(orgId, userId, filters);
  }

  @Get('modules')
  @ApiOperation({ summary: 'Get available modules for filtering' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, type: [String] })
  async getModules(
    @Param('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ): Promise<string[]> {
    return this.auditService.getModules(orgId, userId);
  }
}
