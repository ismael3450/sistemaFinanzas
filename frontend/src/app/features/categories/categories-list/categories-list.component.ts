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
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CategoryService } from '../../../core/services';
import { Category, CategoryType } from '../../../core/models';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [
    CommonModule, CardModule, TreeTableModule, ButtonModule, TagModule, DialogModule,
    InputTextModule, DropdownModule, ColorPickerModule, FormsModule, ReactiveFormsModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Categorías</h1>
        <p-button icon="pi pi-plus" label="Nueva Categoría" (onClick)="openDialog()"></p-button>
      </div>

      <p-card>
        <p-treeTable [value]="treeData()" [columns]="cols">
          <ng-template pTemplate="header" let-columns>
            <tr>
              <th *ngFor="let col of columns">{{ col.header }}</th>
              <th class="text-center" style="width: 120px">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-rowNode let-rowData="rowData">
            <tr>
              <td>
                <p-treeTableToggler [rowNode]="rowNode"></p-treeTableToggler>
                <span class="ml-2">
                  <span class="inline-block w-3 h-3 rounded-full mr-2" 
                        [style.background-color]="rowData.color || '#6b7280'"></span>
                  {{ rowData.name }}
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
                        class="p-button-text p-button-sm" (click)="toggleActive(rowData)"></button>
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

    <p-dialog [(visible)]="dialogVisible" [header]="getDialogTitle()" [modal]="true" [style]="{ width: '450px' }">
      <form [formGroup]="form" (ngSubmit)="saveCategory()">
        <div class="form-group">
          <label>Nombre *</label>
          <input pInputText formControlName="name" class="w-full">
        </div>
        <div class="form-group">
          <label>Tipo *</label>
          <p-dropdown [options]="typeOptions" formControlName="type" 
                      optionLabel="label" optionValue="value" styleClass="w-full"></p-dropdown>
        </div>
        <div class="form-group">
          <label>Color</label>
          <div class="flex items-center gap-2">
            <p-colorPicker formControlName="color"></p-colorPicker>
            <input pInputText formControlName="color" class="w-24">
          </div>
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <input pInputText formControlName="description" class="w-full">
        </div>
        @if (parentCategory) {
          <p class="text-sm text-gray-500 mt-2">
            Subcategoría de: <strong>{{ parentCategory.name }}</strong>
          </p>
        }
        <div class="flex justify-end gap-2 mt-4">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="dialogVisible = false"></p-button>
          <p-button type="submit" [label]="editingCategory ? 'Guardar' : 'Crear'" [loading]="saving()"></p-button>
        </div>
      </form>
    </p-dialog>
  `
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
    { label: 'Ingreso', value: 'INCOME' },
    { label: 'Egreso', value: 'EXPENSE' },
    { label: 'Ambos', value: 'BOTH' }
  ];

  treeData = computed(() => this.buildTree(this.categories()));

  ngOnInit() {
    this.categoryService.getAll(true).subscribe();
  }

  buildTree(categories: Category[]): any[] {
    return categories.map(cat => ({
      data: cat,
      children: cat.children ? this.buildTree(cat.children) : []
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
    this.form.reset({ type: parent.type, color: parent.color || '#6b7280' });
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
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Categoría guardada' });
        this.dialogVisible = false;
        this.saving.set(false);
      },
      error: () => this.saving.set(false)
    });
  }

  toggleActive(category: Category) {
    const action = category.isActive 
      ? this.categoryService.deactivate(category.id) 
      : this.categoryService.activate(category.id);
    action.subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estado actualizado' })
    });
  }

  getDialogTitle(): string {
    if (this.editingCategory) return 'Editar Categoría';
    if (this.parentCategory) return 'Nueva Subcategoría';
    return 'Nueva Categoría';
  }

  getTypeLabel(type: CategoryType): string {
    const labels = { INCOME: 'Ingreso', EXPENSE: 'Egreso', BOTH: 'Ambos' };
    return labels[type] || type;
  }

  getTypeSeverity(type: CategoryType): 'success' | 'danger' | 'info' {
    const map = { INCOME: 'success' as const, EXPENSE: 'danger' as const, BOTH: 'info' as const };
    return map[type] || 'info';
  }
}
