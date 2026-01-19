import { Component, OnInit, signal, computed, inject } from '@angular/core';
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
          <h1>{{ isEdit() ? 'Editar' : 'Nueva' }} Transacción</h1>
        </div>
      </div>

      <div class="max-w-3xl">
        <p-card>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <!-- Transaction Type -->
            <div class="form-group mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Transacción</label>
              <p-selectButton 
                [options]="typeOptions" 
                formControlName="type"
                optionLabel="label"
                optionValue="value"
                (onChange)="onTypeChange()">
              </p-selectButton>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Amount -->
              <div class="form-group">
                <label for="amount">Monto *</label>
                <p-inputNumber 
                  id="amount"
                  formControlName="amount"
                  [minFractionDigits]="2"
                  [maxFractionDigits]="2"
                  mode="currency"
                  [currency]="currency()"
                  locale="en-US"
                  inputStyleClass="w-full"
                  styleClass="w-full">
                </p-inputNumber>
                @if (form.get('amount')?.hasError('required') && form.get('amount')?.touched) {
                  <small class="error-message">El monto es requerido</small>
                }
                @if (form.get('amount')?.hasError('min') && form.get('amount')?.touched) {
                  <small class="error-message">El monto debe ser mayor a 0</small>
                }
              </div>

              <!-- Transaction Date -->
              <div class="form-group">
                <label for="transactionDate">Fecha *</label>
                <p-calendar 
                  id="transactionDate"
                  formControlName="transactionDate"
                  dateFormat="dd/mm/yy"
                  [showTime]="true"
                  [showIcon]="true"
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
                  styleClass="w-full">
                </p-dropdown>
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
                  styleClass="w-full">
                </p-dropdown>
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
                [label]="isEdit() ? 'Guardar Cambios' : 'Crear Transacción'"
                [loading]="isSaving()"
                [disabled]="form.invalid || isSaving()">
              </p-button>
            </div>
          </form>
        </p-card>
      </div>
    </div>
  `
})
export class TransactionFormComponent implements OnInit {
  // Inyección de dependencias con inject() - PRIMERO
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly accountService = inject(AccountService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly orgService = inject(OrganizationService);
  private readonly messageService = inject(MessageService);

  // Form - inicializado después de inject
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

  // Signals
  isEdit = signal(false);
  isSaving = signal(false);
  transactionId = signal<string | null>(null);

  // Options
  readonly typeOptions = [
    { label: 'Ingreso', value: 'INCOME', icon: 'pi pi-arrow-down' },
    { label: 'Egreso', value: 'EXPENSE', icon: 'pi pi-arrow-up' },
    { label: 'Transferencia', value: 'TRANSFER', icon: 'pi pi-arrows-h' }
  ];

  // Propiedades que dependen de los servicios - DESPUÉS de inject()
  readonly accounts = this.accountService.activeAccounts;
  readonly categories = this.categoryService.activeCategories;
  readonly paymentMethods = this.paymentMethodService.activePaymentMethods;

  // Computed signals
  currency = computed(() => this.orgService.activeOrganization()?.currency || 'USD');

  filteredCategories = computed(() => {
    const type = this.form?.get('type')?.value;
    return this.categories().filter(c => {
      if (type === 'INCOME') return c.type === 'INCOME' || c.type === 'BOTH';
      if (type === 'EXPENSE') return c.type === 'EXPENSE' || c.type === 'BOTH';
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
    // Load data
    this.accountService.getAll().subscribe();
    this.categoryService.getAll().subscribe();
    this.paymentMethodService.getAll().subscribe();

    // Check if editing
    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.transactionId.set(id);
      this.loadTransaction(id);
    }

    this.onTypeChange();
  }

  loadTransaction(id: string): void {
    this.transactionService.getById(id).subscribe({
      next: (response) => {
        const txn = response.data;
        this.form.patchValue({
          type: txn.type,
          amount: parseFloat(txn.amount) / 100,
          transactionDate: new Date(txn.transactionDate),
          fromAccountId: txn.fromAccountId,
          toAccountId: txn.toAccountId,
          categoryId: txn.categoryId,
          paymentMethodId: txn.paymentMethodId,
          description: txn.description,
          reference: txn.reference
        });
        this.onTypeChange();
      }
    });
  }

  onTypeChange(): void {
    const type = this.form.get('type')?.value;
    const fromCtrl = this.form.get('fromAccountId');
    const toCtrl = this.form.get('toAccountId');

    // Reset validators
    fromCtrl?.clearValidators();
    toCtrl?.clearValidators();

    if (type === 'INCOME') {
      toCtrl?.setValidators(Validators.required);
      fromCtrl?.setValue(null);
    } else if (type === 'EXPENSE') {
      fromCtrl?.setValidators(Validators.required);
      toCtrl?.setValue(null);
    } else if (type === 'TRANSFER') {
      fromCtrl?.setValidators(Validators.required);
      toCtrl?.setValidators(Validators.required);
    }

    fromCtrl?.updateValueAndValidity();
    toCtrl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    const formValue = this.form.value;
    const data = {
      ...formValue,
      amount: Math.round(formValue.amount * 100) // Convert to minor units
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
      error: () => {
        this.isSaving.set(false);
      }
    });
  }

  formatBalance(balance: string): string {
    const value = parseFloat(balance) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency()
    }).format(value);
  }
}
