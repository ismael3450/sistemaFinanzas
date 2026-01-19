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
      <div class="page-header">
        <h1>Transacciones</h1>
        <div class="flex gap-2">
          <p-button
              icon="pi pi-download"
              label="Exportar"
              severity="secondary"
              [outlined]="true"
              (onClick)="exportMenu.toggle($event)">
          </p-button>
          <p-button
              icon="pi pi-plus"
              label="Nueva Transacción"
              routerLink="/transactions/new">
          </p-button>
        </div>
      </div>

      <!-- Filters -->
      <p-card styleClass="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <span class="p-input-icon-left w-full">
              <i class="pi pi-search"></i>
              <input
                  pInputText
                  [(ngModel)]="filters.search"
                  placeholder="Descripción o referencia..."
                  class="w-full"
                  (keyup.enter)="applyFilters()">
            </span>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <p-dropdown
                [options]="typeOptions"
                [(ngModel)]="filters.type"
                optionLabel="label"
                optionValue="value"
                placeholder="Todos"
                [showClear]="true"
                styleClass="w-full"
                (onChange)="applyFilters()">
            </p-dropdown>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <p-dropdown
                [options]="categories()"
                [(ngModel)]="filters.categoryId"
                optionLabel="name"
                optionValue="id"
                placeholder="Todas"
                [showClear]="true"
                [filter]="true"
                styleClass="w-full"
                (onChange)="applyFilters()">
            </p-dropdown>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
            <p-calendar
                [(ngModel)]="filters.startDate"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                styleClass="w-full"
                (onSelect)="applyFilters()">
            </p-calendar>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
            <p-calendar
                [(ngModel)]="filters.endDate"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                styleClass="w-full"
                (onSelect)="applyFilters()">
            </p-calendar>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <p-button
              label="Limpiar Filtros"
              severity="secondary"
              [text]="true"
              (onClick)="clearFilters()">
          </p-button>
        </div>
      </p-card>

      <!-- Table -->
      <p-card>
        @if (isLoading()) {
          <app-loading></app-loading>
        } @else if (transactions().length === 0) {
          <app-empty-state
              icon="pi-arrow-right-arrow-left"
              title="Sin transacciones"
              message="No hay transacciones que coincidan con los filtros seleccionados"
              actionLabel="Nueva Transacción"
              [action]="goToNew">
          </app-empty-state>
        } @else {
          <p-table
              [value]="transactions()"
              [paginator]="true"
              [rows]="10"
              [totalRecords]="totalCount()"
              [lazy]="true"
              (onLazyLoad)="onLazyLoad($event)"
              [rowHover]="true"
              styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Cuenta</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th class="text-right">Monto</th>
                <th class="text-center" style="width: 100px">Acciones</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-txn>
              <tr>
                <td>
                  <div class="flex flex-col">
                    <span class="font-medium">{{ txn.transactionDate | date:'dd/MM/yyyy' }}</span>
                    <span class="text-xs text-gray-500">{{ txn.transactionDate | date:'HH:mm' }}</span>
                  </div>
                </td>
                <td>
                  <div class="flex flex-col">
                    <span class="font-medium">{{ txn.description || 'Sin descripción' }}</span>
                    @if (txn.reference) {
                      <span class="text-xs text-gray-500">Ref: {{ txn.reference }}</span>
                    }
                  </div>
                </td>
                <td>{{ txn.categoryName || '-' }}</td>
                <td>
                  @if (txn.type === 'INCOME') {
                    {{ txn.toAccountName }}
                  } @else if (txn.type === 'EXPENSE') {
                    {{ txn.fromAccountName }}
                  } @else {
                    {{ txn.fromAccountName }} → {{ txn.toAccountName }}
                  }
                </td>
                <td>
                  <p-tag [value]="getTypeLabel(txn.type)" [severity]="getTypeSeverity(txn.type)"></p-tag>
                </td>
                <td>
                  <p-tag [value]="getStatusLabel(txn.status)" [severity]="getStatusSeverity(txn.status)"></p-tag>
                </td>
                <td class="text-right">
                  <span
                      class="font-semibold tabular-nums"
                      [class.text-green-600]="txn.type === 'INCOME'"
                      [class.text-red-600]="txn.type === 'EXPENSE'"
                      [class.text-blue-600]="txn.type === 'TRANSFER'">
                    {{ txn.type === 'INCOME' ? '+' : txn.type === 'EXPENSE' ? '-' : '' }}{{ txn.amount | money:txn.currency }}
                  </span>
                </td>
                <td class="text-center">
                  <div class="flex justify-center gap-1">
                    <button
                        pButton
                        pRipple
                        type="button"
                        icon="pi pi-eye"
                        class="p-button-rounded p-button-text p-button-sm"
                        pTooltip="Ver detalle"
                        [routerLink]="['/transactions', txn.id]">
                    </button>
                    @if (txn.status !== 'VOIDED') {
                      <button
                          pButton
                          pRipple
                          type="button"
                          icon="pi pi-pencil"
                          class="p-button-rounded p-button-text p-button-sm"
                          pTooltip="Editar"
                          [routerLink]="['/transactions', txn.id, 'edit']">
                      </button>
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
          </p-table>
        }
      </p-card>
    </div>

    <!-- Export Menu -->
    <p-menu #exportMenu [popup]="true" [model]="exportOptions"></p-menu>

    <p-confirmDialog></p-confirmDialog>
  `
})
export class TransactionsListComponent implements OnInit {
  @ViewChild('exportMenu') exportMenu!: Menu;

  // Inyección de dependencias con inject()
  private transactionService = inject(TransactionService);
  private categoryService = inject(CategoryService);
  private accountService = inject(AccountService);
  private exportService = inject(ExportService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  // Ahora estas propiedades se pueden inicializar correctamente
  isLoading = this.transactionService.isLoading;
  transactions = this.transactionService.transactions;
  totalCount = this.transactionService.totalCount;
  categories = this.categoryService.activeCategories;

  filters: TransactionFilter = {};

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
    this.transactionService.getAll(this.filters).subscribe();
  }

  applyFilters(): void {
    this.filters.page = 1;
    this.loadData();
  }

  clearFilters(): void {
    this.filters = {};
    this.loadData();
  }

  onLazyLoad(event: any): void {
    this.filters.page = Math.floor(event.first / event.rows) + 1;
    this.filters.limit = event.rows;
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

  getTypeSeverity(type: string): 'success' | 'danger' | 'info' {
    const map: Record<string, 'success' | 'danger' | 'info'> = {
      INCOME: 'success',
      EXPENSE: 'danger',
      TRANSFER: 'info'
    };
    return map[type] || 'info';
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

  getStatusSeverity(status: string): 'success' | 'danger' | 'warning' | 'info' {
    const map: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
      PENDING: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'danger',
      VOIDED: 'danger'
    };
    return map[status] || 'info';
  }
}