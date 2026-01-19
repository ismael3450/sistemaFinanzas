import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule],
  template: `
    <p-dialog 
      [(visible)]="visible" 
      [header]="title" 
      [modal]="true" 
      [closable]="true"
      [style]="{ width: '400px' }">
      <div class="flex flex-col items-center text-center py-4">
        @if (icon) {
          <i [class]="'pi ' + icon + ' text-5xl mb-4 ' + iconClass"></i>
        }
        <p class="text-gray-600">{{ message }}</p>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button 
            [label]="cancelLabel" 
            severity="secondary" 
            [outlined]="true"
            (onClick)="onCancel()">
          </p-button>
          <p-button 
            [label]="confirmLabel" 
            [severity]="confirmSeverity"
            [loading]="loading"
            (onClick)="onConfirm()">
          </p-button>
        </div>
      </ng-template>
    </p-dialog>
  `
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = 'Confirmar';
  @Input() message = '¿Está seguro de realizar esta acción?';
  @Input() icon?: string;
  @Input() confirmLabel = 'Confirmar';
  @Input() cancelLabel = 'Cancelar';
  @Input() confirmSeverity: 'primary' | 'danger' | 'warning' = 'primary';
  @Input() loading = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  get iconClass(): string {
    const classes: Record<string, string> = {
      danger: 'text-red-500',
      warning: 'text-yellow-500',
      primary: 'text-blue-500'
    };
    return classes[this.confirmSeverity] || classes['primary'];
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.cancel.emit();
  }
}
