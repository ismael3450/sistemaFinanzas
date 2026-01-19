import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, ValidateIf } from 'class-validator';

export class DateRangeDto {
  @ApiPropertyOptional({
    description: 'Start date for filtering',
    type: String,
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for filtering',
    type: String,
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  @ValidateIf((o) => o.startDate !== undefined)
  endDate?: Date;
}
