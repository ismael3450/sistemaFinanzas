import { Component, OnInit, signal, inject, type Signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AccountService, OrganizationService } from '../../../core/services';
import { Account } from '../../../core/models';
import { MoneyPipe } from '../../../shared/pipes';

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, CardModule, TableModule, ButtonModule, TagModule,
    TooltipModule, DialogModule, InputTextModule, DropdownModule, InputNumberModule,
    FormsModule, ReactiveFormsModule, ConfirmDialogModule, MoneyPipe
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Cuentas</h1>
        <p-button icon="pi pi-plus" label="Nueva Cuenta" (onClick)="openDialog()"></p-button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div class="stat-card">
          <p class="stat-label">Total de Cuentas</p>
          <p class="stat-value">{{ accounts().length }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Balance Total</p>
          <p class="stat-value text-primary-600">{{ totalBalance() | money:currency() }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Cuentas Activas</p>
          <p class="stat-value text-green-600">{{ activeCount() }}</p>
        </div>
      </div>

      <!-- Table -->
      <p-card>
        <p-table [value]="accounts()" [rowHover]="true" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th class="text-right">Balance Inicial</th>
              <th class="text-right">Balance Actual</th>
              <th>Estado</th>
              <th class="text-center">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-account>
            <tr>
              <td>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg flex items-center justify-center" 
                       [style.background-color]="account.color || '#3b82f6'" 
                       style="opacity: 0.2">
                    <i class="pi" [class]="account.icon || 'pi-wallet'" 
                       [style.color]="account.color || '#3b82f6'"></i>
                  </div>
                  <div>
                    <p class="font-medium">{{ account.name }}</p>
                    <p class="text-xs text-gray-500">{{ account.description }}</p>
                  </div>
                </div>
              </td>
              <td>{{ getTypeLabel(account.accountType) }}</td>
              <td class="text-right tabular-nums">{{ account.initialBalance | money:account.currency }}</td>
              <td class="text-right tabular-nums font-semibold" 
                  [class.text-green-600]="Number(account.currentBalance) >= 0"
                  [class.text-red-600]="Number(account.currentBalance) < 0">
                {{ account.currentBalance | money:account.currency }}
              </td>
              <td>
                <p-tag [value]="account.isActive ? 'Activa' : 'Inactiva'" 
                       [severity]="account.isActive ? 'success' : 'danger'"></p-tag>
              </td>
              <td class="text-center">
                <button pButton icon="pi pi-pencil" class="p-button-text p-button-sm" 
                        pTooltip="Editar" (click)="editAccount(account)"></button>
                <button pButton [icon]="account.isActive ? 'pi pi-eye-slash' : 'pi pi-eye'" 
                        class="p-button-text p-button-sm"
                        [pTooltip]="account.isActive ? 'Desactivar' : 'Activar'"
                        (click)="toggleActive(account)"></button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center py-8">
                <i class="pi pi-wallet text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No hay cuentas registradas</p>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog -->
    <p-dialog [(visible)]="dialogVisible" [header]="editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'" 
              [modal]="true" [style]="{ width: '450px' }">
      <form [formGroup]="form" (ngSubmit)="saveAccount()">
        <div class="form-group">
          <label>Nombre *</label>
          <input pInputText formControlName="name" class="w-full">
        </div>
        <div class="form-group">
          <label>Tipo de Cuenta *</label>
          <p-dropdown [options]="accountTypes" formControlName="accountType" 
                      optionLabel="label" optionValue="value" styleClass="w-full"></p-dropdown>
        </div>
        <div class="form-group">
          <label>Balance Inicial</label>
          <p-inputNumber formControlName="initialBalance" mode="currency" [currency]="currency()" 
                         inputStyleClass="w-full" styleClass="w-full"></p-inputNumber>
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <input pInputText formControlName="description" class="w-full">
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="dialogVisible = false"></p-button>
          <p-button type="submit" [label]="editingAccount ? 'Guardar' : 'Crear'" [loading]="saving()"></p-button>
        </div>
      </form>
    </p-dialog>
    <p-confirmDialog></p-confirmDialog>
  `
})
export class AccountsListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private orgService = inject(OrganizationService);
  private messageService = inject(MessageService);
  private confirmService = inject(ConfirmationService);

  accounts: Signal<Account[]> = this.accountService.accounts;

  dialogVisible = false;
  editingAccount: Account | null = null;
  saving = signal(false);

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    accountType: ['BANK', Validators.required],
    initialBalance: [0],
    description: [''],
    color: ['#3b82f6']
  });

  accountTypes = [
    { label: 'Efectivo', value: 'CASH' },
    { label: 'Banco', value: 'BANK' },
    { label: 'Tarjeta de Crédito', value: 'CREDIT_CARD' },
    { label: 'Inversión', value: 'INVESTMENT' },
    { label: 'Otro', value: 'OTHER' }
  ];

  currency = computed(() => this.orgService.activeOrganization()?.currency || 'USD');

  totalBalance = computed(() =>
      this.accounts().reduce((sum, a) => sum + Number(a.currentBalance), 0)
  );

  activeCount = computed(() => this.accounts().filter(a => a.isActive).length);

  ngOnInit() {
    this.accountService.getAll(true).subscribe();
  }

  openDialog() {
    this.editingAccount = null;
    this.form.reset({ accountType: 'BANK', initialBalance: 0, color: '#3b82f6' });
    this.dialogVisible = true;
  }

  editAccount(account: Account) {
    this.editingAccount = account;
    this.form.patchValue({
      name: account.name,
      accountType: account.accountType,
      initialBalance: parseFloat(account.initialBalance) / 100,
      description: account.description,
      color: account.color
    });
    this.dialogVisible = true;
  }

  saveAccount() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const data = { ...this.form.value, initialBalance: Math.round(this.form.value.initialBalance * 100) };
    
    const request = this.editingAccount 
      ? this.accountService.update(this.editingAccount.id, data)
      : this.accountService.create(data);

    request.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Cuenta guardada' });
        this.dialogVisible = false;
        this.saving.set(false);
      },
      error: () => this.saving.set(false)
    });
  }

  toggleActive(account: Account) {
    const action = account.isActive ? this.accountService.deactivate(account.id) : this.accountService.activate(account.id);
    action.subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estado actualizado' })
    });
  }

  getTypeLabel(type: string): string {
    return this.accountTypes.find(t => t.value === type)?.label || type;
  }

  protected readonly Number = Number;
}
