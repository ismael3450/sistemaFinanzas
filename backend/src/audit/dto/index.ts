import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDate, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction } from '@prisma/client';
import { PaginationDto } from '../../common/dto';

export class AuditFilterDto extends PaginationDto {
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  module?: string;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;
}

export class AuditLogResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() userId?: string;
  @ApiPropertyOptional() userName?: string;
  @ApiProperty({ enum: AuditAction }) action: AuditAction;
  @ApiProperty() module: string;
  @ApiPropertyOptional() entityType?: string;
  @ApiPropertyOptional() entityId?: string;
  @ApiPropertyOptional() oldValues?: any;
  @ApiPropertyOptional() newValues?: any;
  @ApiPropertyOptional() metadata?: any;
  @ApiPropertyOptional() ipAddress?: string;
  @ApiPropertyOptional() userAgent?: string;
  @ApiProperty() createdAt: Date;
}

export interface CreateAuditLogDto {
  action: AuditAction;
  module: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  organizationId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}
