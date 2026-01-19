import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card" [class]="colorClass">
      <div class="flex items-start justify-between">
        <div>
          <p class="stat-label">{{ label }}</p>
          <p class="stat-value" [class]="valueClass">{{ value }}</p>
          @if (subtitle) {
            <p class="text-xs text-gray-400 mt-1">{{ subtitle }}</p>
          }
        </div>
        @if (icon) {
          <div class="p-3 rounded-lg" [class]="iconBgClass">
            <i [class]="'pi ' + icon + ' text-xl ' + iconClass"></i>
          </div>
        }
      </div>
      @if (trend !== undefined) {
        <div class="mt-4 flex items-center text-sm">
          <i [class]="trendIcon" class="mr-1"></i>
          <span [class]="trendClass">{{ trend }}%</span>
          <span class="text-gray-500 ml-1">vs periodo anterior</span>
        </div>
      }
    </div>
  `
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() trend?: number;
  @Input() color: 'default' | 'success' | 'danger' | 'warning' | 'info' = 'default';

  get colorClass(): string {
    return '';
  }

  get valueClass(): string {
    const classes: Record<string, string> = {
      success: 'text-green-600',
      danger: 'text-red-600',
      warning: 'text-yellow-600',
      info: 'text-blue-600',
      default: ''
    };
    return classes[this.color] || '';
  }

  get iconBgClass(): string {
    const classes: Record<string, string> = {
      success: 'bg-green-100',
      danger: 'bg-red-100',
      warning: 'bg-yellow-100',
      info: 'bg-blue-100',
      default: 'bg-gray-100'
    };
    return classes[this.color] || classes['default'];
  }

  get iconClass(): string {
    const classes: Record<string, string> = {
      success: 'text-green-600',
      danger: 'text-red-600',
      warning: 'text-yellow-600',
      info: 'text-blue-600',
      default: 'text-gray-600'
    };
    return classes[this.color] || classes['default'];
  }

  get trendIcon(): string {
    if (this.trend === undefined) return '';
    return this.trend >= 0 ? 'pi pi-arrow-up text-green-500' : 'pi pi-arrow-down text-red-500';
  }

  get trendClass(): string {
    if (this.trend === undefined) return '';
    return this.trend >= 0 ? 'text-green-600' : 'text-red-600';
  }
}
