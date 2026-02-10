import {
  Controller, Get, Post, Body, Patch, Delete, Param, UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionDto, UpdateTransactionDto, VoidTransactionDto,
  TransactionFilterDto, TransactionResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../common/decorators';
import { PaginatedResponseDto } from '../common/dto';

@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, type: TransactionResponseDto })
  async create(
    @Param('organizationId') orgId: string,
    @Body() dto: CreateTransactionDto,
    @CurrentUser('id') userId: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.create(orgId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions with filters' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, type: [TransactionResponseDto] })
  async findAll(
    @Param('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Query() filters: TransactionFilterDto,
  ): Promise<PaginatedResponseDto<TransactionResponseDto>> {
    return this.transactionsService.findAll(orgId, userId, filters);
  }

  @Get(':transactionId')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  async findOne(
    @Param('organizationId') orgId: string,
    @Param('transactionId') txnId: string,
    @CurrentUser('id') userId: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.findOne(orgId, txnId, userId);
  }

  @Patch(':transactionId')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  async update(
    @Param('organizationId') orgId: string,
    @Param('transactionId') txnId: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser('id') userId: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.update(orgId, txnId, dto, userId);
  }

  @Delete(':transactionId')
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  async remove(
      @Param('organizationId') orgId: string,
      @Param('transactionId') txnId: string,
      @CurrentUser('id') userId: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.remove(orgId, txnId, userId);
  }

  @Post(':transactionId/void')
  @ApiOperation({ summary: 'Void (cancel) a transaction' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  async voidTransaction(
    @Param('organizationId') orgId: string,
    @Param('transactionId') txnId: string,
    @Body() dto: VoidTransactionDto,
    @CurrentUser('id') userId: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.voidTransaction(orgId, txnId, dto, userId);
  }
}
