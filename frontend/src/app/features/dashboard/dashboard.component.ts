import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ReportService,
  TransactionService,
  AccountService,
  OrganizationService
} from '../../core/services';
import { StatCardComponent, LoadingComponent } from '../../shared/components';
import { MoneyPipe, DateAgoPipe } from '../../shared/pipes';
import { Transaction, PeriodSummary, TrendsReport } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    SkeletonModule,
    NgApexchartsModule,
    StatCardComponent,
    LoadingComponent,
    MoneyPipe,
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 class="text-xl font-bold">Dashboard</h1>
          <p class="text-gray-500 mt-1 text-sm">Bienvenido, {{ userName() }}</p>
        </div>
        <div class="flex gap-2">
          <p-button
              label="Nueva Transacción"
              icon="pi pi-plus"
              routerLink="/transactions/new">
          </p-button>
        </div>
      </div>

      <!-- Stats Cards -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          @for (i of [1,2,3,4]; track i) {
            <div class="stat-card">
              <p-skeleton height="60px"></p-skeleton>
            </div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <app-stat-card
              label="Balance Total"
              [value]="totalBalance() | money:currency()"
              icon="pi-wallet"
              color="info">
          </app-stat-card>

          <app-stat-card
              label="Ingresos del Período"
              [value]="summary()?.totalIncome | money:currency()"
              icon="pi-arrow-down"
              color="success">
          </app-stat-card>

          <app-stat-card
              label="Egresos del Período"
              [value]="summary()?.totalExpense | money:currency()"
              icon="pi-arrow-up"
              color="danger">
          </app-stat-card>

          <app-stat-card
              label="Balance Neto"
              [value]="summary()?.netBalance | money:currency()"
              icon="pi-chart-line"
              [color]="netBalanceColor()">
          </app-stat-card>
        </div>
      }

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Trends Chart -->
        <p-card header="Tendencia de Ingresos y Egresos">
          @if (trendsReport()) {
            <apx-chart
                [series]="trendChartSeries()"
                [chart]="trendChartOptions.chart"
                [xaxis]="trendChartOptions.xaxis"
                [stroke]="trendChartOptions.stroke"
                [colors]="trendChartOptions.colors"
                [dataLabels]="trendChartOptions.dataLabels"
                [legend]="trendChartOptions.legend">
            </apx-chart>
          } @else {
            <app-loading height="300px"></app-loading>
          }
        </p-card>

        <!-- Balance by Account -->
        <p-card header="Balance por Cuenta">
          @if (balances().length > 0) {
            <apx-chart
                [series]="accountChartSeries()"
                [chart]="accountChartOptions.chart"
                [labels]="accountChartLabels()"
                [colors]="accountChartOptions.colors"
                [legend]="accountChartOptions.legend"
                [dataLabels]="accountChartOptions.dataLabels">
            </apx-chart>
          } @else {
            <div class="flex flex-col items-center justify-center py-12">
              <i class="pi pi-wallet text-4xl text-gray-300 mb-4"></i>
              <p class="text-gray-500">No hay cuentas registradas</p>
              <p-button
                  label="Crear Cuenta"
                  styleClass="mt-4"
                  routerLink="/accounts/new">
              </p-button>
            </div>
          }
        </p-card>
      </div>

      <!-- Recent Transactions -->
      <p-card header="Transacciones Recientes">
        <ng-template pTemplate="header">
          <div class="flex justify-between items-center px-4 pt-4">
            <h3 class="text-lg font-semibold">Transacciones Recientes</h3>
            <p-button
                label="Ver Todas"
                [text]="true"
                routerLink="/transactions">
            </p-button>
          </div>
        </ng-template>

        @if (recentTransactions().length > 0) {
          <p-table [value]="recentTransactions()" [rows]="5" styleClass="p-datatable-sm" [responsive]="true">
            <ng-template pTemplate="header">
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th class="hidden sm:table-cell">Categoría</th>
                <th>Tipo</th>
                <th class="text-right">Monto</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-txn>
              <tr class="cursor-pointer hover:bg-gray-50" [routerLink]="['/transactions', txn.id]">
                <td>
                  <span class="text-gray-600">{{ txn.transactionDate | date:'dd/MM/yyyy' }}</span>
                </td>
                <td>
                  <span class="font-medium">{{ txn.description || 'Sin descripción' }}</span>
                </td>
                <td class="hidden sm:table-cell">
                  <span class="text-gray-600">{{ txn.categoryName || '-' }}</span>
                </td>
                <td>
                  <p-tag
                      [value]="getTypeLabel(txn.type)"
                      [severity]="getTypeSeverity(txn.type)">
                  </p-tag>
                </td>
                <td class="text-right">
                  <span
                      class="font-semibold"
                      [class.text-green-600]="txn.type === 'INCOME'"
                      [class.text-red-600]="txn.type === 'EXPENSE'">
                    {{ txn.type === 'INCOME' ? '+' : '-' }}{{ txn.amount | money:txn.currency }}
                  </span>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="5" class="text-center py-8">
                  <i class="pi pi-inbox text-4xl text-gray-300 mb-4"></i>
                  <p class="text-gray-500">No hay transacciones registradas</p>
                </td>
              </tr>
            </ng-template>
          </p-table>
        } @else {
          <div class="flex flex-col items-center justify-center py-12">
            <i class="pi pi-inbox text-4xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">No hay transacciones registradas</p>
            <p-button
                label="Nueva Transacción"
                styleClass="mt-4"
                routerLink="/transactions/new">
            </p-button>
          </div>
        }
      </p-card>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  // Inyección de dependencias con inject() - PRIMERO
  private readonly reportService = inject(ReportService);
  private readonly transactionService = inject(TransactionService);
  private readonly accountService = inject(AccountService);
  private readonly orgService = inject(OrganizationService);

  // Signals básicos
  isLoading = signal(true);

  // Propiedades que dependen de los servicios - DESPUÉS
  readonly summary = this.reportService.summary;
  readonly trendsReport = this.reportService.trendsReport;
  readonly balances = this.accountService.balances;
  readonly recentTransactions = this.transactionService.transactions;

  // Computed signals
  userName = computed(() => '');
  currency = computed(() => this.orgService.activeOrganization()?.currency || 'USD');

  totalBalance = computed(() => {
    return this.balances().reduce((sum, b) => sum + parseFloat(b.currentBalance), 0).toString();
  });

  // Chart options
  trendChartOptions = {
    chart: { type: 'area' as const, height: 300, toolbar: { show: false } },
    stroke: { curve: 'smooth' as const, width: 2 },
    colors: ['#22c55e', '#ef4444'],
    dataLabels: { enabled: false },
    legend: { position: 'top' as const },
    xaxis: { categories: [] as string[] }
  };

  accountChartOptions = {
    chart: { type: 'donut' as const, height: 300 },
    colors: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'],
    legend: { position: 'bottom' as const },
    dataLabels: { enabled: true }
  };

  netBalanceColor = computed(() => {
    const net = parseFloat(this.summary()?.netBalance || '0');
    return net >= 0 ? 'success' : 'danger';
  });

  trendChartSeries = computed(() => {
    const trends = this.trendsReport();
    if (!trends) return [];

    return [
      { name: 'Ingresos', data: trends.monthlyTrends.map(t => parseFloat(t.income) / 100) },
      { name: 'Egresos', data: trends.monthlyTrends.map(t => parseFloat(t.expense) / 100) }
    ];
  });

  accountChartSeries = computed(() => {
    return this.balances().map(b => parseFloat(b.currentBalance) / 100);
  });

  accountChartLabels = computed(() => {
    return this.balances().map(b => b.name);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    // Get current month range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Load all data
    this.reportService.getSummary({ startDate, endDate }).subscribe();
    this.reportService.getTrendsReport({ startDate: new Date(now.getFullYear(), 0, 1) }).subscribe();
    this.accountService.getAllBalances().subscribe();
    this.transactionService.getAll({ limit: 5 }).subscribe({
      complete: () => this.isLoading.set(false)
    });
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      INCOME: 'Ingreso',
      EXPENSE: 'Egreso',
      TRANSFER: 'Transfer'
    };
    return labels[type] || type;
  }

  getTypeSeverity(type: string): 'success' | 'danger' | 'info' {
    const severities: Record<string, 'success' | 'danger' | 'info'> = {
      INCOME: 'success',
      EXPENSE: 'danger',
      TRANSFER: 'info'
    };
    return severities[type] || 'info';
  }
}