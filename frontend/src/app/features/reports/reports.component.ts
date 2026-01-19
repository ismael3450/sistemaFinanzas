import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { TabViewModule } from 'primeng/tabview';
import { TableModule } from 'primeng/table';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ReportService, ExportService, OrganizationService } from '../../core/services';
import { MoneyPipe } from '../../shared/pipes';
import { StatCardComponent, LoadingComponent } from '../../shared/components';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, CalendarModule, DropdownModule,
    TabViewModule, TableModule, NgApexchartsModule, MoneyPipe, StatCardComponent, LoadingComponent
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Reportes</h1>
        <div class="flex gap-2">
          <p-button icon="pi pi-download" label="Exportar PDF" severity="secondary" [outlined]="true"
                    (onClick)="exportPDF()"></p-button>
        </div>
      </div>

      <!-- Filters -->
      <p-card styleClass="mb-6">
        <div class="flex flex-wrap items-end gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Período</label>
            <p-dropdown [options]="periodOptions" [(ngModel)]="selectedPeriod" optionLabel="label" 
                        optionValue="value" (onChange)="onPeriodChange()"></p-dropdown>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <p-calendar [(ngModel)]="startDate" dateFormat="dd/mm/yy" [showIcon]="true"></p-calendar>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <p-calendar [(ngModel)]="endDate" dateFormat="dd/mm/yy" [showIcon]="true"></p-calendar>
          </div>
          <p-button label="Aplicar" icon="pi pi-search" (onClick)="loadReports()"></p-button>
        </div>
      </p-card>

      <!-- Summary Cards -->
      @if (isLoading()) {
        <app-loading></app-loading>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <app-stat-card label="Total Ingresos" [value]="summary()?.totalIncome | money:currency()" 
                         icon="pi-arrow-down" color="success"></app-stat-card>
          <app-stat-card label="Total Egresos" [value]="summary()?.totalExpense | money:currency()" 
                         icon="pi-arrow-up" color="danger"></app-stat-card>
          <app-stat-card label="Balance Neto" [value]="summary()?.netBalance | money:currency()" 
                         icon="pi-chart-line" [color]="netColor()"></app-stat-card>
          <app-stat-card label="Transacciones" [value]="summary()?.transactionCount?.toString() || '0'" 
                         icon="pi-list"></app-stat-card>
        </div>

        <!-- Tabs -->
        <p-tabView>
          <!-- Trends Tab -->
          <p-tabPanel header="Tendencias">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <p-card header="Ingresos vs Egresos">
                @if (trendsReport()) {
                  <apx-chart [series]="trendSeries()" [chart]="{ type: 'area', height: 350, toolbar: { show: false } }"
                             [xaxis]="{ categories: trendCategories() }" [colors]="['#22c55e', '#ef4444']"
                             [stroke]="{ curve: 'smooth', width: 2 }" [dataLabels]="{ enabled: false }">
                  </apx-chart>
                }
              </p-card>
              <p-card header="Balance Acumulado">
                @if (trendsReport()) {
                  <apx-chart [series]="balanceSeries()" [chart]="{ type: 'line', height: 350, toolbar: { show: false } }"
                             [xaxis]="{ categories: trendCategories() }" [colors]="['#3b82f6']"
                             [stroke]="{ curve: 'smooth', width: 3 }">
                  </apx-chart>
                }
              </p-card>
            </div>
          </p-tabPanel>

          <!-- By Category Tab -->
          <p-tabPanel header="Por Categoría">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <p-card header="Ingresos por Categoría">
                @if (categoryReport()?.incomeByCategory?.length) {
                  <apx-chart [series]="incomeCategorySeries()" [chart]="{ type: 'donut', height: 350 }"
                             [labels]="incomeCategoryLabels()" [colors]="chartColors"
                             [legend]="{ position: 'bottom' }">
                  </apx-chart>
                } @else {
                  <p class="text-center text-gray-500 py-8">Sin datos de ingresos</p>
                }
              </p-card>
              <p-card header="Egresos por Categoría">
                @if (categoryReport()?.expenseByCategory?.length) {
                  <apx-chart [series]="expenseCategorySeries()" [chart]="{ type: 'donut', height: 350 }"
                             [labels]="expenseCategoryLabels()" [colors]="chartColors"
                             [legend]="{ position: 'bottom' }">
                  </apx-chart>
                } @else {
                  <p class="text-center text-gray-500 py-8">Sin datos de egresos</p>
                }
              </p-card>
            </div>

            <!-- Category Tables -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <p-card header="Detalle de Ingresos">
                <p-table [value]="categoryReport()?.incomeByCategory || []" styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr><th>Categoría</th><th class="text-right">Monto</th><th class="text-right">%</th></tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-item>
                    <tr>
                      <td>{{ item.categoryName }}</td>
                      <td class="text-right tabular-nums">{{ item.totalAmount | money:currency() }}</td>
                      <td class="text-right">{{ item.percentage | number:'1.1-1' }}%</td>
                    </tr>
                  </ng-template>
                </p-table>
              </p-card>
              <p-card header="Detalle de Egresos">
                <p-table [value]="categoryReport()?.expenseByCategory || []" styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr><th>Categoría</th><th class="text-right">Monto</th><th class="text-right">%</th></tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-item>
                    <tr>
                      <td>{{ item.categoryName }}</td>
                      <td class="text-right tabular-nums">{{ item.totalAmount | money:currency() }}</td>
                      <td class="text-right">{{ item.percentage | number:'1.1-1' }}%</td>
                    </tr>
                  </ng-template>
                </p-table>
              </p-card>
            </div>
          </p-tabPanel>

          <!-- By Account Tab -->
          <p-tabPanel header="Por Cuenta">
            <p-card>
              <p-table [value]="accountReport()" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr>
                    <th>Cuenta</th>
                    <th class="text-right">Balance Actual</th>
                    <th class="text-right">Ingresos</th>
                    <th class="text-right">Egresos</th>
                    <th class="text-right">Transacciones</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-item>
                  <tr>
                    <td class="font-medium">{{ item.accountName }}</td>
                    <td class="text-right tabular-nums font-semibold"
                        [class.text-green-600]="parseFloat(item.currentBalance) >= 0"
                        [class.text-red-600]="parseFloat(item.currentBalance) < 0">
                      {{ item.currentBalance | money:currency() }}
                    </td>
                    <td class="text-right tabular-nums text-green-600">{{ item.totalIncome | money:currency() }}</td>
                    <td class="text-right tabular-nums text-red-600">{{ item.totalExpense | money:currency() }}</td>
                    <td class="text-right">{{ item.transactionCount }}</td>
                  </tr>
                </ng-template>
              </p-table>
            </p-card>
          </p-tabPanel>
        </p-tabView>
      }
    </div>
  `
})
export class ReportsComponent implements OnInit {
  // Inyección de dependencias con inject() - PRIMERO
  private readonly reportService = inject(ReportService);
  private readonly exportService = inject(ExportService);
  private readonly orgService = inject(OrganizationService);

  // Propiedades que dependen de los servicios - DESPUÉS
  readonly isLoading = this.reportService.isLoading;
  readonly summary = this.reportService.summary;
  readonly categoryReport = this.reportService.categoryReport;
  readonly accountReport = this.reportService.accountReport;
  readonly trendsReport = this.reportService.trendsReport;

  // Date filters
  startDate: Date = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  endDate: Date = new Date();
  selectedPeriod = 'month';

  // Options
  readonly periodOptions = [
    { label: 'Este mes', value: 'month' },
    { label: 'Este trimestre', value: 'quarter' },
    { label: 'Este año', value: 'year' },
    { label: 'Personalizado', value: 'custom' }
  ];

  readonly chartColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
  readonly parseFloat = parseFloat;

  // Computed functions
  currency = () => this.orgService.activeOrganization()?.currency || 'USD';
  netColor = () => parseFloat(this.summary()?.netBalance || '0') >= 0 ? 'success' as const : 'danger' as const;

  trendSeries = () => {
    const trends = this.trendsReport()?.monthlyTrends || [];
    return [
      { name: 'Ingresos', data: trends.map(t => parseFloat(t.income) / 100) },
      { name: 'Egresos', data: trends.map(t => parseFloat(t.expense) / 100) }
    ];
  };

  trendCategories = () => (this.trendsReport()?.monthlyTrends || []).map(t => t.date);

  balanceSeries = () => {
    const trends = this.trendsReport()?.monthlyTrends || [];
    let accumulated = 0;
    return [{
      name: 'Balance',
      data: trends.map(t => {
        accumulated += parseFloat(t.net) / 100;
        return accumulated;
      })
    }];
  };

  incomeCategorySeries = () => (this.categoryReport()?.incomeByCategory || []).map(c => parseFloat(c.totalAmount) / 100);
  incomeCategoryLabels = () => (this.categoryReport()?.incomeByCategory || []).map(c => c.categoryName);
  expenseCategorySeries = () => (this.categoryReport()?.expenseByCategory || []).map(c => parseFloat(c.totalAmount) / 100);
  expenseCategoryLabels = () => (this.categoryReport()?.expenseByCategory || []).map(c => c.categoryName);

  ngOnInit(): void {
    this.loadReports();
  }

  onPeriodChange() {
    const now = new Date();
    switch (this.selectedPeriod) {
      case 'month':
        this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        this.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        this.startDate = new Date(now.getFullYear(), quarter * 3, 1);
        this.endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'year':
        this.startDate = new Date(now.getFullYear(), 0, 1);
        this.endDate = new Date(now.getFullYear(), 11, 31);
        break;
    }
    if (this.selectedPeriod !== 'custom') this.loadReports();
  }

  loadReports() {
    const query = { startDate: this.startDate, endDate: this.endDate };
    this.reportService.getSummary(query).subscribe();
    this.reportService.getCategoryReport(query).subscribe();
    this.reportService.getAccountReport(query).subscribe();
    this.reportService.getTrendsReport(query).subscribe();
  }

  exportPDF() {
    this.exportService.exportTransactions({ startDate: this.startDate, endDate: this.endDate, format: 'pdf' });
  }
}
