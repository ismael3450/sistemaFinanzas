import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageService } from 'primeng/api';
import {
  TransactionService,
  CategoryService,
  AccountService,
  PaymentMethodService,
  OrganizationService
} from '../../../core/services';
import { TransactionType, Category, Account, PaymentMethod } from '../../../core/models';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    InputTextareaModule,
    DropdownModule,
    CalendarModule,
    SelectButtonModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="flex items-center gap-4">
          <button
              pButton
              icon="pi pi-arrow-left"
              class="p-button-text"
              routerLink="/transactions">
          </button>
          <h1>{{ isEdit() ? 'Editar Transacción' : 'Nueva Transacción' }}</h1>
        </div>
      </div>

      <p-card>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <!-- Transaction Type -->
          <div class="form-group mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Transacción *</label>
            <p-selectButton
                [options]="transactionTypes"
                formControlName="type"
                optionLabel="label"
                optionValue="value"
                styleClass="w-full"
                (onChange)="onTypeChange()">
              <ng-template pTemplate="item" let-item>
                <div class="flex items-center gap-2 px-2">
                  <i [class]="'pi ' + item.icon"></i>
                  <span>{{ item.label }}</span>
                </div>
              </ng-template>
            </p-selectButton>
          </div>

          <!-- Amount and Date -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label for="amount">Monto *</label>
              <p-inputNumber
                  id="amount"
                  formControlName="amount"
                  mode="currency"
                  [currency]="currency()"
                  inputStyleClass="w-full"
                  styleClass="w-full"
                  [min]="0.01">
              </p-inputNumber>
              @if (form.get('amount')?.hasError('required') && form.get('amount')?.touched) {
                <small class="error-message">El monto es requerido</small>
              }
            </div>

            <div class="form-group">
              <label for="transactionDate">Fecha *</label>
              <p-calendar
                  id="transactionDate"
                  formControlName="transactionDate"
                  dateFormat="dd/mm/yy"
                  [showTime]="true"
                  [showIcon]="true"
                  appendTo="body"
                  styleClass="w-full">
              </p-calendar>
              @if (form.get('transactionDate')?.hasError('required') && form.get('transactionDate')?.touched) {
                <small class="error-message">La fecha es requerida</small>
              }
            </div>
          </div>

          <!-- Account Selection based on type -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @if (showFromAccount()) {
              <div class="form-group">
                <label for="fromAccountId">Cuenta Origen *</label>
                <p-dropdown
                    id="fromAccountId"
                    formControlName="fromAccountId"
                    [options]="accounts()"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Seleccione cuenta"
                    [filter]="true"
                    appendTo="body"
                    [virtualScroll]="true"
                    [virtualScrollItemSize]="40"
                    styleClass="w-full">
                  <ng-template pTemplate="item" let-account>
                    <div class="flex justify-between items-center w-full">
                      <span>{{ account.name }}</span>
                      <span class="text-gray-500 text-sm">{{ formatBalance(account.currentBalance) }}</span>
                    </div>
                  </ng-template>
                </p-dropdown>
                @if (form.get('fromAccountId')?.hasError('required') && form.get('fromAccountId')?.touched) {
                  <small class="error-message">La cuenta origen es requerida</small>
                }
              </div>
            }

            @if (showToAccount()) {
              <div class="form-group">
                <label for="toAccountId">Cuenta Destino *</label>
                <p-dropdown
                    id="toAccountId"
                    formControlName="toAccountId"
                    [options]="accounts()"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Seleccione cuenta"
                    [filter]="true"
                    appendTo="body"
                    [virtualScroll]="true"
                    [virtualScrollItemSize]="40"
                    styleClass="w-full">
                  <ng-template pTemplate="item" let-account>
                    <div class="flex justify-between items-center w-full">
                      <span>{{ account.name }}</span>
                      <span class="text-gray-500 text-sm">{{ formatBalance(account.currentBalance) }}</span>
                    </div>
                  </ng-template>
                </p-dropdown>
                @if (form.get('toAccountId')?.hasError('required') && form.get('toAccountId')?.touched) {
                  <small class="error-message">La cuenta destino es requerida</small>
                }
              </div>
            }
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Category -->
            <div class="form-group">
              <label for="categoryId">Categoría</label>
              <p-dropdown
                  id="categoryId"
                  formControlName="categoryId"
                  [options]="filteredCategories()"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Seleccione categoría"
                  [filter]="true"
                  [showClear]="true"
                  appendTo="body"
                  [virtualScroll]="true"
                  [virtualScrollItemSize]="40"
                  emptyMessage="No hay categorías disponibles"
                  styleClass="w-full">
                <ng-template pTemplate="item" let-category>
                  <div class="flex items-center gap-2">
                    <span class="inline-block w-3 h-3 rounded-full"
                          [style.background-color]="category.color || '#6b7280'"></span>
                    <span>{{ category.name }}</span>
                    <span class="text-xs text-gray-400 ml-auto">
                      {{ getCategoryTypeLabel(category.type) }}
                    </span>
                  </div>
                </ng-template>
              </p-dropdown>
              <!-- Debug info - remover en producción -->
              <small class="text-gray-400 text-xs">
                {{ filteredCategories().length }} categorías disponibles
              </small>
            </div>

            <!-- Payment Method -->
            <div class="form-group">
              <label for="paymentMethodId">Método de Pago</label>
              <p-dropdown
                  id="paymentMethodId"
                  formControlName="paymentMethodId"
                  [options]="paymentMethods()"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Seleccione método"
                  [showClear]="true"
                  appendTo="body"
                  emptyMessage="No hay métodos de pago disponibles"
                  styleClass="w-full">
              </p-dropdown>
              <!-- Debug info - remover en producción -->
              <small class="text-gray-400 text-xs">
                {{ paymentMethods().length }} métodos disponibles
              </small>
            </div>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label for="description">Descripción</label>
            <textarea
                pInputTextarea
                id="description"
                formControlName="description"
                [rows]="3"
                placeholder="Descripción de la transacción..."
                class="w-full">
            </textarea>
          </div>

          <!-- Reference -->
          <div class="form-group">
            <label for="reference">Número de Referencia</label>
            <input
                pInputText
                id="reference"
                formControlName="reference"
                placeholder="Ej: FAC-001, CHK-123"
                class="w-full">
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-6 pt-6 border-t">
            <p-button
                label="Cancelar"
                severity="secondary"
                [outlined]="true"
                routerLink="/transactions">
            </p-button>
            <p-button
                type="submit"
                [label]="isEdit() ? 'Actualizar' : 'Guardar'"
                [loading]="saving()"
                [disabled]="form.invalid">
            </p-button>
          </div>
        </form>
      </p-card>
    </div>
  `,
  styles: [`
    :host ::ng-deep {
      .p-dropdown-panel {
        max-height: 300px !important;
      }

      .p-dropdown-items-wrapper {
        max-height: 250px !important;
        overflow-y: auto !important;
      }
    }
  `]
})
export class TransactionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly accountService = inject(AccountService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly orgService = inject(OrganizationService);

  isEdit = signal(false);
  transactionId = signal<string | null>(null);
  saving = signal(false);
  dataLoaded = signal(false);

  form: FormGroup = this.fb.group({
    type: ['EXPENSE', Validators.required],
    amount: [null, [Validators.required, Validators.min(0.01)]],
    transactionDate: [new Date(), Validators.required],
    fromAccountId: [null],
    toAccountId: [null],
    categoryId: [null],
    paymentMethodId: [null],
    description: [''],
    reference: ['']
  });

  readonly transactionTypes = [
    { label: 'Ingreso', value: 'INCOME', icon: 'pi-arrow-down' },
    { label: 'Egreso', value: 'EXPENSE', icon: 'pi-arrow-up' },
    { label: 'Transferencia', value: 'TRANSFER', icon: 'pi-arrows-h' }
  ];

  // Usar signals directamente de los servicios
  // Los servicios ya manejan internamente el response.data
  readonly accounts = this.accountService.activeAccounts;
  readonly categories = this.categoryService.activeCategories;
  readonly paymentMethods = this.paymentMethodService.activePaymentMethods;

  currency = computed(() => this.orgService.activeOrganization()?.currency || 'USD');

  /**
   * Filtrar categorías según el tipo de transacción
   * Las categorías con type='BOTH' aparecen en ingresos y egresos
   */
  filteredCategories = computed(() => {
    const type = this.form?.get('type')?.value;
    const allCategories = this.categories();

    // Debug - remover en producción
    console.log('Tipo seleccionado:', type);
    console.log('Total categorías:', allCategories.length);

    if (!type || type === 'TRANSFER') {
      return allCategories;
    }

    const filtered = allCategories.filter(c => {
      if (type === 'INCOME') {
        return c.type === 'INCOME' || c.type === 'BOTH';
      }
      if (type === 'EXPENSE') {
        return c.type === 'EXPENSE' || c.type === 'BOTH';
      }
      return true;
    });

    console.log('Categorías filtradas:', filtered.length);
    return filtered;
  });

  showFromAccount = computed(() => {
    const type = this.form?.get('type')?.value;
    return type === 'EXPENSE' || type === 'TRANSFER';
  });

  showToAccount = computed(() => {
    const type = this.form?.get('type')?.value;
    return type === 'INCOME' || type === 'TRANSFER';
  });

  constructor() {
    // Efecto para monitorear cambios en los datos (debug)
    effect(() => {
      const cats = this.categories();
      const methods = this.paymentMethods();
      const accts = this.accounts();

      console.log('=== Datos cargados ===');
      console.log('Categorías:', cats.length);
      console.log('Métodos de pago:', methods.length);
      console.log('Cuentas:', accts.length);
    });
  }

  ngOnInit(): void {
    // Cargar datos - los servicios internamente actualizan sus signals
    this.loadAllData();

    // Check if editing
    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.transactionId.set(id);
      this.loadTransaction(id);
    }

    this.onTypeChange();
  }

  /**
   * Cargar todos los datos necesarios
   * Los servicios usan tap() para actualizar sus signals internos
   */
  private loadAllData(): void {
    // Cargar cuentas - el servicio actualiza _accounts signal internamente
    this.accountService.getAll().subscribe({
      next: () => console.log('Cuentas cargadas correctamente'),
      error: (err) => console.error('Error cargando cuentas:', err)
    });

    // Cargar categorías - el servicio actualiza _categories signal internamente
    this.categoryService.getAll(false).subscribe({
      next: () => console.log('Categorías cargadas correctamente'),
      error: (err) => console.error('Error cargando categorías:', err)
    });

    // Cargar métodos de pago - el servicio actualiza _paymentMethods signal internamente
    this.paymentMethodService.getAll().subscribe({
      next: () => console.log('Métodos de pago cargados correctamente'),
      error: (err) => console.error('Error cargando métodos de pago:', err)
    });

    this.dataLoaded.set(true);
  }

  loadTransaction(id: string): void {
    this.transactionService.getById(id).subscribe({
      next: (response) => {
        // CORRECCIÓN: Acceder a response.data ya que es ApiResponse<Transaction>
        const transaction = response.data;

        this.form.patchValue({
          type: transaction.type,
          amount: parseFloat(transaction.amount) / 100,
          transactionDate: new Date(transaction.transactionDate),
          fromAccountId: transaction.fromAccountId,
          toAccountId: transaction.toAccountId,
          categoryId: transaction.categoryId,
          paymentMethodId: transaction.paymentMethodId,
          description: transaction.description,
          reference: transaction.reference
        });
        this.onTypeChange();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la transacción'
        });
        this.router.navigate(['/transactions']);
      }
    });
  }

  onTypeChange(): void {
    const type = this.form.get('type')?.value;

    // Reset account validators
    this.form.get('fromAccountId')?.clearValidators();
    this.form.get('toAccountId')?.clearValidators();

    if (type === 'EXPENSE') {
      this.form.get('fromAccountId')?.setValidators(Validators.required);
      this.form.get('toAccountId')?.setValue(null);
    } else if (type === 'INCOME') {
      this.form.get('toAccountId')?.setValidators(Validators.required);
      this.form.get('fromAccountId')?.setValue(null);
    } else if (type === 'TRANSFER') {
      this.form.get('fromAccountId')?.setValidators(Validators.required);
      this.form.get('toAccountId')?.setValidators(Validators.required);
    }

    this.form.get('fromAccountId')?.updateValueAndValidity();
    this.form.get('toAccountId')?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    const formValue = this.form.value;
    const data = {
      ...formValue,
      amount: Math.round(formValue.amount * 100) // Convertir a centavos
    };

    const request = this.isEdit()
        ? this.transactionService.update(this.transactionId()!, data)
        : this.transactionService.create(data);

    request.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.isEdit() ? 'Transacción actualizada' : 'Transacción creada'
        });
        this.router.navigate(['/transactions']);
      },
      error: (error) => {
        console.error('Error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar la transacción'
        });
        this.saving.set(false);
      }
    });
  }

  formatBalance(balance: string | number): string {
    const value = typeof balance === 'string' ? parseFloat(balance) : balance;
    return new Intl.NumberFormat('es', {
      style: 'currency',
      currency: this.currency()
    }).format(value / 100);
  }

  getCategoryTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'INCOME': 'Ingreso',
      'EXPENSE': 'Egreso',
      'BOTH': 'Ambos'
    };
    return labels[type] || type;
  }
}