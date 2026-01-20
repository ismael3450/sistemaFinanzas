import { Component, OnInit, signal, inject, computed, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TreeTableModule } from 'primeng/treetable';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ColorPickerModule } from 'primeng/colorpicker';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CategoryService } from '../../../core/services';
import { Category, CategoryType } from '../../../core/models';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [
    CommonModule, CardModule, TreeTableModule, ButtonModule, TagModule, DialogModule,
    InputTextModule, DropdownModule, ColorPickerModule, FormsModule, ReactiveFormsModule,
    TooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Categorías</h1>
        <p-button icon="pi pi-plus" label="Nueva Categoría" (onClick)="openDialog()"></p-button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="stat-card">
          <p class="stat-label">Total Categorías</p>
          <p class="stat-value">{{ categories().length }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Ingresos</p>
          <p class="stat-value text-green-600">{{ incomeCount() }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Egresos</p>
          <p class="stat-value text-red-600">{{ expenseCount() }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Ambos</p>
          <p class="stat-value text-blue-600">{{ bothCount() }}</p>
        </div>
      </div>

      <p-card>
        <p-treeTable [value]="treeData()" [columns]="cols">
          <ng-template pTemplate="header" let-columns>
            <tr>
              <th *ngFor="let col of columns">{{ col.header }}</th>
              <th class="text-center" style="width: 150px">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-rowNode let-rowData="rowData">
            <tr>
              <td>
                <p-treeTableToggler [rowNode]="rowNode"></p-treeTableToggler>
                <span class="ml-2 inline-flex items-center gap-2">
                  <!-- CORRECCIÓN: Tamaño fijo para el indicador de color -->
                  <span class="inline-block w-3 h-3 rounded-full flex-shrink-0"
                        [style.background-color]="rowData.color || '#6b7280'"></span>
                  <span>{{ rowData.name }}</span>
                </span>
              </td>
              <td>
                <p-tag [value]="getTypeLabel(rowData.type)" [severity]="getTypeSeverity(rowData.type)"></p-tag>
              </td>
              <td>
                <p-tag [value]="rowData.isActive ? 'Activa' : 'Inactiva'"
                       [severity]="rowData.isActive ? 'success' : 'danger'"></p-tag>
              </td>
              <td class="text-center">
                <button pButton icon="pi pi-plus" class="p-button-text p-button-sm"
                        pTooltip="Agregar subcategoría" (click)="addSubcategory(rowData)"></button>
                <button pButton icon="pi pi-pencil" class="p-button-text p-button-sm"
                        pTooltip="Editar" (click)="editCategory(rowData)"></button>
                <button pButton [icon]="rowData.isActive ? 'pi pi-eye-slash' : 'pi pi-eye'"
                        class="p-button-text p-button-sm"
                        [pTooltip]="rowData.isActive ? 'Desactivar' : 'Activar'"
                        (click)="toggleActive(rowData)"></button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="4" class="text-center py-8">
                <i class="pi pi-tags text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No hay categorías registradas</p>
              </td>
            </tr>
          </ng-template>
        </p-treeTable>
      </p-card>
    </div>

    <!-- CORRECCIÓN: Dialog mejorado con mejor manejo del scroll y color picker -->
    <p-dialog
        [(visible)]="dialogVisible"
        [header]="getDialogTitle()"
        [modal]="true"
        [style]="{ width: '500px', maxHeight: '90vh' }"
        [contentStyle]="{ 'overflow-y': 'auto', 'max-height': '70vh', 'padding-bottom': '1rem' }"
        [draggable]="false"
        [resizable]="false">
      <form [formGroup]="form" (ngSubmit)="saveCategory()">
        <div class="form-group">
          <label>Nombre *</label>
          <input pInputText formControlName="name" class="w-full" placeholder="Nombre de la categoría">
        </div>

        <div class="form-group">
          <label>Tipo *</label>
          <p-dropdown
              [options]="typeOptions"
              formControlName="type"
              optionLabel="label"
              optionValue="value"
              appendTo="body"
              styleClass="w-full">
            <ng-template pTemplate="item" let-item>
              <div class="flex items-center gap-2">
                <i [class]="item.icon" [style.color]="item.color"></i>
                <span>{{ item.label }}</span>
              </div>
            </ng-template>
          </p-dropdown>
          <small class="text-gray-500">
            @switch (form.get('type')?.value) {
              @case ('INCOME') {
                Esta categoría solo aparecerá en transacciones de ingreso
              }
              @case ('EXPENSE') {
                Esta categoría solo aparecerá en transacciones de egreso
              }
              @case ('BOTH') {
                Esta categoría aparecerá en transacciones de ingreso y egreso
              }
            }
          </small>
        </div>

        <!-- CORRECCIÓN: Color picker mejorado igual que en cuentas -->
        <div class="form-group">
          <label>Color</label>
          <div class="flex items-center gap-3">
            <!-- Preview del color -->
            <div
                class="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer flex-shrink-0"
                [style.background-color]="form.get('color')?.value || '#6b7280'">
            </div>

            <!-- Input de color manual -->
            <input
                pInputText
                formControlName="color"
                placeholder="#6b7280"
                class="w-28"
                maxlength="7">

            <!-- Color picker nativo -->
            <input
                type="color"
                [value]="form.get('color')?.value || '#6b7280'"
                (input)="onColorChange($event)"
                class="w-10 h-10 cursor-pointer border-0 p-0 bg-transparent">
          </div>

          <!-- Colores predefinidos -->
          <div class="flex flex-wrap gap-2 mt-3">
            @for (color of predefinedColors; track color) {
              <button
                  type="button"
                  class="w-7 h-7 rounded-lg border-2 transition-all hover:scale-110"
                  [style.background-color]="color"
                  [class.border-gray-800]="form.get('color')?.value === color"
                  [class.border-transparent]="form.get('color')?.value !== color"
                  [class.ring-2]="form.get('color')?.value === color"
                  [class.ring-offset-1]="form.get('color')?.value === color"
                  (click)="selectColor(color)">
              </button>
            }
          </div>
        </div>

        <div class="form-group">
          <label>Descripción</label>
          <input pInputText formControlName="description" class="w-full" placeholder="Descripción opcional">
        </div>

        @if (parentCategory) {
          <div class="p-3 bg-blue-50 rounded-lg mt-4">
            <p class="text-sm text-blue-700">
              <i class="pi pi-info-circle mr-2"></i>
              Subcategoría de: <strong>{{ parentCategory.name }}</strong>
            </p>
          </div>
        }

        <div class="flex justify-end gap-2 mt-6 pt-4 border-t">
          <p-button
              label="Cancelar"
              severity="secondary"
              [outlined]="true"
              (onClick)="dialogVisible = false">
          </p-button>
          <p-button
              type="submit"
              [label]="editingCategory ? 'Guardar' : 'Crear'"
              [loading]="saving()"
              [disabled]="form.invalid">
          </p-button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep {
      /* Asegurar que el dropdown se muestre correctamente */
      .p-dropdown-panel {
        z-index: 9999 !important;
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
export class CategoriesListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private messageService = inject(MessageService);

  categories: Signal<Category[]> = this.categoryService.categories;

  dialogVisible = false;
  editingCategory: Category | null = null;
  parentCategory: Category | null = null;
  saving = signal(false);

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    type: ['BOTH', Validators.required],
    color: ['#6b7280'],
    description: ['']
  });

  cols = [
    { field: 'name', header: 'Nombre' },
    { field: 'type', header: 'Tipo' },
    { field: 'isActive', header: 'Estado' }
  ];

  typeOptions = [
    { label: 'Ingreso', value: 'INCOME', icon: 'pi pi-arrow-down', color: '#10b981' },
    { label: 'Egreso', value: 'EXPENSE', icon: 'pi pi-arrow-up', color: '#ef4444' },
    { label: 'Ambos', value: 'BOTH', icon: 'pi pi-arrows-h', color: '#3b82f6' }
  ];

  // Colores predefinidos para categorías
  predefinedColors = [
    '#6b7280', // gray
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#84cc16', // lime
    '#22c55e', // green
    '#10b981', // emerald
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
    '#f43f5e', // rose
  ];

  treeData = computed(() => this.buildTree(this.categories()));

  // Contadores por tipo
  incomeCount = computed(() =>
      this.categories().filter(c => c.type === 'INCOME').length
  );

  expenseCount = computed(() =>
      this.categories().filter(c => c.type === 'EXPENSE').length
  );

  bothCount = computed(() =>
      this.categories().filter(c => c.type === 'BOTH').length
  );

  ngOnInit() {
    this.categoryService.getAll(true).subscribe();
  }

  buildTree(categories: Category[]): any[] {
    // Filtrar solo categorías padre (sin parentId)
    const rootCategories = categories.filter(c => !c.parentId);

    return rootCategories.map(cat => ({
      data: cat,
      children: cat.children ? this.buildTree(cat.children) : [],
      expanded: true
    }));
  }

  openDialog() {
    this.editingCategory = null;
    this.parentCategory = null;
    this.form.reset({ type: 'BOTH', color: '#6b7280' });
    this.dialogVisible = true;
  }

  addSubcategory(parent: Category) {
    this.editingCategory = null;
    this.parentCategory = parent;
    this.form.reset({
      type: parent.type,
      color: parent.color || '#6b7280'
    });
    this.dialogVisible = true;
  }

  editCategory(category: Category) {
    this.editingCategory = category;
    this.parentCategory = null;
    this.form.patchValue({
      name: category.name,
      type: category.type,
      color: category.color || '#6b7280',
      description: category.description
    });
    this.dialogVisible = true;
  }

  getDialogTitle(): string {
    if (this.editingCategory) {
      return 'Editar Categoría';
    }
    if (this.parentCategory) {
      return 'Nueva Subcategoría';
    }
    return 'Nueva Categoría';
  }

  saveCategory() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const data = { ...this.form.value };
    if (this.parentCategory) {
      data.parentId = this.parentCategory.id;
    }

    const request = this.editingCategory
        ? this.categoryService.update(this.editingCategory.id, data)
        : this.categoryService.create(data);

    request.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.editingCategory ? 'Categoría actualizada' : 'Categoría creada'
        });
        this.dialogVisible = false;
        this.saving.set(false);
      },
      error: (err) => {
        console.error('Error:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar la categoría'
        });
        this.saving.set(false);
      }
    });
  }

  toggleActive(category: Category) {
    const action = category.isActive
        ? this.categoryService.deactivate(category.id)
        : this.categoryService.activate(category.id);

    action.subscribe({
      next: () => this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Estado actualizado'
      }),
      error: () => this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar el estado'
      })
    });
  }

  getTypeLabel(type: CategoryType): string {
    const option = this.typeOptions.find(t => t.value === type);
    return option?.label || type;
  }

  getTypeSeverity(type: CategoryType): 'success' | 'danger' | 'info' {
    const map: Record<CategoryType, 'success' | 'danger' | 'info'> = {
      INCOME: 'success',
      EXPENSE: 'danger',
      BOTH: 'info'
    };
    return map[type] || 'info';
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
}