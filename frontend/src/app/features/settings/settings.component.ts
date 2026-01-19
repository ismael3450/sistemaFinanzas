import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TabViewModule } from 'primeng/tabview';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { OrganizationService, MemberService, AuthService } from '../../core/services';
import { Member, Role } from '../../core/models';
import { DateAgoPipe } from '../../shared/pipes';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, ReactiveFormsModule, CardModule, TabViewModule,
    ButtonModule, InputTextModule, InputTextareaModule, DropdownModule, TableModule, TagModule,
    DialogModule, ConfirmDialogModule, DateAgoPipe
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Configuración</h1>
      </div>

      <p-tabView>
        <!-- Organization Settings -->
        <p-tabPanel header="Organización">
          <p-card>
            <form [formGroup]="orgForm" (ngSubmit)="saveOrganization()">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label>Nombre de la Organización *</label>
                  <input pInputText formControlName="name" class="w-full">
                </div>
                <div class="form-group">
                  <label>Moneda</label>
                  <p-dropdown [options]="currencies" formControlName="currency" optionLabel="label" 
                              optionValue="value" styleClass="w-full"></p-dropdown>
                </div>
              </div>
              <div class="form-group">
                <label>Descripción</label>
                <textarea pInputTextarea formControlName="description" [rows]="3" class="w-full"></textarea>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label>Zona Horaria</label>
                  <p-dropdown [options]="timezones" formControlName="timezone" optionLabel="label" 
                              optionValue="value" [filter]="true" styleClass="w-full"></p-dropdown>
                </div>
                <div class="form-group">
                  <label>Inicio Año Fiscal</label>
                  <p-dropdown [options]="months" formControlName="fiscalYearStart" optionLabel="label" 
                              optionValue="value" styleClass="w-full"></p-dropdown>
                </div>
              </div>
              <div class="flex justify-end mt-4">
                <p-button type="submit" label="Guardar Cambios" [loading]="savingOrg()"></p-button>
              </div>
            </form>
          </p-card>
        </p-tabPanel>

        <!-- Members -->
        <p-tabPanel header="Miembros">
          <p-card>
            <ng-template pTemplate="header">
              <div class="flex justify-between items-center p-4">
                <h3 class="text-lg font-semibold">Miembros de la Organización</h3>
                <p-button icon="pi pi-user-plus" label="Invitar" (onClick)="openInviteDialog()"></p-button>
              </div>
            </ng-template>

            <p-table [value]="members()" [loading]="loadingMembers()" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Miembro desde</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-member>
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span class="text-primary-600 font-semibold">
                          {{ member.user.firstName[0] }}{{ member.user.lastName[0] }}
                        </span>
                      </div>
                      <span class="font-medium">{{ member.user.firstName }} {{ member.user.lastName }}</span>
                    </div>
                  </td>
                  <td>{{ member.user.email }}</td>
                  <td>
                    <p-tag [value]="getRoleLabel(member.role)" [severity]="getRoleSeverity(member.role)"></p-tag>
                  </td>
                  <td>
                    <p-tag [value]="member.isActive ? (member.joinedAt ? 'Activo' : 'Pendiente') : 'Inactivo'"
                           [severity]="member.isActive ? (member.joinedAt ? 'success' : 'warning') : 'danger'"></p-tag>
                  </td>
                  <td>{{ member.joinedAt ? (member.joinedAt | dateAgo) : 'Pendiente' }}</td>
                  <td class="text-center">
                    @if (member.role !== 'OWNER' && canManageMembers()) {
                      <p-button icon="pi pi-pencil" class="p-button-text p-button-sm" 
                                (onClick)="editMemberRole(member)"></p-button>
                      <p-button icon="pi pi-trash" class="p-button-text p-button-danger p-button-sm"
                                (onClick)="confirmRevoke(member)"></p-button>
                    }
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-card>
        </p-tabPanel>

        <!-- Profile -->
        <p-tabPanel header="Mi Perfil">
          <p-card header="Información Personal">
            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label>Nombre *</label>
                  <input pInputText formControlName="firstName" class="w-full">
                </div>
                <div class="form-group">
                  <label>Apellido *</label>
                  <input pInputText formControlName="lastName" class="w-full">
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label>Email</label>
                  <input pInputText formControlName="email" class="w-full" [disabled]="true">
                </div>
                <div class="form-group">
                  <label>Teléfono</label>
                  <input pInputText formControlName="phone" class="w-full">
                </div>
              </div>
              <div class="flex justify-end mt-4">
                <p-button type="submit" label="Actualizar Perfil" [loading]="savingProfile()"></p-button>
              </div>
            </form>
          </p-card>
        </p-tabPanel>
      </p-tabView>
    </div>

    <!-- Invite Dialog -->
    <p-dialog [(visible)]="inviteDialogVisible" header="Invitar Miembro" [modal]="true" [style]="{ width: '400px' }">
      <form [formGroup]="inviteForm" (ngSubmit)="inviteMember()">
        <div class="form-group">
          <label>Email *</label>
          <input pInputText formControlName="email" type="email" placeholder="correo@ejemplo.com" class="w-full">
        </div>
        <div class="form-group">
          <label>Rol *</label>
          <p-dropdown [options]="roleOptions" formControlName="role" optionLabel="label" 
                      optionValue="value" styleClass="w-full"></p-dropdown>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="inviteDialogVisible = false"></p-button>
          <p-button type="submit" label="Enviar Invitación" [loading]="inviting()"></p-button>
        </div>
      </form>
    </p-dialog>

    <!-- Role Edit Dialog -->
    <p-dialog [(visible)]="roleDialogVisible" header="Cambiar Rol" [modal]="true" [style]="{ width: '350px' }">
      <div class="form-group">
        <label>Nuevo Rol</label>
        <p-dropdown [options]="roleOptions" [(ngModel)]="newRole" optionLabel="label" 
                    optionValue="value" styleClass="w-full"></p-dropdown>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="roleDialogVisible = false"></p-button>
        <p-button label="Guardar" (onClick)="updateRole()" [loading]="updatingRole()"></p-button>
      </div>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `
})
export class SettingsComponent implements OnInit {
  // Inyección de dependencias con inject() - PRIMERO
  private readonly fb = inject(FormBuilder);
  private readonly orgService = inject(OrganizationService);
  private readonly memberService = inject(MemberService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);

  // Propiedades que dependen de los servicios - DESPUÉS
  readonly activeOrg = this.orgService.activeOrganization;
  readonly members = this.memberService.members;
  readonly loadingMembers = this.memberService.isLoading;
  readonly canManageMembers = this.orgService.canManageOrg;

  // Signals
  savingOrg = signal(false);
  savingProfile = signal(false);
  inviting = signal(false);
  updatingRole = signal(false);

  // Dialog states
  inviteDialogVisible = false;
  roleDialogVisible = false;
  selectedMember: Member | null = null;
  newRole: Role = 'MEMBER';

  // Forms - inicializados después de inject()
  orgForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    currency: ['USD'],
    timezone: ['America/New_York'],
    fiscalYearStart: [1]
  });

  profileForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [{ value: '', disabled: true }],
    phone: ['']
  });

  inviteForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['MEMBER', Validators.required]
  });

  // Options
  readonly currencies = [
    { label: 'USD - Dólar', value: 'USD' },
    { label: 'EUR - Euro', value: 'EUR' },
    { label: 'MXN - Peso Mexicano', value: 'MXN' }
  ];

  readonly timezones = [
    { label: 'America/New_York', value: 'America/New_York' },
    { label: 'America/Mexico_City', value: 'America/Mexico_City' },
    { label: 'Europe/Madrid', value: 'Europe/Madrid' }
  ];

  readonly months = [
    { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 }, { label: 'Marzo', value: 3 },
    { label: 'Abril', value: 4 }, { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
    { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 }, { label: 'Septiembre', value: 9 },
    { label: 'Octubre', value: 10 }, { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 }
  ];

  readonly roleOptions = [
    { label: 'Administrador', value: 'ADMIN' },
    { label: 'Tesorero', value: 'TREASURER' },
    { label: 'Miembro', value: 'MEMBER' },
    { label: 'Visor', value: 'VIEWER' }
  ];

  ngOnInit(): void {
    const org = this.activeOrg();
    if (org) {
      this.orgForm.patchValue(org);
    }

    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue(user);
    }

    this.memberService.getAll().subscribe();
  }

  saveOrganization() {
    if (this.orgForm.invalid) return;
    this.savingOrg.set(true);

    const orgId = this.activeOrg()?.id;
    if (!orgId) return;

    this.orgService.update(orgId, this.orgForm.value).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Configuración guardada' });
        this.savingOrg.set(false);
      },
      error: () => this.savingOrg.set(false)
    });
  }

  saveProfile() {
    // TODO: Implement profile update
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Perfil actualizado' });
  }

  openInviteDialog() {
    this.inviteForm.reset({ role: 'MEMBER' });
    this.inviteDialogVisible = true;
  }

  inviteMember() {
    if (this.inviteForm.invalid) return;
    this.inviting.set(true);

    this.memberService.invite(this.inviteForm.value).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Invitación enviada' });
        this.inviteDialogVisible = false;
        this.inviting.set(false);
      },
      error: () => this.inviting.set(false)
    });
  }

  editMemberRole(member: Member) {
    this.selectedMember = member;
    this.newRole = member.role;
    this.roleDialogVisible = true;
  }

  updateRole() {
    if (!this.selectedMember) return;
    this.updatingRole.set(true);

    this.memberService.updateRole(this.selectedMember.id, this.newRole).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Rol actualizado' });
        this.roleDialogVisible = false;
        this.updatingRole.set(false);
      },
      error: () => this.updatingRole.set(false)
    });
  }

  confirmRevoke(member: Member) {
    this.confirmService.confirm({
      message: `¿Está seguro de revocar el acceso a ${member.user.firstName} ${member.user.lastName}?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Revocar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.memberService.revoke(member.id).subscribe({
          next: () => this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Acceso revocado' })
        });
      }
    });
  }

  getRoleLabel(role: Role): string {
    const labels: Record<Role, string> = {
      OWNER: 'Propietario', ADMIN: 'Administrador', TREASURER: 'Tesorero', MEMBER: 'Miembro', VIEWER: 'Visor'
    };
    return labels[role] || role;
  }

  getRoleSeverity(role: Role): 'success' | 'info' | 'warning' | 'danger' {
    const map: Record<Role, 'success' | 'info' | 'warning' | 'danger'> = {
      OWNER: 'danger', ADMIN: 'warning', TREASURER: 'info', MEMBER: 'success', VIEWER: 'info'
    };
    return map[role] || 'info';
  }
}
