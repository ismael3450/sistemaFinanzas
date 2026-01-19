import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDate, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportQueryDto {
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
}

export class PeriodSummaryDto {
  @ApiProperty() totalIncome: string;
  @ApiProperty() totalExpense: string;
  @ApiProperty() netBalance: string;
  @ApiProperty() transactionCount: number;
  @ApiProperty() incomeCount: number;
  @ApiProperty() expenseCount: number;
  @ApiProperty() currency: string;
}

export class CategoryReportItemDto {
  @ApiProperty() categoryId: string;
  @ApiProperty() categoryName: string;
  @ApiProperty() totalAmount: string;
  @ApiProperty() transactionCount: number;
  @ApiProperty() percentage: number;
}

export class CategoryReportDto {
  @ApiProperty({ type: [CategoryReportItemDto] }) incomeByCategory: CategoryReportItemDto[];
  @ApiProperty({ type: [CategoryReportItemDto] }) expenseByCategory: CategoryReportItemDto[];
}

export class AccountReportItemDto {
  @ApiProperty() accountId: string;
  @ApiProperty() accountName: string;
  @ApiProperty() currentBalance: string;
  @ApiProperty() totalIncome: string;
  @ApiProperty() totalExpense: string;
  @ApiProperty() transactionCount: number;
}

export class TrendDataPointDto {
  @ApiProperty() date: string;
  @ApiProperty() income: string;
  @ApiProperty() expense: string;
  @ApiProperty() net: string;
}

export class TrendsReportDto {
  @ApiProperty({ type: [TrendDataPointDto] }) dailyTrends: TrendDataPointDto[];
  @ApiProperty({ type: [TrendDataPointDto] }) monthlyTrends: TrendDataPointDto[];
}
