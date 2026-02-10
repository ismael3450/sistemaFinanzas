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
import { ColorPickerModule } from 'primeng/colorpicker';
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
    ColorPickerModule, FormsModule, ReactiveFormsModule, ConfirmDialogModule, MoneyPipe
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Cuentas</h1>
        <p class="text-sm text-gray-500 mt-1">
          Administra dónde se mueve tu dinero: caja, bancos, tarjetas o cuentas de ahorro.
        </p>
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
        <p-table
            [value]="accounts()"
            [rowHover]="true"
            styleClass="p-datatable-sm accounts-table"
            [tableStyle]="{ 'min-width': '32rem' }">
          <ng-template pTemplate="header">
            <tr>
              <th class="min-w-[200px]">Nombre</th>
              <th class="min-w-[100px] hidden sm:table-cell">Tipo</th>
              <th class="text-right min-w-[120px] hidden md:table-cell">Balance Inicial</th>
              <th class="text-right min-w-[120px]">Balance Actual</th>
              <th class="min-w-[90px] hidden sm:table-cell">Estado</th>
              <th class="text-center min-w-[100px]">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-account>
            <tr>
              <td class="align-top">
                <div class="flex items-center gap-3">
                  <!-- CORRECCIÓN: Tamaño fijo para el indicador de color -->
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                       [style.background-color]="getColorWithOpacity(account.color || '#3b82f6', 0.2)">
                    <i [class]="'pi ' + (account.icon || 'pi-wallet') + ' text-sm'"
                       [style.color]="account.color || '#3b82f6'"></i>
                  </div>
                  <div class="min-w-0">
                    <p class="font-semibold text-gray-800 leading-snug break-words">{{ account.name }}</p>
                    <p class="text-xs text-gray-500 truncate">{{ account.description || 'Sin descripción' }}</p>
                  </div>
                </div>
              </td>
              <td class="hidden sm:table-cell">{{ getTypeLabel(account.accountType) }}</td>
              <td class="text-right tabular-nums hidden md:table-cell">{{ account.initialBalance | money:account.currency }}</td>
              <td class="text-right tabular-nums font-semibold"
                  [class.text-green-600]="Number(account.currentBalance) >= 0"
                  [class.text-red-600]="Number(account.currentBalance) < 0">
                {{ account.currentBalance | money:account.currency }}
              </td>
              <td class="hidden sm:table-cell">
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

    <!-- Dialog - CORREGIDO: Mayor altura y mejor manejo del color picker -->
    <p-dialog
        [(visible)]="dialogVisible"
        [header]="editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'"
        [modal]="true"
        [style]="{ width: '500px', maxHeight: '90vh' }"
        [contentStyle]="{ 'overflow-y': 'auto', 'max-height': '70vh' }"
        [draggable]="false"
        [resizable]="false">
      <form [formGroup]="form" (ngSubmit)="saveAccount()">
        <div class="form-group">
          <label>Nombre *</label>
          <input pInputText formControlName="name" class="w-full">
        </div>

        <div class="form-group">
          <label>Tipo de Cuenta *</label>
          <p-dropdown
              [options]="accountTypes"
              formControlName="accountType"
              optionLabel="label"
              optionValue="value"
              appendTo="body"
              styleClass="w-full">
          </p-dropdown>
          <small class="text-gray-500">
            El tipo ayuda a identificar si es una cuenta bancaria, efectivo, tarjeta u otro origen de fondos.
          </small>
        </div>

        <div class="form-group">
          <label>Balance Inicial</label>
          <p-inputNumber
              formControlName="initialBalance"
              mode="currency"
              [currency]="currency()"
              inputStyleClass="w-full"
              styleClass="w-full">
          </p-inputNumber>
        </div>

        <div class="form-group">
          <label>Descripción</label>
          <input pInputText formControlName="description" class="w-full">
        </div>

        <!-- CORRECCIÓN: Color picker mejorado -->
        <div class="form-group">
          <label>Color de la Cuenta</label>
          <div class="flex items-center gap-3">
            <!-- Preview del color -->
            <div
                class="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer flex-shrink-0"
                [style.background-color]="form.get('color')?.value || '#3b82f6'"
                (click)="colorPickerVisible = true">
            </div>

            <!-- Input de color manual -->
            <input
                pInputText
                formControlName="color"
                placeholder="#3b82f6"
                class="w-28"
                maxlength="7">

            <!-- Color picker nativo (más confiable) -->
            <input
                type="color"
                [value]="form.get('color')?.value || '#3b82f6'"
                (input)="onColorChange($event)"
                class="w-10 h-10 cursor-pointer border-0 p-0 bg-transparent">
          </div>

          <!-- Colores predefinidos -->
          <div class="flex flex-wrap gap-2 mt-3">
            @for (color of predefinedColors; track color) {
              <button
                  type="button"
                  class="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                  [style.background-color]="color"
                  [class.border-gray-800]="form.get('color')?.value === color"
                  [class.border-transparent]="form.get('color')?.value !== color"
                  (click)="selectColor(color)">
              </button>
            }
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6 pt-4 border-t">
          <p-button
              label="Cancelar"
              severity="secondary"
              [outlined]="true"
              (onClick)="dialogVisible = false">
          </p-button>
          <p-button
              type="submit"
              [label]="editingAccount ? 'Guardar' : 'Crear'"
              [loading]="saving()">
          </p-button>
        </div>
      </form>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    :host ::ng-deep {
      /* Asegurar que el dropdown se muestre correctamente */
      .p-dropdown-panel {
        z-index: 9999 !important;
      }

      .accounts-table .p-datatable-thead > tr > th,
      .accounts-table .p-datatable-tbody > tr > td {
        padding: 0.85rem 1rem;
        vertical-align: top;
      }

      /* Color picker nativo styling */
      input[type="color"] {
        -webkit-appearance: none;
        border: none;

        &::-webkit-color-swatch-wrapper {
          padding: 0;
        }

        &::-webkit-color-swatch {
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
        }
      }
    }
  `]
})
export class AccountsListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private orgService = inject(OrganizationService);
  private messageService = inject(MessageService);
  private confirmService = inject(ConfirmationService);

  accounts: Signal<Account[]> = this.accountService.accounts;

  dialogVisible = false;
  colorPickerVisible = false;
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

  // Colores predefinidos para selección rápida
  predefinedColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#a855f7', // purple
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
      color: account.color || '#3b82f6'
    });
    this.dialogVisible = true;
  }

  saveAccount() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const data = {
      ...this.form.value,
      initialBalance: Math.round(this.form.value.initialBalance * 100)
    };

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
    const action = account.isActive
        ? this.accountService.deactivate(account.id)
        : this.accountService.activate(account.id);

    action.subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estado actualizado' })
    });
  }

  getTypeLabel(type: string): string {
    return this.accountTypes.find(t => t.value === type)?.label || type;
  }

  // CORRECCIÓN: Función para obtener color con opacidad
  getColorWithOpacity(color: string, opacity: number): string {
    // Convertir hex a rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Manejar cambio de color desde input nativo
  onColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.patchValue({ color: input.value });
  }

  // Seleccionar color predefinido
  selectColor(color: string): void {
    this.form.patchValue({ color });
  }

  protected readonly Number = Number;
}