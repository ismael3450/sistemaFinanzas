import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { TabViewModule } from 'primeng/tabview';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MessageService } from 'primeng/api';
import {
  ReportService,
  OrganizationService,
  ExportService
} from '../../core/services';
import { MoneyPipe } from '../../shared/pipes';
import {
  PeriodSummary,
  CategoryReport,
  TrendsReport
} from '../../core/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    TabViewModule,
    TableModule,
    TagModule,
    SkeletonModule,
    NgApexchartsModule,
    MoneyPipe
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Reportes</h1>
        <div class="flex gap-2">
          <p-button 
            icon="pi pi-file-pdf" 
            label="Exportar PDF"
            severity="secondary"
            [outlined]="true"
            (onClick)="exportPDF()">
          </p-button>
          <p-button 
            icon="pi pi-file-excel" 
            label="Exportar Excel"
            severity="secondary"
            [outlined]="true"
            (onClick)="exportExcel()">
          </p-button>
        </div>
      </div>

      <!-- Filtros de fecha -->
      <p-card styleClass="mb-6">
        <div class="flex flex-wrap items-end gap-4">
          <div class="form-group mb-0">
            <label>Fecha Inicio</label>
            <p-calendar 
              [(ngModel)]="startDate"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              appendTo="body"
              styleClass="w-48">
            </p-calendar>
          </div>
          <div class="form-group mb-0">
            <label>Fecha Fin</label>
            <p-calendar 
              [(ngModel)]="endDate"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              appendTo="body"
              styleClass="w-48">
            </p-calendar>
          </div>
          <div class="form-group mb-0">
            <label>Período Rápido</label>
            <p-dropdown 
              [options]="quickPeriods"
              [(ngModel)]="selectedPeriod"
              optionLabel="label"
              optionValue="value"
              appendTo="body"
              (onChange)="onQuickPeriodChange()"
              styleClass="w-48">
            </p-dropdown>
          </div>
          <p-button 
            icon="pi pi-search" 
            label="Aplicar"
            (onClick)="loadReports()">
          </p-button>
        </div>
      </p-card>

      <!-- Summary Cards -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          @for (i of [1,2,3,4]; track i) {
            <div class="stat-card">
              <p-skeleton width="60%" height="1rem" styleClass="mb-2"></p-skeleton>
              <p-skeleton width="80%" height="2rem"></p-skeleton>
            </div>
          }
        </div>
      } @else if (summary()) {
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div class="stat-card">
            <p class="stat-label">Ingresos Totales</p>
            <p class="stat-value text-green-600">
              {{ summary()!.totalIncome | money:currency() }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {{ summary()!.incomeCount }} transacciones
            </p>
          </div>
          <div class="stat-card">
            <p class="stat-label">Egresos Totales</p>
            <p class="stat-value text-red-600">
              {{ summary()!.totalExpense | money:currency() }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {{ summary()!.expenseCount }} transacciones
            </p>
          </div>
          <div class="stat-card">
            <p class="stat-label">Balance Neto</p>
            <p class="stat-value" 
               [class.text-green-600]="getNetValue() >= 0"
               [class.text-red-600]="getNetValue() < 0">
              {{ summary()!.netBalance | money:currency() }}
            </p>
          </div>
          <div class="stat-card">
            <p class="stat-label">Total Transacciones</p>
            <p class="stat-value">{{ summary()!.transactionCount }}</p>
          </div>
        </div>
      }

      <!-- Tabs de reportes -->
      <p-tabView>
        <!-- Por Categoría -->
        <p-tabPanel header="Por Categoría">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Ingresos por categoría -->
            <p-card header="Ingresos por Categoría">
              @if (categoryReport()?.incomeByCategory?.length) {
                <div class="mb-4">
                  <apx-chart
                    [series]="incomeChartData().series"
                    [chart]="pieChartOptions.chart"
                    [labels]="incomeChartData().labels"
                    [colors]="incomeChartData().colors"
                    [legend]="pieChartOptions.legend"
                    [dataLabels]="pieChartOptions.dataLabels">
                  </apx-chart>
                </div>
                <p-table [value]="categoryReport()!.incomeByCategory" styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Categoría</th>
                      <th class="text-right">Monto</th>
                      <th class="text-right">%</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-item>
                    <tr>
                      <td>{{ item.categoryName }}</td>
                      <td class="text-right tabular-nums">{{ item.totalAmount | money:currency() }}</td>
                      <td class="text-right">{{ item.percentage | number:'1.1-1' }}%</td>
                    </tr>
                  </ng-template>
                </p-table>
              } @else {
                <div class="text-center py-8 text-gray-500">
                  <i class="pi pi-inbox text-4xl mb-2"></i>
                  <p>No hay ingresos en este período</p>
                </div>
              }
            </p-card>

            <!-- Egresos por categoría -->
            <p-card header="Egresos por Categoría">
              @if (categoryReport()?.expenseByCategory?.length) {
                <div class="mb-4">
                  <apx-chart
                    [series]="expenseChartData().series"
                    [chart]="pieChartOptions.chart"
                    [labels]="expenseChartData().labels"
                    [colors]="expenseChartData().colors"
                    [legend]="pieChartOptions.legend"
                    [dataLabels]="pieChartOptions.dataLabels">
                  </apx-chart>
                </div>
                <p-table [value]="categoryReport()!.expenseByCategory" styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Categoría</th>
                      <th class="text-right">Monto</th>
                      <th class="text-right">%</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-item>
                    <tr>
                      <td>{{ item.categoryName }}</td>
                      <td class="text-right tabular-nums">{{ item.totalAmount | money:currency() }}</td>
                      <td class="text-right">{{ item.percentage | number:'1.1-1' }}%</td>
                    </tr>
                  </ng-template>
                </p-table>
              } @else {
                <div class="text-center py-8 text-gray-500">
                  <i class="pi pi-inbox text-4xl mb-2"></i>
                  <p>No hay egresos en este período</p>
                </div>
              }
            </p-card>
          </div>
        </p-tabPanel>

        <!-- Tendencias -->
        <p-tabPanel header="Tendencias">
          <p-card>
            @if (trends()?.monthlyTrends?.length) {
              <apx-chart
                [series]="trendsChartData().series"
                [chart]="trendsChartOptions.chart"
                [xaxis]="trendsChartData().xaxis"
                [stroke]="trendsChartOptions.stroke"
                [colors]="trendsChartOptions.colors"
                [legend]="trendsChartOptions.legend"
                [dataLabels]="trendsChartOptions.dataLabels">
              </apx-chart>
            } @else {
              <div class="text-center py-12 text-gray-500">
                <i class="pi pi-chart-line text-4xl mb-2"></i>
                <p>No hay datos suficientes para mostrar tendencias</p>
              </div>
            }
          </p-card>
        </p-tabPanel>
      </p-tabView>
    </div>
  `
})
export class ReportsComponent implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly orgService = inject(OrganizationService);
  private readonly exportService = inject(ExportService);
  private readonly messageService = inject(MessageService);

  loading = signal(false);
  summary = signal<PeriodSummary | null>(null);
  categoryReport = signal<CategoryReport | null>(null);
  trends = signal<TrendsReport | null>(null);

  // Filtros
  startDate: Date = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  endDate: Date = new Date();
  selectedPeriod: string = 'this_month';

  quickPeriods = [
    { label: 'Este Mes', value: 'this_month' },
    { label: 'Mes Anterior', value: 'last_month' },
    { label: 'Este Año', value: 'this_year' },
    { label: 'Año Anterior', value: 'last_year' },
    { label: 'Últimos 30 días', value: 'last_30_days' },
    { label: 'Últimos 90 días', value: 'last_90_days' },
    { label: 'Personalizado', value: 'custom' }
  ];

  currency = computed(() => this.orgService.activeOrganization()?.currency || 'USD');

  // Chart options
  pieChartOptions = {
    chart: {
      type: 'donut' as const,
      height: 250
    },
    legend: {
      position: 'bottom' as const
    },
    dataLabels: {
      enabled: false
    }
  };

  trendsChartOptions = {
    chart: {
      type: 'area' as const,
      height: 350,
      toolbar: { show: false }
    },
    stroke: {
      curve: 'smooth' as const,
      width: 2
    },
    colors: ['#22c55e', '#ef4444', '#3b82f6'],
    legend: {
      position: 'top' as const
    },
    dataLabels: {
      enabled: false
    }
  };

  incomeChartData = computed(() => {
    const data = this.categoryReport()?.incomeByCategory || [];
    return {
      series: data.map(d => parseFloat(d.totalAmount) / 100),
      labels: data.map(d => d.categoryName),
      colors: this.generateColors(data.length)
    };
  });

  expenseChartData = computed(() => {
    const data = this.categoryReport()?.expenseByCategory || [];
    return {
      series: data.map(d => parseFloat(d.totalAmount) / 100),
      labels: data.map(d => d.categoryName),
      colors: this.generateColors(data.length)
    };
  });

  trendsChartData = computed(() => {
    const data = this.trends()?.monthlyTrends || [];
    return {
      series: [
        { name: 'Ingresos', data: data.map(d => parseFloat(d.income) / 100) },
        { name: 'Egresos', data: data.map(d => parseFloat(d.expense) / 100) },
        { name: 'Balance', data: data.map(d => parseFloat(d.net) / 100) }
      ],
      xaxis: {
        categories: data.map(d => d.date)
      }
    };
  });

  ngOnInit(): void {
    this.loadReports();
  }

  onQuickPeriodChange(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (this.selectedPeriod) {
      case 'this_month':
        this.startDate = new Date(year, month, 1);
        this.endDate = new Date();
        break;
      case 'last_month':
        this.startDate = new Date(year, month - 1, 1);
        this.endDate = new Date(year, month, 0);
        break;
      case 'this_year':
        this.startDate = new Date(year, 0, 1);
        this.endDate = new Date();
        break;
      case 'last_year':
        this.startDate = new Date(year - 1, 0, 1);
        this.endDate = new Date(year - 1, 11, 31);
        break;
      case 'last_30_days':
        this.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        this.endDate = new Date();
        break;
      case 'last_90_days':
        this.startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        this.endDate = new Date();
        break;
    }

    if (this.selectedPeriod !== 'custom') {
      this.loadReports();
    }
  }

  loadReports(): void {
    this.loading.set(true);
    const query = {
      startDate: this.startDate,
      endDate: this.endDate
    };

    // Cargar resumen
    this.reportService.getPeriodSummary(query).subscribe({
      next: (data) => this.summary.set(data),
      error: () => this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cargar el resumen'
      })
    });

    // Cargar reporte por categoría
    this.reportService.getCategoryReport(query).subscribe({
      next: (data) => this.categoryReport.set(data),
      error: () => {}
    });

    // Cargar tendencias
    this.reportService.getTrends(query).subscribe({
      next: (data) => {
        this.trends.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getNetValue(): number {
    const summary = this.summary();
    if (!summary) return 0;
    return parseFloat(summary.netBalance);
  }

  exportPDF(): void {
    this.exportService.exportPDF({
      startDate: this.startDate,
      endDate: this.endDate
    }).subscribe({
      next: (blob) => {
        this.downloadFile(blob, 'reporte.pdf');
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'PDF exportado correctamente'
        });
      },
      error: () => this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo exportar el PDF'
      })
    });
  }

  exportExcel(): void {
    this.exportService.exportXLSX({
      startDate: this.startDate,
      endDate: this.endDate
    }).subscribe({
      next: (blob) => {
        this.downloadFile(blob, 'reporte.xlsx');
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Excel exportado correctamente'
        });
      },
      error: () => this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo exportar el Excel'
      })
    });
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private generateColors(count: number): string[] {
    const baseColors = [
      '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  }
}