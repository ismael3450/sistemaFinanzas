import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Matches,
} from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Account name',
    example: 'Caja Chica',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Account description',
    example: 'Cuenta para gastos menores',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Account type',
    example: 'cash',
    enum: ['cash', 'bank', 'digital', 'savings', 'investment', 'other'],
  })
  @IsString()
  @IsNotEmpty()
  accountType: string;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
    default: 'USD',
  })
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be a valid ISO 4217 code' })
  @IsOptional()
  currency?: string = 'USD';

  @ApiPropertyOptional({
    description: 'Initial balance in minor units (cents)',
    example: 100000,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  initialBalance?: number = 0;

  @ApiPropertyOptional({
    description: 'Account color (hex)',
    example: '#10B981',
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({
    description: 'Account icon',
    example: 'wallet',
  })
  @IsString()
  @IsOptional()
  icon?: string;
}
