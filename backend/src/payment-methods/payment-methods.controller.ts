import {
  Controller, Get, Post, Body, Patch, Param, UseGuards, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto, PaymentMethodResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Payment Methods')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/payment-methods')
export class PaymentMethodsController {
  constructor(private readonly pmService: PaymentMethodsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment method' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, type: PaymentMethodResponseDto })
  async create(
    @Param('organizationId') orgId: string,
    @Body() dto: CreatePaymentMethodDto,
    @CurrentUser('id') userId: string,
  ): Promise<PaymentMethodResponseDto> {
    return this.pmService.create(orgId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all payment methods' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [PaymentMethodResponseDto] })
  async findAll(
    @Param('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ): Promise<PaymentMethodResponseDto[]> {
    return this.pmService.findAll(orgId, userId, includeInactive);
  }

  @Get(':pmId')
  @ApiOperation({ summary: 'Get payment method by ID' })
  @ApiResponse({ status: 200, type: PaymentMethodResponseDto })
  async findOne(
    @Param('organizationId') orgId: string,
    @Param('pmId') pmId: string,
    @CurrentUser('id') userId: string,
  ): Promise<PaymentMethodResponseDto> {
    return this.pmService.findOne(orgId, pmId, userId);
  }

  @Patch(':pmId')
  @ApiOperation({ summary: 'Update payment method' })
  @ApiResponse({ status: 200, type: PaymentMethodResponseDto })
  async update(
    @Param('organizationId') orgId: string,
    @Param('pmId') pmId: string,
    @Body() dto: UpdatePaymentMethodDto,
    @CurrentUser('id') userId: string,
  ): Promise<PaymentMethodResponseDto> {
    return this.pmService.update(orgId, pmId, dto, userId);
  }

  @Post(':pmId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate payment method' })
  async activate(
    @Param('organizationId') orgId: string,
    @Param('pmId') pmId: string,
    @CurrentUser('id') userId: string,
  ): Promise<PaymentMethodResponseDto> {
    return this.pmService.toggleActive(orgId, pmId, userId, true);
  }

  @Post(':pmId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate payment method' })
  async deactivate(
    @Param('organizationId') orgId: string,
    @Param('pmId') pmId: string,
    @CurrentUser('id') userId: string,
  ): Promise<PaymentMethodResponseDto> {
    return this.pmService.toggleActive(orgId, pmId, userId, false);
  }
}
