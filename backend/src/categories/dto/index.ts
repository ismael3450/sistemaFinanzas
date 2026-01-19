import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Donaciones' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Category type restriction',
    enum: CategoryType,
    default: CategoryType.BOTH,
  })
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType = CategoryType.BOTH;

  @ApiPropertyOptional({ description: 'Parent category ID for subcategories' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Category color (hex)', example: '#10B981' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Category icon', example: 'heart' })
  @IsString()
  @IsOptional()
  icon?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class CategoryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty({ enum: CategoryType }) type: CategoryType;
  @ApiPropertyOptional() parentId?: string;
  @ApiPropertyOptional() color?: string;
  @ApiPropertyOptional() icon?: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ type: () => [CategoryResponseDto] }) children?: CategoryResponseDto[];
}
