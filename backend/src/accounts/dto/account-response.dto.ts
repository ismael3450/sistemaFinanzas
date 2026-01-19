import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountResponseDto {
  @ApiProperty({ description: 'Account ID' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Account name' })
  name: string;

  @ApiPropertyOptional({ description: 'Account description' })
  description?: string;

  @ApiProperty({ description: 'Account type' })
  accountType: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Initial balance in minor units' })
  initialBalance: string;

  @ApiProperty({ description: 'Current balance in minor units' })
  currentBalance: string;

  @ApiProperty({ description: 'Is account active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Account color' })
  color?: string;

  @ApiPropertyOptional({ description: 'Account icon' })
  icon?: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class AccountBalanceDto {
  @ApiProperty({ description: 'Account ID' })
  id: string;

  @ApiProperty({ description: 'Account name' })
  name: string;

  @ApiProperty({ description: 'Current balance in minor units' })
  currentBalance: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Formatted balance' })
  formattedBalance: string;
}
