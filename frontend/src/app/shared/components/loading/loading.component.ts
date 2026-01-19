import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  template: `
    <div class="flex items-center justify-center" [style.height]="height">
      <p-progressSpinner 
        [style]="{ width: size, height: size }" 
        strokeWidth="4"
        animationDuration=".5s">
      </p-progressSpinner>
    </div>
  `
})
export class LoadingComponent {
  @Input() size = '50px';
  @Input() height = '200px';
}
