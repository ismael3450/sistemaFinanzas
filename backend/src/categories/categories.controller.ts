import {
  Controller, Get, Post, Body, Patch, Param, UseGuards, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Categories')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  async create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateCategoryDto,
    @CurrentUser('id') userId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.create(organizationId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all categories (hierarchical)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async findAll(
    @Param('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAll(organizationId, userId, includeInactive);
  }

  @Get(':categoryId')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async findOne(
    @Param('organizationId') organizationId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser('id') userId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(organizationId, categoryId, userId);
  }

  @Patch(':categoryId')
  @ApiOperation({ summary: 'Update category' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async update(
    @Param('organizationId') organizationId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser('id') userId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(organizationId, categoryId, dto, userId);
  }

  @Post(':categoryId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate category' })
  async activate(
    @Param('organizationId') orgId: string,
    @Param('categoryId') catId: string,
    @CurrentUser('id') userId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.toggleActive(orgId, catId, userId, true);
  }

  @Post(':categoryId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate category' })
  async deactivate(
    @Param('organizationId') orgId: string,
    @Param('categoryId') catId: string,
    @CurrentUser('id') userId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.toggleActive(orgId, catId, userId, false);
  }
}
