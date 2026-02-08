import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenuModule } from 'primeng/menu';
import { Menu } from 'primeng/menu';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TransactionService, CategoryService, AccountService, ExportService } from '../../../core/services';
import { Transaction, TransactionFilter, TransactionType } from '../../../core/models';
import { MoneyPipe } from '../../../shared/pipes';
import { LoadingComponent, EmptyStateComponent } from '../../../shared/components';

@Component({
  selector: 'app-transactions-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    MenuModule,
    MoneyPipe,
    LoadingComponent,
    EmptyStateComponent
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Transacciones</h1>
          <p class="text-sm text-gray-500 mt-1">Gestiona tus movimientos financieros</p>
        </div>
        <div class="flex gap-2">
          <p-button
              icon="pi pi-download"
              label="Exportar"
              severity="secondary"
              [outlined]="true"
              styleClass="hidden sm:flex"
              (onClick)="exportMenu.toggle($event)">
          </p-button>
          <p-button
              icon="pi pi-plus"
              label="Nueva Transacción"
              routerLink="/transactions/new">
          </p-button>
        </div>
      </div>

      <!-- Filters Card -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">Filtros de transacciones</h2>
            <p class="text-xs text-gray-500 mt-1">Busca movimientos por descripción, categoría o rango de fechas.</p>
          </div>
          <button
              class="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1.5 transition-colors self-start lg:self-center"
              (click)="clearFilters()">
            <i class="pi pi-filter-slash text-xs"></i>
            Limpiar filtros
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <!-- Search -->
          <div class="xl:col-span-2">
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Buscar</label>
            <span class="p-input-icon-left w-full">
              <i class="pi pi-search text-gray-400"></i>
              <input
                  pInputText
                  [(ngModel)]="filters.search"
                  placeholder="Descripción o referencia..."
                  class="w-full"
                  (keyup.enter)="applyFilters()">
            </span>
          </div>

          <!-- Type Filter -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tipo</label>
            <p-dropdown
                [options]="typeOptions"
                [(ngModel)]="filters.type"
                optionLabel="label"
                optionValue="value"
                placeholder="Todos los tipos"
                [showClear]="true"
                styleClass="w-full"
                (onChange)="applyFilters()">
              <ng-template pTemplate="selectedItem" let-item>
                @if (item) {
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full" [class]="getTypeDotClass(item.value)"></span>
                    <span>{{ item.label }}</span>
                  </div>
                }
              </ng-template>
              <ng-template pTemplate="item" let-item>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" [class]="getTypeDotClass(item.value)"></span>
                  <span>{{ item.label }}</span>
                </div>
              </ng-template>
            </p-dropdown>
          </div>

          <!-- Category Filter -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categoría</label>
            <p-dropdown
                [options]="categories()"
                [(ngModel)]="filters.categoryId"
                optionLabel="name"
                optionValue="id"
                placeholder="Todas las categorías"
                [showClear]="true"
                [filter]="true"
                styleClass="w-full"
                (onChange)="applyFilters()">
            </p-dropdown>
          </div>

          <!-- Date Range -->
          <div class="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Desde</label>
              <p-calendar
                  [(ngModel)]="filters.startDate"
                  dateFormat="dd/mm/yy"
                  [showIcon]="true"
                  styleClass="w-full"
                  placeholder="Fecha inicio"
                  (onSelect)="applyFilters()">
              </p-calendar>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hasta</label>
              <p-calendar
                  [(ngModel)]="filters.endDate"
                  dateFormat="dd/mm/yy"
                  [showIcon]="true"
                  styleClass="w-full"
                  placeholder="Fecha fin"
                  (onSelect)="applyFilters()">
              </p-calendar>
            </div>
          </div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="relative">
          <p-table
              [value]="transactions()"
              [paginator]="true"
              [rows]="filters.limit || 10"
              [totalRecords]="totalCount()"
              [lazy]="true"
              [loading]="isLoading()"
              (onLazyLoad)="onLazyLoad($event)"
              [rowHover]="true"
              styleClass="p-datatable-sm transactions-table"
              [tableStyle]="{'min-width': '40rem'}">
            <ng-template pTemplate="header">
              <tr>
                <th style="width: 120px">Fecha</th>
                <th class="min-w-[180px]">Descripción</th>
                <th style="width: 140px" class="hidden md:table-cell">Categoría</th>
                <th style="width: 160px" class="hidden lg:table-cell">Cuenta</th>
                <th style="width: 100px">Tipo</th>
                <th style="width: 100px" class="hidden sm:table-cell">Estado</th>
                <th style="width: 130px" class="text-right">Monto</th>
                <th style="width: 90px" class="text-center hidden sm:table-cell">Acciones</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-txn>
              <tr class="group cursor-pointer" [routerLink]="['/transactions', txn.id]">
                <td>
                  <div class="flex flex-col">
                    <span class="font-medium text-gray-800">{{ txn.transactionDate | date:'dd MMM yyyy' }}</span>
                    <span class="text-xs text-gray-400">{{ txn.transactionDate | date:'HH:mm' }}</span>
                  </div>
                </td>
                <td>
                  <div class="flex flex-col min-w-0 gap-1">
                    <span class="font-medium text-gray-800 break-words leading-snug">
                      {{ txn.description || 'Sin descripción' }}
                    </span>
                    @if (txn.reference) {
                      <span class="text-xs text-gray-400 font-mono truncate">{{ txn.reference }}</span>
                    }
                  </div>
                </td>
                <td class="hidden md:table-cell">
                  @if (txn.categoryName) {
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {{ txn.categoryName }}
                    </span>
                  } @else {
                    <span class="text-gray-400">-</span>
                  }
                </td>
                <td class="hidden lg:table-cell">
                  <div class="text-sm text-gray-700">
                    @if (txn.type === 'INCOME') {
                      <span class="flex items-center gap-1">
                        <i class="pi pi-arrow-down text-emerald-500 text-xs"></i>
                        <span class="truncate">{{ txn.toAccountName }}</span>
                      </span>
                    } @else if (txn.type === 'EXPENSE') {
                      <span class="flex items-center gap-1">
                        <i class="pi pi-arrow-up text-rose-500 text-xs"></i>
                        <span class="truncate">{{ txn.fromAccountName }}</span>
                      </span>
                    } @else {
                      <span class="flex items-center gap-1 text-xs">
                        <span class="truncate">{{ txn.fromAccountName }}</span>
                        <i class="pi pi-arrow-right text-indigo-500"></i>
                        <span class="truncate">{{ txn.toAccountName }}</span>
                      </span>
                    }
                  </div>
                </td>
                <td>
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        [class]="getTypeTagClass(txn.type)">
                    <span class="w-1.5 h-1.5 rounded-full" [class]="getTypeDotClass(txn.type)"></span>
                    {{ getTypeLabel(txn.type) }}
                  </span>
                </td>
                <td class="hidden sm:table-cell">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                        [class]="getStatusTagClass(txn.status)">
                    {{ getStatusLabel(txn.status) }}
                  </span>
                </td>
                <td class="text-right">
                  <span
                      class="font-bold tabular-nums text-base"
                      [class.text-emerald-600]="txn.type === 'INCOME'"
                      [class.text-rose-600]="txn.type === 'EXPENSE'"
                      [class.text-indigo-600]="txn.type === 'TRANSFER'">
                    {{ txn.type === 'INCOME' ? '+' : txn.type === 'EXPENSE' ? '-' : '' }}{{ txn.amount | money:txn.currency }}
                  </span>
                </td>
                <td class="text-center hidden sm:table-cell" (click)="$event.stopPropagation()">
                  <div class="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        pButton
                        pRipple
                        type="button"
                        icon="pi pi-pencil"
                        class="p-button-rounded p-button-text p-button-sm"
                        pTooltip="Editar"
                        [disabled]="txn.status === 'VOIDED'"
                        [routerLink]="['/transactions', txn.id, 'edit']">
                    </button>
                    @if (txn.status !== 'VOIDED') {
                      <button
                          pButton
                          pRipple
                          type="button"
                          icon="pi pi-ban"
                          class="p-button-rounded p-button-text p-button-danger p-button-sm"
                          pTooltip="Anular"
                          (click)="confirmVoid(txn)">
                      </button>
                    }
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="8" class="py-10">
                  <app-empty-state
                      icon="pi-arrow-right-arrow-left"
                      title="Sin transacciones"
                      message="No hay transacciones que coincidan con los filtros seleccionados"
                      actionLabel="Nueva Transacción"
                      [action]="goToNew">
                  </app-empty-state>
                </td>
              </tr>
            </ng-template>
          </p-table>
          @if (isLoading()) {
            <div class="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
              <app-loading></app-loading>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Export Menu -->
    <p-menu #exportMenu [popup]="true" [model]="exportOptions"></p-menu>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    :host ::ng-deep {
      .transactions-table .p-datatable-tbody > tr > td,
      .transactions-table .p-datatable-thead > tr > th {
        padding: 0.85rem 1rem;
      }
          .transactions-table .p-datatable-tbody > tr {
        transition: background 0.15s ease;
      }
    }
  `]
})
export class TransactionsListComponent implements OnInit {
  @ViewChild('exportMenu') exportMenu!: Menu;

  private transactionService = inject(TransactionService);
  private categoryService = inject(CategoryService);
  private accountService = inject(AccountService);
  private exportService = inject(ExportService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  isLoading = this.transactionService.isLoading;
  transactions = this.transactionService.transactions;
  totalCount = this.transactionService.totalCount;
  categories = this.categoryService.activeCategories;

  filters: TransactionFilter = { page: 1, limit: 10 };

  typeOptions = [
    { label: 'Ingreso', value: 'INCOME' },
    { label: 'Egreso', value: 'EXPENSE' },
    { label: 'Transferencia', value: 'TRANSFER' }
  ];

  exportOptions = [
    { label: 'Exportar CSV', icon: 'pi pi-file', command: () => this.export('csv') },
    { label: 'Exportar Excel', icon: 'pi pi-file-excel', command: () => this.export('xlsx') },
    { label: 'Exportar PDF', icon: 'pi pi-file-pdf', command: () => this.export('pdf') }
  ];

  goToNew = () => this.router.navigate(['/transactions/new']);

  ngOnInit(): void {
    this.categoryService.getAll().subscribe();
    this.loadData();
  }

  loadData(): void {
    if (this.isLoading()) return;
    this.transactionService.getAll(this.filters).subscribe();
  }

  applyFilters(): void {
    this.filters.page = 1;
    this.loadData();
  }

  clearFilters(): void {
    this.filters = { page: 1, limit: this.filters.limit || 10 };
    this.loadData();
  }

  onLazyLoad(event: any): void {
    const rows = event.rows ?? this.filters.limit ?? 10;
    const first = event.first ?? 0;
    const nextPage = Math.floor(first / rows) + 1;
    if (nextPage === this.filters.page && rows === this.filters.limit) return;
    this.filters.page = nextPage;
    this.filters.limit = rows;
    this.loadData();
  }

  confirmVoid(txn: Transaction): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de anular la transacción "${txn.description || 'Sin descripción'}"?`,
      header: 'Confirmar Anulación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Anular',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.transactionService.void(txn.id, 'Anulada por el usuario').subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Transacción anulada correctamente'
            });
          }
        });
      }
    });
  }

  export(format: 'csv' | 'xlsx' | 'pdf'): void {
    this.exportService.exportTransactions({
      ...this.filters,
      format
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

  getTypeDotClass(type: string): string {
    const classes: Record<string, string> = {
      INCOME: 'bg-emerald-500',
      EXPENSE: 'bg-rose-500',
      TRANSFER: 'bg-indigo-500'
    };
    return classes[type] || 'bg-gray-500';
  }

  getTypeTagClass(type: string): string {
    const classes: Record<string, string> = {
      INCOME: 'bg-emerald-50 text-emerald-700',
      EXPENSE: 'bg-rose-50 text-rose-700',
      TRANSFER: 'bg-indigo-50 text-indigo-700'
    };
    return classes[type] || 'bg-gray-50 text-gray-700';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      VOIDED: 'Anulada'
    };
    return labels[status] || status;
  }

  getStatusTagClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'bg-amber-50 text-amber-700',
      COMPLETED: 'bg-emerald-50 text-emerald-700',
      CANCELLED: 'bg-gray-100 text-gray-600',
      VOIDED: 'bg-rose-50 text-rose-700'
    };
    return classes[status] || 'bg-gray-50 text-gray-700';
  }
}