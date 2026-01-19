import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  AccountResponseDto,
  AccountBalanceDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../common/decorators';
import { PaginationDto, PaginatedResponseDto } from '../common/dto';
import { AccountsQueryDto} from "./dto/accounts-query.dto";

@ApiTags('Accounts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    type: AccountResponseDto,
  })
  async create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateAccountDto,
    @CurrentUser('id') userId: string,
  ): Promise<AccountResponseDto> {
    return this.accountsService.create(organizationId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all accounts' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive accounts',
  })
  @ApiResponse({
    status: 200,
    description: 'List of accounts',
    type: [AccountResponseDto],
  })
  async findAll(
      @Param('organizationId') organizationId: string,
      @CurrentUser('id') userId: string,
      @Query() query: AccountsQueryDto,
  ): Promise<PaginatedResponseDto<AccountResponseDto>> {
    return this.accountsService.findAll(
        organizationId,
        userId,
        query,
        query.includeInactive,
    );
  }

  @Get('balances')
  @ApiOperation({ summary: 'Get all account balances' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'List of account balances',
    type: [AccountBalanceDto],
  })
  async getAllBalances(
    @Param('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ): Promise<AccountBalanceDto[]> {
    return this.accountsService.getAllBalances(organizationId, userId);
  }

  @Get(':accountId')
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({
    status: 200,
    description: 'Account details',
    type: AccountResponseDto,
  })
  async findOne(
    @Param('organizationId') organizationId: string,
    @Param('accountId') accountId: string,
    @CurrentUser('id') userId: string,
  ): Promise<AccountResponseDto> {
    return this.accountsService.findOne(organizationId, accountId, userId);
  }

  @Get(':accountId/balance')
  @ApiOperation({ summary: 'Get account balance' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({
    status: 200,
    description: 'Account balance',
    type: AccountBalanceDto,
  })
  async getBalance(
    @Param('organizationId') organizationId: string,
    @Param('accountId') accountId: string,
    @CurrentUser('id') userId: string,
  ): Promise<AccountBalanceDto> {
    return this.accountsService.getBalance(organizationId, accountId, userId);
  }

  @Patch(':accountId')
  @ApiOperation({ summary: 'Update account' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({
    status: 200,
    description: 'Account updated',
    type: AccountResponseDto,
  })
  async update(
    @Param('organizationId') organizationId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser('id') userId: string,
  ): Promise<AccountResponseDto> {
    return this.accountsService.update(organizationId, accountId, dto, userId);
  }

  @Post(':accountId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate account' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({
    status: 200,
    description: 'Account activated',
    type: AccountResponseDto,
  })
  async activate(
    @Param('organizationId') organizationId: string,
    @Param('accountId') accountId: string,
    @CurrentUser('id') userId: string,
  ): Promise<AccountResponseDto> {
    return this.accountsService.toggleActive(
      organizationId,
      accountId,
      userId,
      true,
    );
  }

  @Post(':accountId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate account' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({
    status: 200,
    description: 'Account deactivated',
    type: AccountResponseDto,
  })
  async deactivate(
    @Param('organizationId') organizationId: string,
    @Param('accountId') accountId: string,
    @CurrentUser('id') userId: string,
  ): Promise<AccountResponseDto> {
    return this.accountsService.toggleActive(
      organizationId,
      accountId,
      userId,
      false,
    );
  }
}
