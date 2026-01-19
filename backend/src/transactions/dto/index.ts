import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsNotEmpty, IsOptional, IsString, IsEnum, IsUUID, IsInt, Min, IsDate, IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Transaction type', enum: TransactionType })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiProperty({ description: 'Amount in minor units (cents)', example: 10000 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiPropertyOptional({ description: 'Transaction description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'External reference number' })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Source account ID (for EXPENSE or TRANSFER)' })
  @IsUUID()
  @IsOptional()
  fromAccountId?: string;

  @ApiPropertyOptional({ description: 'Destination account ID (for INCOME or TRANSFER)' })
  @IsUUID()
  @IsOptional()
  toAccountId?: string;

  @ApiPropertyOptional({ description: 'Payment method ID' })
  @IsUUID()
  @IsOptional()
  paymentMethodId?: string;

  @ApiProperty({ description: 'Transaction date', type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  transactionDate: Date;
}

export class UpdateTransactionDto extends PartialType(
  OmitType(CreateTransactionDto, ['type'] as const),
) {}

export class VoidTransactionDto {
  @ApiProperty({ description: 'Reason for voiding the transaction' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class TransactionFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TransactionType })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  accountId?: string;

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
  search?: string;
}

export class AttachmentDto {
  @ApiProperty() id: string;
  @ApiProperty() fileName: string;
  @ApiProperty() fileUrl: string;
  @ApiProperty() fileType: string;
  @ApiProperty() fileSize: number;
  @ApiProperty() createdAt: Date;
}

export class TransactionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty({ enum: TransactionType }) type: TransactionType;
  @ApiProperty({ enum: TransactionStatus }) status: TransactionStatus;
  @ApiProperty() amount: string;
  @ApiProperty() currency: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() reference?: string;
  @ApiPropertyOptional() categoryId?: string;
  @ApiPropertyOptional() categoryName?: string;
  @ApiPropertyOptional() fromAccountId?: string;
  @ApiPropertyOptional() fromAccountName?: string;
  @ApiPropertyOptional() toAccountId?: string;
  @ApiPropertyOptional() toAccountName?: string;
  @ApiPropertyOptional() paymentMethodId?: string;
  @ApiPropertyOptional() paymentMethodName?: string;
  @ApiProperty() createdById: string;
  @ApiProperty() createdByName: string;
  @ApiProperty() transactionDate: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional() voidedAt?: Date;
  @ApiPropertyOptional() voidReason?: string;
  @ApiPropertyOptional({ type: [AttachmentDto] }) attachments?: AttachmentDto[];
}
