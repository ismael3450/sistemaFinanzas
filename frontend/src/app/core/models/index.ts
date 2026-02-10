// ==========================================
// AUTH
// ==========================================
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  activeOrgId?: string;
  organizations?: UserOrganization[];
  createdAt: Date;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

// ==========================================
// ORGANIZATION
// ==========================================
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  currency: string;
  timezone: string;
  fiscalYearStart: number;
  isActive: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationWithStats extends Organization {
  memberCount: number;
  accountCount: number;
  totalBalance: string;
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  logoUrl?: string;
  currency?: string;
  timezone?: string;
  fiscalYearStart?: number;
}

// ==========================================
// MEMBERSHIP
// ==========================================
export type Role = 'OWNER' | 'ADMIN' | 'TREASURER' | 'MEMBER' | 'VIEWER';

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  role: Role;
}

export interface Member {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  isActive: boolean;
  invitedAt: Date;
  joinedAt?: Date;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

export interface InviteMemberRequest {
  email: string;
  password?: string;
  role?: Role;
}

// ==========================================
// ACCOUNT
// ==========================================
export interface Account {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  accountType: string;
  currency: string;
  initialBalance: string;
  currentBalance: string;
  isActive: boolean;
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountBalance {
  id: string;
  name: string;
  currentBalance: string;
  currency: string;
  formattedBalance: string;
}

export interface CreateAccountRequest {
  name: string;
  description?: string;
  accountType: string;
  currency?: string;
  initialBalance?: number;
  color?: string;
  icon?: string;
}

// ==========================================
// CATEGORY
// ==========================================
export type CategoryType = 'INCOME' | 'EXPENSE' | 'BOTH';

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: CategoryType;
  parentId?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children?: Category[];
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  type?: CategoryType;
  parentId?: string;
  color?: string;
  icon?: string;
}

// ==========================================
// PAYMENT METHOD
// ==========================================
export interface PaymentMethod {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentMethodRequest {
  name: string;
  description?: string;
}

// ==========================================
// TRANSACTION
// ==========================================
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'VOIDED';

export interface Transaction {
  id: string;
  organizationId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  currency: string;
  description?: string;
  reference?: string;
  categoryId?: string;
  categoryName?: string;
  fromAccountId?: string;
  fromAccountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  paymentMethodId?: string;
  paymentMethodName?: string;
  createdById: string;
  createdByName: string;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
  voidedAt?: Date;
  voidReason?: string;
  attachments?: TransactionAttachment[];
}

export interface TransactionAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: Date;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  amount: number;
  currency?: string;
  description?: string;
  reference?: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  paymentMethodId?: string;
  transactionDate: Date;
}

export interface UpdateTransactionRequest {
  type?: TransactionType;
  amount?: number;
  currency?: string;
  description?: string | null;
  reference?: string | null;
  categoryId?: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  paymentMethodId?: string | null;
  transactionDate?: Date;
}

export interface TransactionFilter {
  type?: TransactionType;
  status?: TransactionStatus;
  categoryId?: string;
  accountId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ==========================================
// REPORTS
// ==========================================
export interface PeriodSummary {
  totalIncome: string;
  totalExpense: string;
  netBalance: string;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  currency: string;
}

export interface CategoryReportItem {
  categoryId: string;
  categoryName: string;
  totalAmount: string;
  transactionCount: number;
  percentage: number;
}

export interface CategoryReport {
  incomeByCategory: CategoryReportItem[];
  expenseByCategory: CategoryReportItem[];
}

export interface AccountReportItem {
  accountId: string;
  accountName: string;
  currentBalance: string;
  totalIncome: string;
  totalExpense: string;
  transactionCount: number;
}

export interface TrendDataPoint {
  date: string;
  income: string;
  expense: string;
  net: string;
}

export interface TrendsReport {
  dailyTrends: TrendDataPoint[];
  monthlyTrends: TrendDataPoint[];
}

export interface ReportQuery {
  startDate?: Date;
  endDate?: Date;
}

// ==========================================
// AUDIT
// ==========================================
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VOID' | 'EXPORT' | 'INVITE' | 'REVOKE';

export interface AuditLog {
  id: string;
  organizationId?: string;
  userId?: string;
  userName?: string;
  action: AuditAction;
  module: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AuditFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  module?: string;
  action?: AuditAction;
  page?: number;
  limit?: number;
}

// ==========================================
// SUBSCRIPTION
// ==========================================
export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: string;
  currency: string;
  interval: string;
  intervalCount: number;
  maxUsers: number;
  maxAccounts: number;
  maxTransactions: number;
  hasExports: boolean;
  hasReports: boolean;
  hasAuditLog: boolean;
  hasApiAccess: boolean;
  trialDays: number;
  isActive: boolean;
  isPublic: boolean;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  wompiSubscriptionId?: string;
  wompiCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
}

export interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  wompiTransactionId?: string;
  wompiPaymentMethod?: string;
  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  createdAt: Date;
}

// ==========================================
// COMMON
// ==========================================
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
