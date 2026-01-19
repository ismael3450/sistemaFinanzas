import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <i [class]="'pi ' + icon + ' text-6xl text-gray-300 mb-4'"></i>
      <h3 class="text-lg font-semibold text-gray-700 mb-2">{{ title }}</h3>
      <p class="text-gray-500 mb-6 max-w-md">{{ message }}</p>
      @if (actionLabel) {
        <p-button 
          [label]="actionLabel" 
          [icon]="actionIcon"
          (onClick)="onAction()">
        </p-button>
      }
    </div>
  `
})
export class EmptyStateComponent {
  @Input() icon = 'pi-inbox';
  @Input() title = 'Sin datos';
  @Input() message = 'No hay datos disponibles para mostrar';
  @Input() actionLabel?: string;
  @Input() actionIcon = 'pi pi-plus';
  @Input() action?: () => void;

  onAction(): void {
    this.action?.();
  }
}
