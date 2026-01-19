import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
  OrganizationWithStatsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Organizations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    type: OrganizationResponseDto,
  })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser('id') userId: string,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of organizations',
    type: [OrganizationResponseDto],
  })
  async findAll(
    @CurrentUser('id') userId: string,
  ): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization details with stats',
    type: OrganizationWithStatsDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<OrganizationWithStatsDto> {
    return this.organizationsService.findOne(id, userId);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get organization by slug' })
  @ApiParam({ name: 'slug', description: 'Organization slug' })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    type: OrganizationResponseDto,
  })
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.findBySlug(slug, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser('id') userId: string,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.update(id, dto, userId);
  }

  @Post(':id/set-active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set organization as active for current user' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Active organization updated',
  })
  async setActive(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    return this.organizationsService.setActiveOrganization(id, userId);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization activated',
    type: OrganizationResponseDto,
  })
  async activate(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.toggleActive(id, userId, true);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization deactivated',
    type: OrganizationResponseDto,
  })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.toggleActive(id, userId, false);
  }
}
