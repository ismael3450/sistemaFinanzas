import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { PaymentMethodService, OrganizationService } from '../../core/services';
import { PaymentMethod } from '../../core/models';

@Component({
    selector: 'app-payment-methods',
    standalone: true,
    imports: [
        CommonModule,
        CardModule,
        TableModule,
        ButtonModule,
        TagModule,
        DialogModule,
        InputTextModule,
        TooltipModule,
        FormsModule,
        ReactiveFormsModule
    ],
    template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Métodos de Pago</h1>
          <p class="text-sm text-gray-500 mt-1">
              Define cómo se registrará una transacción: efectivo, transferencia, tarjeta u otro medio.
          </p>
        <p-button
            icon="pi pi-plus"
            label="Nuevo Método"
            [disabled]="!canManagePaymentMethods()"
            [pTooltip]="!canManagePaymentMethods() ? 'No tienes permisos para gestionar métodos de pago' : ''"
            [tooltipDisabled]="canManagePaymentMethods()"
            (onClick)="openDialog()">
        </p-button>
      </div>

      @if (!canManagePaymentMethods()) {
        <div class="mb-4 rounded border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <i class="pi pi-info-circle mr-2"></i>
          Solo los roles con permisos de finanzas pueden crear o editar métodos de pago.
        </div>
      }

      <p-card>
        <p-table [value]="paymentMethods()" [rowHover]="true" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th class="text-center">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-method>
            <tr>
              <td class="font-medium">{{ method.name }}</td>
              <td class="text-gray-600">{{ method.description || 'Sin descripción' }}</td>
              <td>
                <p-tag
                    [value]="method.isActive ? 'Activo' : 'Inactivo'"
                    [severity]="method.isActive ? 'success' : 'danger'">
                </p-tag>
              </td>
              <td class="text-center">
                <button
                    pButton
                    icon="pi pi-pencil"
                    class="p-button-text p-button-sm"
                    [disabled]="!canManagePaymentMethods()"
                    [pTooltip]="!canManagePaymentMethods() ? 'No tienes permisos para editar' : 'Editar'"
                    [tooltipDisabled]="canManagePaymentMethods()"
                    (click)="editMethod(method)">
                </button>
                <button
                    pButton
                    [icon]="method.isActive ? 'pi pi-eye-slash' : 'pi pi-eye'"
                    class="p-button-text p-button-sm"
                    [disabled]="!canManagePaymentMethods()"
                    [pTooltip]="method.isActive ? 'Desactivar' : 'Activar'"
                    [tooltipDisabled]="!canManagePaymentMethods()"
                    (click)="toggleActive(method)">
                </button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="4" class="text-center py-8">
                <i class="pi pi-credit-card text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No hay métodos de pago registrados</p>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <p-dialog
        [(visible)]="dialogVisible"
        [header]="editingMethod ? 'Editar Método' : 'Nuevo Método'"
        [modal]="true"
        [style]="{ width: '450px' }"
        [draggable]="false">
      <form [formGroup]="form" (ngSubmit)="saveMethod()">
        <div class="form-group">
          <label>Nombre *</label>
          <input pInputText formControlName="name" class="w-full" placeholder="Ej: Transferencia bancaria">
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <input pInputText formControlName="description" class="w-full" placeholder="Opcional">
            <small class="text-gray-500">
                Ejemplo: "Transferencias desde banca en línea" o "Pagos con tarjeta corporativa".
            </small>
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
              [label]="editingMethod ? 'Guardar' : 'Crear'"
              [loading]="saving()"
              [disabled]="form.invalid">
          </p-button>
        </div>
      </form>
    </p-dialog>
  `
})
export class PaymentMethodsComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly messageService = inject(MessageService);
    private readonly paymentMethodService = inject(PaymentMethodService);
    private readonly orgService = inject(OrganizationService);

    dialogVisible = false;
    editingMethod: PaymentMethod | null = null;
    saving = signal(false);

    readonly paymentMethods = this.paymentMethodService.paymentMethods;
    readonly canManagePaymentMethods = computed(() => this.orgService.canManageFinances());

    form: FormGroup = this.fb.group({
        name: ['', Validators.required],
        description: ['']
    });

    ngOnInit(): void {
        this.loadMethods();
    }

    private loadMethods(): void {
        this.paymentMethodService.getAll(true).subscribe({
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar los métodos de pago'
                });
            }
        });
    }

    openDialog(): void {
        if (!this.canManagePaymentMethods()) return;
        this.editingMethod = null;
        this.form.reset();
        this.dialogVisible = true;
    }

    editMethod(method: PaymentMethod): void {
        if (!this.canManagePaymentMethods()) return;
        this.editingMethod = method;
        this.form.patchValue({
            name: method.name,
            description: method.description
        });
        this.dialogVisible = true;
    }

    saveMethod(): void {
        if (this.form.invalid) return;
        this.saving.set(true);

        const payload = this.form.value;
        const request = this.editingMethod
            ? this.paymentMethodService.update(this.editingMethod.id, payload)
            : this.paymentMethodService.create(payload);

        request.subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editingMethod ? 'Método actualizado' : 'Método creado'
                });
                this.dialogVisible = false;
                this.saving.set(false);
            },
            error: () => {
                this.saving.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo guardar el método de pago'
                });
            }
        });
    }

    toggleActive(method: PaymentMethod): void {
        if (!this.canManagePaymentMethods()) return;
        const request = method.isActive
            ? this.paymentMethodService.deactivate(method.id)
            : this.paymentMethodService.activate(method.id);

        request.subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: method.isActive ? 'Método desactivado' : 'Método activado'
                });
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo actualizar el estado'
                });
            }
        });
    }
}
