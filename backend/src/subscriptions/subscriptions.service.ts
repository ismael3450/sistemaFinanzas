import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WompiService } from './wompi.service';
import {
  CreatePlanDto,
  UpdatePlanDto,
  PlanResponseDto,
  CreateSubscriptionDto,
  SubscriptionResponseDto,
  CreateWompiPaymentDto,
  WompiWebhookDto,
  PaymentResponseDto,
} from './dto';
import { Role, SubscriptionStatus, PaymentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private wompiService: WompiService,
  ) {}

  // =====================
  // PLANS
  // =====================

  async createPlan(dto: CreatePlanDto, userId: string): Promise<PlanResponseDto> {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Plan with this name already exists');

    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: BigInt(dto.price),
        currency: dto.currency || 'USD',
        interval: dto.interval || 'month',
        intervalCount: dto.intervalCount || 1,
        maxUsers: dto.maxUsers || 5,
        maxAccounts: dto.maxAccounts || 10,
        maxTransactions: dto.maxTransactions || 1000,
        hasExports: dto.hasExports ?? true,
        hasReports: dto.hasReports ?? true,
        hasAuditLog: dto.hasAuditLog ?? false,
        hasApiAccess: dto.hasApiAccess ?? false,
        trialDays: dto.trialDays || 14,
      },
    });

    await this.auditService.log({
      action: 'CREATE',
      module: 'subscriptions',
      entityType: 'SubscriptionPlan',
      entityId: plan.id,
      userId,
      newValues: { name: dto.name, price: dto.price },
    });

    return this.mapPlanToResponse(plan);
  }

  async findAllPlans(includeInactive = false): Promise<PlanResponseDto[]> {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: {
        isPublic: true,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map(this.mapPlanToResponse);
  }

  async findPlanById(planId: string): Promise<PlanResponseDto> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.mapPlanToResponse(plan);
  }

  async updatePlan(planId: string, dto: UpdatePlanDto, userId: string): Promise<PlanResponseDto> {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        ...dto,
        price: dto.price !== undefined ? BigInt(dto.price) : undefined,
      },
    });

    await this.auditService.log({
      action: 'UPDATE',
      module: 'subscriptions',
      entityType: 'SubscriptionPlan',
      entityId: planId,
      userId,
      oldValues: { name: plan.name },
      newValues: dto,
    });

    return this.mapPlanToResponse(updated);
  }

  // =====================
  // SUBSCRIPTIONS
  // =====================

  async getOrganizationSubscription(
    organizationId: string,
    userId: string,
  ): Promise<SubscriptionResponseDto | null> {
    await this.checkPermission(organizationId, userId);

    const subscription = await this.prisma.organizationSubscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (!subscription) return null;
    return this.mapSubscriptionToResponse(subscription);
  }

  async createSubscription(
    organizationId: string,
    dto: CreateSubscriptionDto,
    userId: string,
  ): Promise<SubscriptionResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN]);

    // Check if subscription already exists
    const existing = await this.prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });
    if (existing) {
      throw new ConflictException('Organization already has a subscription');
    }

    // Get plan
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found or inactive');
    }

    const now = new Date();
    const trialEnd = plan.trialDays > 0
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null;

    // Calculate period end based on interval
    const periodEnd = new Date(now);
    if (plan.interval === 'month') {
      periodEnd.setMonth(periodEnd.getMonth() + plan.intervalCount);
    } else if (plan.interval === 'year') {
      periodEnd.setFullYear(periodEnd.getFullYear() + plan.intervalCount);
    }

    const subscription = await this.prisma.organizationSubscription.create({
      data: {
        organizationId,
        planId: dto.planId,
        status: trialEnd ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: trialEnd,
      },
      include: { plan: true },
    });

    await this.auditService.log({
      action: 'CREATE',
      module: 'subscriptions',
      entityType: 'OrganizationSubscription',
      entityId: subscription.id,
      userId,
      organizationId,
      newValues: { planId: dto.planId, status: subscription.status },
    });

    return this.mapSubscriptionToResponse(subscription);
  }

  async changePlan(
    organizationId: string,
    newPlanId: string,
    userId: string,
  ): Promise<SubscriptionResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN]);

    const subscription = await this.prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });
    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    const newPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: newPlanId },
    });
    if (!newPlan || !newPlan.isActive) {
      throw new NotFoundException('Plan not found or inactive');
    }

    const updated = await this.prisma.organizationSubscription.update({
      where: { organizationId },
      data: { planId: newPlanId },
      include: { plan: true },
    });

    await this.auditService.log({
      action: 'UPDATE',
      module: 'subscriptions',
      entityType: 'OrganizationSubscription',
      entityId: subscription.id,
      userId,
      organizationId,
      oldValues: { planId: subscription.planId },
      newValues: { planId: newPlanId },
    });

    return this.mapSubscriptionToResponse(updated);
  }

  async cancelSubscription(
    organizationId: string,
    userId: string,
    reason?: string,
  ): Promise<SubscriptionResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER]);

    const subscription = await this.prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });
    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    const updated = await this.prisma.organizationSubscription.update({
      where: { organizationId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: { plan: true },
    });

    await this.auditService.log({
      action: 'UPDATE',
      module: 'subscriptions',
      entityType: 'OrganizationSubscription',
      entityId: subscription.id,
      userId,
      organizationId,
      oldValues: { status: subscription.status },
      newValues: { status: SubscriptionStatus.CANCELLED, cancelReason: reason },
    });

    return this.mapSubscriptionToResponse(updated);
  }

  // =====================
  // PAYMENTS (WOMPI)
  // =====================

  async createPayment(
    organizationId: string,
    dto: CreateWompiPaymentDto,
    userId: string,
  ): Promise<PaymentResponseDto> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN]);

    const subscription = await this.prisma.organizationSubscription.findUnique({
      where: { organizationId },
      include: { plan: true, organization: true },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    const reference = `SUB-${subscription.id}-${uuidv4().substring(0, 8)}`;
    const amountInCents = Number(subscription.plan.price);
    const currency = subscription.plan.currency;

    // Get user email
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const email = dto.email || user?.email || '';

    // Create payment record
    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        amount: subscription.plan.price,
        currency,
        status: PaymentStatus.PENDING,
      },
    });

    try {
      // Process payment with Wompi
      const wompiResponse = await this.wompiService.createTransaction(
        amountInCents,
        currency,
        email,
        reference,
        dto.token,
      );

      // Update payment with Wompi response
      const updatedPayment = await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          wompiTransactionId: wompiResponse.data.id,
          wompiPaymentMethod: wompiResponse.data.payment_method_type,
          wompiResponse: wompiResponse.data as any,
          status: this.mapWompiStatus(wompiResponse.data.status),
          paidAt: wompiResponse.data.status === 'APPROVED' ? new Date() : null,
        },
      });

      // If payment approved, update subscription
      if (wompiResponse.data.status === 'APPROVED') {
        const now = new Date();
        const periodEnd = new Date(now);
        if (subscription.plan.interval === 'month') {
          periodEnd.setMonth(periodEnd.getMonth() + subscription.plan.intervalCount);
        } else {
          periodEnd.setFullYear(periodEnd.getFullYear() + subscription.plan.intervalCount);
        }

        await this.prisma.organizationSubscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            trialEndsAt: null,
          },
        });
      }

      await this.auditService.log({
        action: 'CREATE',
        module: 'subscriptions',
        entityType: 'SubscriptionPayment',
        entityId: payment.id,
        userId,
        organizationId,
        newValues: {
          amount: amountInCents,
          status: updatedPayment.status,
          wompiTransactionId: wompiResponse.data.id,
        },
      });

      return this.mapPaymentToResponse(updatedPayment);
    } catch (error) {
      // Update payment as failed
      const failedPayment = await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.ERROR,
          failedAt: new Date(),
          failureReason: error.message,
        },
      });

      return this.mapPaymentToResponse(failedPayment);
    }
  }

  async handleWompiWebhook(dto: WompiWebhookDto): Promise<void> {
    // Verify signature
    const isValid = this.wompiService.verifyWebhookSignature(
      dto.data,
      dto.signature.checksum,
      dto.signature.properties,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { transaction } = dto.data;

    // Find payment by Wompi transaction ID
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { wompiTransactionId: transaction.id },
      include: { subscription: { include: { plan: true } } },
    });

    if (!payment) {
      // Payment not found, might be a different transaction
      return;
    }

    // Update payment status
    const newStatus = this.mapWompiStatus(transaction.status);
    await this.prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        paidAt: newStatus === PaymentStatus.APPROVED ? new Date() : null,
        failedAt: newStatus === PaymentStatus.DECLINED ? new Date() : null,
      },
    });

    // Update subscription if payment approved
    if (newStatus === PaymentStatus.APPROVED) {
      const now = new Date();
      const periodEnd = new Date(now);
      const plan = payment.subscription.plan;

      if (plan.interval === 'month') {
        periodEnd.setMonth(periodEnd.getMonth() + plan.intervalCount);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + plan.intervalCount);
      }

      await this.prisma.organizationSubscription.update({
        where: { id: payment.subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
    }
  }

  async getPaymentHistory(
    organizationId: string,
    userId: string,
  ): Promise<PaymentResponseDto[]> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN]);

    const subscription = await this.prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      return [];
    }

    const payments = await this.prisma.subscriptionPayment.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map(this.mapPaymentToResponse);
  }

  getWompiPublicKey(): string {
    return this.wompiService.getPublicKey();
  }

  // =====================
  // HELPERS
  // =====================

  private mapWompiStatus(wompiStatus: string): PaymentStatus {
    switch (wompiStatus) {
      case 'APPROVED':
        return PaymentStatus.APPROVED;
      case 'DECLINED':
        return PaymentStatus.DECLINED;
      case 'VOIDED':
        return PaymentStatus.VOIDED;
      case 'ERROR':
        return PaymentStatus.ERROR;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private async checkPermission(orgId: string, userId: string, roles?: Role[]) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!membership?.isActive) throw new ForbiddenException('Not a member');
    if (roles && !roles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private mapPlanToResponse(plan: any): PlanResponseDto {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      currency: plan.currency,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
      maxUsers: plan.maxUsers,
      maxAccounts: plan.maxAccounts,
      maxTransactions: plan.maxTransactions,
      hasExports: plan.hasExports,
      hasReports: plan.hasReports,
      hasAuditLog: plan.hasAuditLog,
      hasApiAccess: plan.hasApiAccess,
      trialDays: plan.trialDays,
      isActive: plan.isActive,
      isPublic: plan.isPublic,
      createdAt: plan.createdAt,
    };
  }

  private mapSubscriptionToResponse(sub: any): SubscriptionResponseDto {
    return {
      id: sub.id,
      organizationId: sub.organizationId,
      planId: sub.planId,
      plan: this.mapPlanToResponse(sub.plan),
      status: sub.status,
      wompiSubscriptionId: sub.wompiSubscriptionId,
      wompiCustomerId: sub.wompiCustomerId,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
      cancelledAt: sub.cancelledAt,
      cancelReason: sub.cancelReason,
      createdAt: sub.createdAt,
    };
  }

  private mapPaymentToResponse(payment: any): PaymentResponseDto {
    return {
      id: payment.id,
      subscriptionId: payment.subscriptionId,
      amount: payment.amount.toString(),
      currency: payment.currency,
      status: payment.status,
      wompiTransactionId: payment.wompiTransactionId,
      wompiPaymentMethod: payment.wompiPaymentMethod,
      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      failureReason: payment.failureReason,
      createdAt: payment.createdAt,
    };
  }
}
