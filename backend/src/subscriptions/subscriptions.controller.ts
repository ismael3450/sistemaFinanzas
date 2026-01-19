import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import {
  CreatePlanDto, UpdatePlanDto, PlanResponseDto,
  CreateSubscriptionDto, SubscriptionResponseDto,
  CreateWompiPaymentDto, WompiWebhookDto, PaymentResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, Public } from '../common/decorators';

@ApiTags('Subscriptions')
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // =====================
  // PLANS (Public)
  // =====================

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({ status: 200, type: [PlanResponseDto] })
  async getPlans(): Promise<PlanResponseDto[]> {
    return this.subscriptionsService.findAllPlans();
  }

  @Public()
  @Get('plans/:planId')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  async getPlan(@Param('planId') planId: string): Promise<PlanResponseDto> {
    return this.subscriptionsService.findPlanById(planId);
  }

  // =====================
  // PLAN MANAGEMENT (Admin only - simplified for now)
  // =====================

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('admin/plans')
  @ApiOperation({ summary: 'Create a new subscription plan (Admin)' })
  @ApiResponse({ status: 201, type: PlanResponseDto })
  async createPlan(
    @Body() dto: CreatePlanDto,
    @CurrentUser('id') userId: string,
  ): Promise<PlanResponseDto> {
    return this.subscriptionsService.createPlan(dto, userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Patch('admin/plans/:planId')
  @ApiOperation({ summary: 'Update a subscription plan (Admin)' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  async updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser('id') userId: string,
  ): Promise<PlanResponseDto> {
    return this.subscriptionsService.updatePlan(planId, dto, userId);
  }

  // =====================
  // ORGANIZATION SUBSCRIPTIONS
  // =====================

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('organizations/:organizationId/subscription')
  @ApiOperation({ summary: 'Get organization subscription' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async getSubscription(
    @Param('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ): Promise<SubscriptionResponseDto | null> {
    return this.subscriptionsService.getOrganizationSubscription(orgId, userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('organizations/:organizationId/subscription')
  @ApiOperation({ summary: 'Create subscription for organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, type: SubscriptionResponseDto })
  async createSubscription(
    @Param('organizationId') orgId: string,
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser('id') userId: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.createSubscription(orgId, dto, userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Patch('organizations/:organizationId/subscription/change-plan')
  @ApiOperation({ summary: 'Change subscription plan' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async changePlan(
    @Param('organizationId') orgId: string,
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser('id') userId: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.changePlan(orgId, dto.planId, userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Delete('organizations/:organizationId/subscription')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async cancelSubscription(
    @Param('organizationId') orgId: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.cancelSubscription(orgId, userId, reason);
  }

  // =====================
  // PAYMENTS (WOMPI)
  // =====================

  @Public()
  @Get('wompi/public-key')
  @ApiOperation({ summary: 'Get Wompi public key for frontend' })
  @ApiResponse({ status: 200 })
  getWompiPublicKey(): { publicKey: string } {
    return { publicKey: this.subscriptionsService.getWompiPublicKey() };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('organizations/:organizationId/subscription/pay')
  @ApiOperation({ summary: 'Process subscription payment with Wompi' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  async createPayment(
    @Param('organizationId') orgId: string,
    @Body() dto: CreateWompiPaymentDto,
    @CurrentUser('id') userId: string,
  ): Promise<PaymentResponseDto> {
    return this.subscriptionsService.createPayment(orgId, dto, userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('organizations/:organizationId/subscription/payments')
  @ApiOperation({ summary: 'Get payment history' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async getPaymentHistory(
    @Param('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ): Promise<PaymentResponseDto[]> {
    return this.subscriptionsService.getPaymentHistory(orgId, userId);
  }

  @Public()
  @Post('webhooks/wompi')
  @ApiOperation({ summary: 'Wompi webhook endpoint' })
  @ApiResponse({ status: 200 })
  async handleWompiWebhook(@Body() dto: WompiWebhookDto): Promise<{ received: boolean }> {
    await this.subscriptionsService.handleWompiWebhook(dto);
    return { received: true };
  }
}
