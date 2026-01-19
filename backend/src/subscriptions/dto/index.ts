import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt, Min, IsBoolean, IsEnum } from 'class-validator';
import { SubscriptionStatus, PaymentStatus } from '@prisma/client';

// Plan DTOs
export class CreatePlanDto {
  @ApiProperty({ example: 'Professional' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Price in minor units', example: 2499 })
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiPropertyOptional({ enum: ['month', 'year'], default: 'month' })
  @IsString()
  @IsOptional()
  interval?: string = 'month';

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  intervalCount?: number = 1;

  @ApiPropertyOptional({ default: 5 })
  @IsInt()
  @IsOptional()
  maxUsers?: number = 5;

  @ApiPropertyOptional({ default: 10 })
  @IsInt()
  @IsOptional()
  maxAccounts?: number = 10;

  @ApiPropertyOptional({ default: 1000 })
  @IsInt()
  @IsOptional()
  maxTransactions?: number = 1000;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  hasExports?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  hasReports?: boolean = true;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  hasAuditLog?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  hasApiAccess?: boolean = false;

  @ApiPropertyOptional({ default: 14 })
  @IsInt()
  @Min(0)
  @IsOptional()
  trialDays?: number = 14;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {}

export class PlanResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() price: string;
  @ApiProperty() currency: string;
  @ApiProperty() interval: string;
  @ApiProperty() intervalCount: number;
  @ApiProperty() maxUsers: number;
  @ApiProperty() maxAccounts: number;
  @ApiProperty() maxTransactions: number;
  @ApiProperty() hasExports: boolean;
  @ApiProperty() hasReports: boolean;
  @ApiProperty() hasAuditLog: boolean;
  @ApiProperty() hasApiAccess: boolean;
  @ApiProperty() trialDays: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() isPublic: boolean;
  @ApiProperty() createdAt: Date;
}

// Subscription DTOs
export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Plan ID to subscribe to' })
  @IsString()
  @IsNotEmpty()
  planId: string;
}

export class SubscriptionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() planId: string;
  @ApiProperty({ type: PlanResponseDto }) plan: PlanResponseDto;
  @ApiProperty({ enum: SubscriptionStatus }) status: SubscriptionStatus;
  @ApiPropertyOptional() wompiSubscriptionId?: string;
  @ApiPropertyOptional() wompiCustomerId?: string;
  @ApiProperty() currentPeriodStart: Date;
  @ApiProperty() currentPeriodEnd: Date;
  @ApiPropertyOptional() trialEndsAt?: Date;
  @ApiPropertyOptional() cancelledAt?: Date;
  @ApiPropertyOptional() cancelReason?: string;
  @ApiProperty() createdAt: Date;
}

// Wompi DTOs
export class CreateWompiPaymentDto {
  @ApiProperty({ description: 'Payment token from Wompi widget' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({ description: 'Customer email for receipt' })
  @IsString()
  @IsOptional()
  email?: string;
}

export class WompiWebhookDto {
  @ApiProperty() event: string;
  @ApiProperty() data: {
    transaction: {
      id: string;
      status: string;
      reference: string;
      amount_in_cents: number;
      currency: string;
      payment_method_type: string;
      created_at: string;
    };
  };
  @ApiProperty() signature: {
    checksum: string;
    properties: string[];
  };
}

export class PaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() subscriptionId: string;
  @ApiProperty() amount: string;
  @ApiProperty() currency: string;
  @ApiProperty({ enum: PaymentStatus }) status: PaymentStatus;
  @ApiPropertyOptional() wompiTransactionId?: string;
  @ApiPropertyOptional() wompiPaymentMethod?: string;
  @ApiPropertyOptional() paidAt?: Date;
  @ApiPropertyOptional() failedAt?: Date;
  @ApiPropertyOptional() failureReason?: string;
  @ApiProperty() createdAt: Date;
}
