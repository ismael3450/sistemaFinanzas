import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { OrganizationService, AuthService } from '../../core/services';
import { Organization } from '../../core/models';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, ReactiveFormsModule, CardModule, ButtonModule,
    DialogModule, InputTextModule, InputTextareaModule, DropdownModule, TagModule
  ],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-2xl font-bold text-gray-800">Mis Organizaciones</h1>
            <p class="text-gray-500">Selecciona o crea una organización para continuar</p>
          </div>
          <div class="flex gap-2">
            <p-button icon="pi pi-plus" label="Nueva Organización" (onClick)="openDialog()"></p-button>
            <p-button icon="pi pi-sign-out" severity="secondary" [outlined]="true" pTooltip="Cerrar Sesión"
                      (onClick)="logout()"></p-button>
          </div>
        </div>

        <!-- Organizations Grid -->
        @if (organizations().length === 0) {
          <div class="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div class="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i class="pi pi-building text-4xl text-primary-600"></i>
            </div>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">No tienes organizaciones</h2>
            <p class="text-gray-500 mb-6">Crea tu primera organización para comenzar a gestionar tus finanzas</p>
            <p-button label="Crear Organización" icon="pi pi-plus" (onClick)="openDialog()"></p-button>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @for (org of organizations(); track org.id) {
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-primary-200 transition-all"
                   [class.ring-2]="org.id === activeOrg()?.id"
                   [class.ring-primary-500]="org.id === activeOrg()?.id"
                   (click)="selectOrganization(org)">
                <div class="flex items-start gap-4">
                  <div class="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span class="text-xl font-bold text-primary-600">{{ getInitials(org.name) }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h3 class="font-semibold text-gray-800 truncate">{{ org.name }}</h3>
                      @if (!org.isActive) {
                        <p-tag value="Inactiva" severity="danger" styleClass="text-xs"></p-tag>
                      }
                    </div>
                    <p class="text-sm text-gray-500 truncate">{{ org.description || 'Sin descripción' }}</p>
                    <div class="flex items-center gap-4 mt-3 text-sm text-gray-400">
                      <span><i class="pi pi-globe mr-1"></i>{{ org.currency }}</span>
                      <span><i class="pi pi-calendar mr-1"></i>{{ org.createdAt | date:'MMM yyyy' }}</span>
                    </div>
                  </div>
                  @if (org.id === activeOrg()?.id) {
                    <i class="pi pi-check-circle text-primary-500 text-xl"></i>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Continue Button -->
        @if (activeOrg()) {
          <div class="mt-8 text-center">
            <p-button label="Continuar al Dashboard" icon="pi pi-arrow-right" iconPos="right"
                      size="large" (onClick)="goToDashboard()"></p-button>
          </div>
        }
      </div>
    </div>

    <!-- Create Dialog -->
    <p-dialog [(visible)]="dialogVisible" header="Nueva Organización" [modal]="true" [style]="{ width: '500px' }">
      <form [formGroup]="form" (ngSubmit)="createOrganization()">
        <div class="form-group">
          <label>Nombre *</label>
          <input pInputText formControlName="name" placeholder="Mi Empresa, Iglesia, Comité..." class="w-full">
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <small class="error-message">El nombre es requerido</small>
          }
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <textarea pInputTextarea formControlName="description" [rows]="3" 
                    placeholder="Descripción breve de la organización..." class="w-full"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label>Moneda *</label>
            <p-dropdown [options]="currencies" formControlName="currency" optionLabel="label" 
                        optionValue="value" styleClass="w-full"></p-dropdown>
          </div>
          <div class="form-group">
            <label>Zona Horaria</label>
            <p-dropdown [options]="timezones" formControlName="timezone" optionLabel="label" 
                        optionValue="value" [filter]="true" styleClass="w-full"></p-dropdown>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="dialogVisible = false"></p-button>
          <p-button type="submit" label="Crear" [loading]="saving()" [disabled]="form.invalid"></p-button>
        </div>
      </form>
    </p-dialog>
  `
})
export class OrganizationsComponent implements OnInit {
  // Inyección de dependencias con inject() - PRIMERO
  private readonly fb = inject(FormBuilder);
  private readonly orgService = inject(OrganizationService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  // Propiedades que dependen de los servicios - DESPUÉS
  readonly organizations = this.orgService.organizations;
  readonly activeOrg = this.orgService.activeOrganization;

  // Dialog state
  dialogVisible = false;
  saving = signal(false);

  // Form - inicializado después de inject()
  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    currency: ['USD', Validators.required],
    timezone: ['America/New_York']
  });

  // Options
  readonly currencies = [
    { label: 'USD - Dólar', value: 'USD' },
    { label: 'EUR - Euro', value: 'EUR' },
    { label: 'MXN - Peso Mexicano', value: 'MXN' },
    { label: 'COP - Peso Colombiano', value: 'COP' },
    { label: 'ARS - Peso Argentino', value: 'ARS' },
    { label: 'CLP - Peso Chileno', value: 'CLP' },
    { label: 'PEN - Sol Peruano', value: 'PEN' }
  ];

  readonly timezones = [
    { label: 'America/New_York (EST)', value: 'America/New_York' },
    { label: 'America/Chicago (CST)', value: 'America/Chicago' },
    { label: 'America/Denver (MST)', value: 'America/Denver' },
    { label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
    { label: 'America/Mexico_City', value: 'America/Mexico_City' },
    { label: 'America/Bogota', value: 'America/Bogota' },
    { label: 'America/Lima', value: 'America/Lima' },
    { label: 'America/Santiago', value: 'America/Santiago' },
    { label: 'America/Buenos_Aires', value: 'America/Buenos_Aires' },
    { label: 'Europe/Madrid', value: 'Europe/Madrid' }
  ];

  ngOnInit(): void {
    this.orgService.getAll().subscribe();
  }

  openDialog() {
    this.form.reset({ currency: 'USD', timezone: 'America/New_York' });
    this.dialogVisible = true;
  }

  selectOrganization(org: Organization) {
    this.orgService.setActive(org.id).subscribe({
      next: () => this.orgService.setActiveOrganization(org)
    });
  }

  createOrganization() {
    if (this.form.invalid) return;
    this.saving.set(true);

    this.orgService.create(this.form.value).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Organización creada' });
        this.dialogVisible = false;
        this.saving.set(false);
      },
      error: () => this.saving.set(false)
    });
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.authService.logout();
  }

  getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }
}
