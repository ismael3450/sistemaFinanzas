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
    <div class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button
            pButton
            icon="pi pi-arrow-left"
            class="p-button-text p-button-rounded"
            routerLink="/transactions">
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-900">{{ isEdit() ? 'Editar Transacción' : 'Nueva Transacción' }}</h1>
          <p class="text-sm text-gray-500 mt-0.5">{{ isEdit() ? 'Modifica los datos de la transacción' : 'Registra un nuevo movimiento financiero' }}</p>
        </div>
      </div>

      <!-- Form Card -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">

          <!-- Transaction Type Section -->
          <div class="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white">
            <label class="block text-sm font-semibold text-gray-700 mb-3">Tipo de Transacción</label>
            <div class="grid grid-cols-3 gap-3">
              @for (type of transactionTypes; track type.value) {
                <button
                    type="button"
                    class="relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2"
                    [class]="getTypeButtonClass(type.value)"
                    (click)="selectType(type.value)">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                       [class]="getTypeIconClass(type.value)">
                    <i [class]="'pi ' + type.icon + ' text-xl'"></i>
                  </div>
                  <span class="font-semibold text-sm">{{ type.label }}</span>
                  @if (form.get('type')?.value === type.value) {
                    <div class="absolute top-2 right-2">
                      <i class="pi pi-check-circle text-sm" [class]="type.value === 'INCOME' ? 'text-emerald-500' : type.value === 'EXPENSE' ? 'text-rose-500' : 'text-indigo-500'"></i>
                    </div>
                  }
                </button>
              }
            </div>
          </div>

          <!-- Main Form Fields -->
          <div class="p-6 space-y-5">

            <!-- Amount and Date Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="form-group">
                <label for="amount" class="flex items-center gap-2">
                  <i class="pi pi-dollar text-gray-400 text-sm"></i>
                  Monto <span class="text-rose-500">*</span>
                </label>
                <p-inputNumber
                    id="amount"
                    formControlName="amount"
                    mode="currency"
                    [currency]="currency()"
                    inputStyleClass="w-full text-lg font-semibold"
                    styleClass="w-full"
                    [min]="0.01"
                    placeholder="0.00">
                </p-inputNumber>
                @if (form.get('amount')?.hasError('required') && form.get('amount')?.touched) {
                  <small class="error-message"><i class="pi pi-exclamation-circle"></i> El monto es requerido</small>
                }
              </div>

              <div class="form-group">
                <label for="transactionDate" class="flex items-center gap-2">
                  <i class="pi pi-calendar text-gray-400 text-sm"></i>
                  Fecha <span class="text-rose-500">*</span>
                </label>
                <p-calendar
                    id="transactionDate"
                    formControlName="transactionDate"
                    dateFormat="dd/mm/yy"
                    [showTime]="true"
                    [showIcon]="true"
                    appendTo="body"
                    styleClass="w-full"
                    inputStyleClass="w-full">
                </p-calendar>
                @if (form.get('transactionDate')?.hasError('required') && form.get('transactionDate')?.touched) {
                  <small class="error-message"><i class="pi pi-exclamation-circle"></i> La fecha es requerida</small>
                }
              </div>
            </div>

            <!-- Account Selection -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              @if (showFromAccount()) {
                <div class="form-group">
                  <label for="fromAccountId" class="flex items-center gap-2">
                    <i class="pi pi-wallet text-gray-400 text-sm"></i>
                    Cuenta Origen <span class="text-rose-500">*</span>
                  </label>
                  <p-dropdown
                      id="fromAccountId"
                      formControlName="fromAccountId"
                      [options]="accounts()"
                      optionLabel="name"
                      optionValue="id"
                      placeholder="Seleccione cuenta"
                      [filter]="true"
                      appendTo="body"
                      styleClass="w-full">
                    <ng-template pTemplate="selectedItem" let-account>
                      @if (account) {
                        <div class="flex items-center gap-2">
                          <div class="w-6 h-6 rounded-md flex items-center justify-center"
                               [style.background-color]="getColorWithOpacity(account.color || '#6366f1', 0.15)">
                            <i class="pi pi-wallet text-xs" [style.color]="account.color || '#6366f1'"></i>
                          </div>
                          <span>{{ account.name }}</span>
                        </div>
                      }
                    </ng-template>
                    <ng-template pTemplate="item" let-account>
                      <div class="flex justify-between items-center w-full py-1">
                        <div class="flex items-center gap-2">
                          <div class="w-7 h-7 rounded-lg flex items-center justify-center"
                               [style.background-color]="getColorWithOpacity(account.color || '#6366f1', 0.15)">
                            <i class="pi pi-wallet text-xs" [style.color]="account.color || '#6366f1'"></i>
                          </div>
                          <span class="font-medium">{{ account.name }}</span>
                        </div>
                        <span class="text-gray-500 text-sm font-mono">{{ formatBalance(account.currentBalance) }}</span>
                      </div>
                    </ng-template>
                  </p-dropdown>
                  @if (form.get('fromAccountId')?.hasError('required') && form.get('fromAccountId')?.touched) {
                    <small class="error-message"><i class="pi pi-exclamation-circle"></i> La cuenta origen es requerida</small>
                  }
                </div>
              }

              @if (showToAccount()) {
                <div class="form-group">
                  <label for="toAccountId" class="flex items-center gap-2">
                    <i class="pi pi-wallet text-gray-400 text-sm"></i>
                    Cuenta Destino <span class="text-rose-500">*</span>
                  </label>
                  <p-dropdown
                      id="toAccountId"
                      formControlName="toAccountId"
                      [options]="accounts()"
                      optionLabel="name"
                      optionValue="id"
                      placeholder="Seleccione cuenta"
                      [filter]="true"
                      appendTo="body"
                      styleClass="w-full">
                    <ng-template pTemplate="selectedItem" let-account>
                      @if (account) {
                        <div class="flex items-center gap-2">
                          <div class="w-6 h-6 rounded-md flex items-center justify-center"
                               [style.background-color]="getColorWithOpacity(account.color || '#6366f1', 0.15)">
                            <i class="pi pi-wallet text-xs" [style.color]="account.color || '#6366f1'"></i>
                          </div>
                          <span>{{ account.name }}</span>
                        </div>
                      }
                    </ng-template>
                    <ng-template pTemplate="item" let-account>
                      <div class="flex justify-between items-center w-full py-1">
                        <div class="flex items-center gap-2">
                          <div class="w-7 h-7 rounded-lg flex items-center justify-center"
                               [style.background-color]="getColorWithOpacity(account.color || '#6366f1', 0.15)">
                            <i class="pi pi-wallet text-xs" [style.color]="account.color || '#6366f1'"></i>
                          </div>
                          <span class="font-medium">{{ account.name }}</span>
                        </div>
                        <span class="text-gray-500 text-sm font-mono">{{ formatBalance(account.currentBalance) }}</span>
                      </div>
                    </ng-template>
                  </p-dropdown>
                  @if (form.get('toAccountId')?.hasError('required') && form.get('toAccountId')?.touched) {
                    <small class="error-message"><i class="pi pi-exclamation-circle"></i> La cuenta destino es requerida</small>
                  }
                </div>
              }
            </div>

            <!-- Category and Payment Method Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="form-group">
                <label for="categoryId" class="flex items-center gap-2">
                  <i class="pi pi-tag text-gray-400 text-sm"></i>
                  Categoría
                </label>
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
                    emptyMessage="No hay categorías disponibles"
                    styleClass="w-full">
                  <ng-template pTemplate="selectedItem" let-category>
                    @if (category) {
                      <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full" [style.background-color]="category.color || '#6b7280'"></span>
                        <span>{{ category.name }}</span>
                      </div>
                    }
                  </ng-template>
                  <ng-template pTemplate="item" let-category>
                    <div class="flex items-center justify-between w-full py-1">
                      <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full" [style.background-color]="category.color || '#6b7280'"></span>
                        <span>{{ category.name }}</span>
                      </div>
                      <span class="text-xs px-2 py-0.5 rounded-full"
                            [class]="getCategoryTypeClass(category.type)">
                        {{ getCategoryTypeLabel(category.type) }}
                      </span>
                    </div>
                  </ng-template>
                </p-dropdown>
              </div>

              <div class="form-group">
                <label for="paymentMethodId" class="flex items-center gap-2">
                  <i class="pi pi-credit-card text-gray-400 text-sm"></i>
                  Método de Pago
                </label>
                <p-dropdown
                    id="paymentMethodId"
                    formControlName="paymentMethodId"
                    [options]="paymentMethods()"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Seleccione método"
                    [showClear]="true"
                    appendTo="body"
                    emptyMessage="No hay métodos disponibles"
                    styleClass="w-full">
                </p-dropdown>
              </div>
            </div>

            <!-- Description -->
            <div class="form-group">
              <label for="description" class="flex items-center gap-2">
                <i class="pi pi-align-left text-gray-400 text-sm"></i>
                Descripción
              </label>
              <textarea
                  pInputTextarea
                  id="description"
                  formControlName="description"
                  [rows]="3"
                  placeholder="Describe el propósito de esta transacción..."
                  class="w-full">
              </textarea>
            </div>

            <!-- Reference -->
            <div class="form-group">
              <label for="reference" class="flex items-center gap-2">
                <i class="pi pi-hashtag text-gray-400 text-sm"></i>
                Número de Referencia
              </label>
              <input
                  pInputText
                  id="reference"
                  formControlName="reference"
                  placeholder="Ej: FAC-001, CHK-123, REC-456"
                  class="w-full">
            </div>
          </div>

          <!-- Actions Footer -->
          <div class="flex justify-between items-center gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
            <p-button
                label="Cancelar"
                severity="secondary"
                [outlined]="true"
                routerLink="/transactions"
                styleClass="px-5">
            </p-button>
            <p-button
                type="submit"
                [label]="isEdit() ? 'Actualizar Transacción' : 'Guardar Transacción'"
                [loading]="saving()"
                [disabled]="form.invalid"
                [icon]="isEdit() ? 'pi pi-check' : 'pi pi-save'"
                styleClass="px-5">
            </p-button>
          </div>
        </form>
      </div>
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

      .p-inputnumber-input {
        font-size: 1.125rem !important;
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
    { label: 'Ingreso', value: 'INCOME', icon: 'pi-arrow-down-left', color: 'emerald' },
    { label: 'Egreso', value: 'EXPENSE', icon: 'pi-arrow-up-right', color: 'rose' },
    { label: 'Transferencia', value: 'TRANSFER', icon: 'pi-arrow-right-arrow-left', color: 'indigo' }
  ];

  readonly accounts = this.accountService.activeAccounts;
  readonly categories = this.categoryService.activeCategories;
  readonly paymentMethods = this.paymentMethodService.activePaymentMethods;

  currency = computed(() => this.orgService.activeOrganization()?.currency || 'USD');

  filteredCategories = computed(() => {
    const type = this.form?.get('type')?.value;
    const allCategories = this.categories();

    if (!type || type === 'TRANSFER') {
      return allCategories;
    }

    return allCategories.filter(c => {
      if (type === 'INCOME') {
        return c.type === 'INCOME' || c.type === 'BOTH';
      }
      if (type === 'EXPENSE') {
        return c.type === 'EXPENSE' || c.type === 'BOTH';
      }
      return true;
    });
  });

  showFromAccount = computed(() => {
    const type = this.form?.get('type')?.value;
    return type === 'EXPENSE' || type === 'TRANSFER';
  });

  showToAccount = computed(() => {
    const type = this.form?.get('type')?.value;
    return type === 'INCOME' || type === 'TRANSFER';
  });

  ngOnInit(): void {
    this.loadAllData();

    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.transactionId.set(id);
      this.loadTransaction(id);
    }

    this.onTypeChange();
  }

  private loadAllData(): void {
    this.accountService.getAll().subscribe({
      error: (err) => console.error('Error cargando cuentas:', err)
    });

    this.categoryService.getAll(false).subscribe({
      error: (err) => console.error('Error cargando categorías:', err)
    });

    this.paymentMethodService.getAll().subscribe({
      error: (err) => console.error('Error cargando métodos de pago:', err)
    });

    this.dataLoaded.set(true);
  }

  loadTransaction(id: string): void {
    this.transactionService.getById(id).subscribe({
      next: (response) => {
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

  selectType(type: string): void {
    this.form.patchValue({ type });
    this.onTypeChange();
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
      amount: Math.round(formValue.amount * 100)
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
          detail: error.error?.message || 'No se pudo guardar la transacción'
        });
        this.saving.set(false);
      }
    });
  }

  getTypeButtonClass(type: string): string {
    const isSelected = this.form.get('type')?.value === type;

    if (type === 'INCOME') {
      return isSelected
          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
          : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/50';
    }
    if (type === 'EXPENSE') {
      return isSelected
          ? 'border-rose-500 bg-rose-50 text-rose-700'
          : 'border-gray-200 bg-white text-gray-600 hover:border-rose-200 hover:bg-rose-50/50';
    }
    return isSelected
        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
        : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/50';
  }

  getTypeIconClass(type: string): string {
    const isSelected = this.form.get('type')?.value === type;

    if (type === 'INCOME') {
      return isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500';
    }
    if (type === 'EXPENSE') {
      return isSelected ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500';
    }
    return isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500';
  }

  formatBalance(balance: string | number): string {
    const value = typeof balance === 'string' ? parseFloat(balance) : balance;
    return new Intl.NumberFormat('es', {
      style: 'currency',
      currency: this.currency()
    }).format(value / 100);
  }

  getColorWithOpacity(color: string, opacity: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  getCategoryTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'INCOME': 'Ingreso',
      'EXPENSE': 'Egreso',
      'BOTH': 'Ambos'
    };
    return labels[type] || type;
  }

  getCategoryTypeClass(type: string): string {
    const classes: Record<string, string> = {
      'INCOME': 'bg-emerald-100 text-emerald-700',
      'EXPENSE': 'bg-rose-100 text-rose-700',
      'BOTH': 'bg-indigo-100 text-indigo-700'
    };
    return classes[type] || 'bg-gray-100 text-gray-700';
  }
}