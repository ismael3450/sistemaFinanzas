import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import {
  ReportQueryDto, PeriodSummaryDto, CategoryReportDto, AccountReportItemDto, TrendsReportDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get period summary report' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, type: PeriodSummaryDto })
  async getPeriodSummary(
    @Param('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ReportQueryDto,
  ): Promise<PeriodSummaryDto> {
    return this.reportsService.getPeriodSummary(orgId, userId, query);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Get report by category' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, type: CategoryReportDto })
  async getCategoryReport(
    @Param('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ReportQueryDto,
  ): Promise<CategoryReportDto> {
    return this.reportsService.getCategoryReport(orgId, userId, query);
  }

  @Get('by-account')
  @ApiOperation({ summary: 'Get report by account' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, type: [AccountReportItemDto] })
  async getAccountReport(
    @Param('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ReportQueryDto,
  ): Promise<AccountReportItemDto[]> {
    return this.reportsService.getAccountReport(orgId, userId, query);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get trends report' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, type: TrendsReportDto })
  async getTrendsReport(
    @Param('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ReportQueryDto,
  ): Promise<TrendsReportDto> {
    return this.reportsService.getTrendsReport(orgId, userId, query);
  }
}
