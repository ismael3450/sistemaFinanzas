import { Controller, Get, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ExportsService } from './exports.service';
import { ExportQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Exports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('transactions')
  @ApiOperation({ summary: 'Export transactions (CSV, XLSX, or PDF)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'File download' })
  async exportTransactions(
    @Param('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ExportQueryDto,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const { buffer, filename, contentType } = await this.exportsService.exportTransactions(
      orgId,
      userId,
      query,
    );

    res.header('Content-Type', contentType);
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
