import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationResponseDto {
  @ApiProperty({ description: 'Organization ID' })
  id: string;

  @ApiProperty({ description: 'Organization name' })
  name: string;

  @ApiProperty({ description: 'Organization slug (URL-friendly name)' })
  slug: string;

  @ApiPropertyOptional({ description: 'Organization description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Organization logo URL' })
  logoUrl?: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Timezone' })
  timezone: string;

  @ApiProperty({ description: 'Fiscal year start month' })
  fiscalYearStart: number;

  @ApiProperty({ description: 'Is organization active' })
  isActive: boolean;

  @ApiProperty({ description: 'Created by user ID' })
  createdById: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class OrganizationWithStatsDto extends OrganizationResponseDto {
  @ApiProperty({ description: 'Number of members' })
  memberCount: number;

  @ApiProperty({ description: 'Number of accounts' })
  accountCount: number;

  @ApiProperty({ description: 'Total balance across all accounts (in minor units)' })
  totalBalance: string;
}
