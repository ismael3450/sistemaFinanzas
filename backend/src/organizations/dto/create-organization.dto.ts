import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Mi Iglesia',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Organization description',
    example: 'Iglesia Cristiana Evangélica',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Organization logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;

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
    description: 'Timezone',
    example: 'America/El_Salvador',
    default: 'America/El_Salvador',
  })
  @IsString()
  @IsOptional()
  timezone?: string = 'America/El_Salvador';

  @ApiPropertyOptional({
    description: 'Fiscal year start month (1-12)',
    example: 1,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  fiscalYearStart?: number = 1;
}
