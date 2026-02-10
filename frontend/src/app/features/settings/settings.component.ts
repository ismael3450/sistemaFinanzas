import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
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
import { TooltipModule } from 'primeng/tooltip';
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
    DialogModule, ConfirmDialogModule, TooltipModule, DateAgoPipe
  ],
  providers: [ConfirmationService],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Configuración</h1>
        <p class="text-sm text-gray-500 mt-1">
          Ajusta los datos de tu organización, administra miembros y actualiza tu perfil personal.
        </p>
      </div>

      <p-tabView [(activeIndex)]="activeTabIndex">
        <!-- Organization Settings -->
        <p-tabPanel header="Organización">
          <p-card>
            @if (!canManageOrganization()) {
              <div class="mb-4 rounded border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                <i class="pi pi-info-circle mr-2"></i>
                No tienes permisos para editar la organización. Contacta a un administrador si necesitas cambios.
              </div>
            }
            <form [formGroup]="orgForm" (ngSubmit)="saveOrganization()">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label>Nombre de la Organización *</label>
                  <input pInputText formControlName="name" class="w-full" [readonly]="!canManageOrganization()">
                </div>
                <div class="form-group">
                  <label>Moneda</label>
                  <p-dropdown
                      [options]="currencies"
                      formControlName="currency"
                      optionLabel="label"
                      optionValue="value"
                      [disabled]="!canManageOrganization()"
                      appendTo="body"
                      styleClass="w-full">
                  </p-dropdown>
                </div>
              </div>
              <div class="form-group">
                <label>Descripción</label>
                <textarea
                    pInputTextarea
                    formControlName="description"
                    [rows]="3"
                    class="w-full"
                    [readonly]="!canManageOrganization()"></textarea>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label>Zona Horaria</label>
                  <p-dropdown
                      [options]="timezones"
                      formControlName="timezone"
                      optionLabel="label"
                      optionValue="value"
                      [filter]="true"
                      [disabled]="!canManageOrganization()"
                      appendTo="body"
                      styleClass="w-full">
                  </p-dropdown>
                </div>
                <div class="form-group">
                  <label>Inicio Año Fiscal</label>
                  <p-dropdown
                      [options]="months"
                      formControlName="fiscalYearStart"
                      optionLabel="label"
                      optionValue="value"
                      [disabled]="!canManageOrganization()"
                      appendTo="body"
                      styleClass="w-full">
                  </p-dropdown>
                </div>
              </div>
              <div class="flex justify-end mt-4">
                <p-button
                    type="submit"
                    label="Guardar Cambios"
                    [loading]="savingOrg()"
                    [disabled]="orgForm.invalid || !canManageOrganization()"
                    [pTooltip]="!canManageOrganization() ? 'No tienes permisos para editar la organización' : ''"
                    [tooltipDisabled]="canManageOrganization()">
                </p-button>
              </div>
            </form>
          </p-card>
        </p-tabPanel>

        <!-- Members Tab - Solo visible para OWNER y ADMIN -->
        @if (canManageMembers()) {
          <p-tabPanel header="Miembros">
            <p-card>
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">Miembros de la Organización</h3>
                <p-button
                    icon="pi pi-user-plus"
                    label="Invitar Miembro"
                    (onClick)="openInviteDialog()">
                </p-button>
              </div>

              <p-table [value]="members()" [rowHover]="true" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Miembro desde</th>
                    <th class="text-center">Acciones</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-member>
                  <tr>
                    <td>
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span class="text-primary-600 font-medium">
                            {{ getInitials(member.user) }}
                          </span>
                        </div>
                        <div>
                          <p class="font-medium">{{ member.user.firstName }} {{ member.user.lastName }}</p>
                        </div>
                      </div>
                    </td>
                    <td>{{ member.user.email }}</td>
                    <td>
                      <p-tag
                          [value]="getRoleLabel(member.role)"
                          [severity]="getRoleSeverity(member.role)">
                      </p-tag>
                    </td>
                    <td>
                      <span class="text-sm text-gray-500">{{ member.joinedAt | dateAgo }}</span>
                    </td>
                    <td class="text-center">
                      @if (member.role !== 'OWNER' && member.userId !== currentUserId()) {
                        <button
                            pButton
                            icon="pi pi-pencil"
                            class="p-button-text p-button-sm"
                            pTooltip="Cambiar Rol"
                            (click)="editMemberRole(member)">
                        </button>
                        <button
                            pButton
                            icon="pi pi-user-minus"
                            class="p-button-text p-button-sm p-button-danger"
                            pTooltip="Revocar Acceso"
                            (click)="confirmRevoke(member)">
                        </button>
                      }
                    </td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr>
                    <td colspan="5" class="text-center py-8">
                      <i class="pi pi-users text-4xl text-gray-300 mb-4"></i>
                      <p class="text-gray-500">No hay miembros</p>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </p-card>
          </p-tabPanel>
        }

        <!-- Profile Tab -->
        <p-tabPanel header="Mi Perfil">
          <p-card>
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
              <div class="form-group">
                <label>Email</label>
                <input pInputText formControlName="email" class="w-full" [readonly]="true">
                <small class="text-gray-500">El email no se puede cambiar</small>
              </div>
              <div class="form-group">
                <label>Rol en la organización</label>
                <input pInputText class="w-full" [value]="roleLabel()" [readonly]="true">
              </div>
              <div class="flex justify-end mt-4">
                <p-button type="submit" label="Actualizar Perfil" [loading]="savingProfile()"></p-button>
              </div>
            </form>
          </p-card>

          <!-- Cambiar contraseña -->
          <p-card header="Cambiar Contraseña" styleClass="mt-6">
            <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
              <div class="form-group">
                <label>Contraseña Actual *</label>
                <input pInputText type="password" formControlName="currentPassword" class="w-full">
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label>Nueva Contraseña *</label>
                  <input pInputText type="password" formControlName="newPassword" class="w-full">
                </div>
                <div class="form-group">
                  <label>Confirmar Contraseña *</label>
                  <input pInputText type="password" formControlName="confirmPassword" class="w-full">
                </div>
              </div>
              @if (passwordForm.hasError('mismatch')) {
                <small class="text-red-500">Las contraseñas no coinciden</small>
              }
              <div class="flex justify-end mt-4">
                <p-button
                    type="submit"
                    label="Cambiar Contraseña"
                    [loading]="changingPassword()"
                    [disabled]="passwordForm.invalid">
                </p-button>
              </div>
            </form>
          </p-card>
        </p-tabPanel>
      </p-tabView>
    </div>

    <!-- Invite Dialog -->
    <p-dialog
        [(visible)]="inviteDialogVisible"
        header="Invitar Miembro"
        [modal]="true"
        [style]="{ width: '400px' }"
        [draggable]="false">
      <form [formGroup]="inviteForm" (ngSubmit)="inviteMember()">
        <div class="form-group">
          <label>Email *</label>
          <input pInputText formControlName="email" type="email" placeholder="correo@ejemplo.com" class="w-full">
        </div>
        <div class="form-group">
          <label>Contraseña *</label>
          <input pInputText formControlName="password" type="password" placeholder="Mínimo 8 caracteres" class="w-full">
        </div>
        <div class="form-group">
          <label>Rol *</label>
          <p-dropdown
              [options]="roleOptions"
              formControlName="role"
              optionLabel="label"
              optionValue="value"
              appendTo="body"
              styleClass="w-full">
          </p-dropdown>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="inviteDialogVisible = false"></p-button>
          <p-button type="submit" label="Enviar Invitación" [loading]="inviting()"></p-button>
        </div>
      </form>
    </p-dialog>

    <!-- Role Edit Dialog -->
    <p-dialog
        [(visible)]="roleDialogVisible"
        header="Cambiar Rol"
        [modal]="true"
        [style]="{ width: '350px' }"
        [draggable]="false">
      <div class="form-group">
        <label>Nuevo Rol</label>
        <p-dropdown
            [options]="roleOptions"
            [(ngModel)]="newRole"
            optionLabel="label"
            optionValue="value"
            appendTo="body"
            styleClass="w-full">
        </p-dropdown>
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
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly orgService = inject(OrganizationService);
  private readonly memberService = inject(MemberService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);

  activeTabIndex = 0;
  members = signal<Member[]>([]);

  // Loading states
  savingOrg = signal(false);
  savingProfile = signal(false);
  changingPassword = signal(false);
  inviting = signal(false);
  updatingRole = signal(false);

  // Dialogs
  inviteDialogVisible = false;
  roleDialogVisible = false;
  selectedMember: Member | null = null;
  newRole: Role = 'MEMBER';

  // Forms
  orgForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    currency: ['USD'],
    timezone: ['America/El_Salvador'],
    fiscalYearStart: [1]
  });

  profileForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [{ value: '', disabled: true }]
  });

  passwordForm: FormGroup = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  inviteForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['MEMBER', Validators.required]
  });

  // Options
  currencies = [
    { label: 'USD - Dólar Estadounidense', value: 'USD' },
    { label: 'EUR - Euro', value: 'EUR' },
    { label: 'MXN - Peso Mexicano', value: 'MXN' },
    { label: 'COP - Peso Colombiano', value: 'COP' },
    { label: 'ARS - Peso Argentino', value: 'ARS' },
    { label: 'CLP - Peso Chileno', value: 'CLP' },
    { label: 'PEN - Sol Peruano', value: 'PEN' },
    { label: 'GTQ - Quetzal', value: 'GTQ' }
  ];

  timezones = [
    { label: 'America/New_York (EST)', value: 'America/New_York' },
    { label: 'America/Chicago (CST)', value: 'America/Chicago' },
    { label: 'America/Denver (MST)', value: 'America/Denver' },
    { label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
    { label: 'America/Mexico_City', value: 'America/Mexico_City' },
    { label: 'America/El_Salvador (CST)', value: 'America/El_Salvador' },
    { label: 'America/Bogota', value: 'America/Bogota' },
    { label: 'America/Lima', value: 'America/Lima' },
    { label: 'America/Santiago', value: 'America/Santiago' },
    { label: 'America/Buenos_Aires', value: 'America/Buenos_Aires' },
    { label: 'America/Sao_Paulo', value: 'America/Sao_Paulo' },
    { label: 'Europe/Madrid', value: 'Europe/Madrid' },
    { label: 'Europe/London', value: 'Europe/London' }
  ];

  months = [
    { label: 'Enero', value: 1 },
    { label: 'Febrero', value: 2 },
    { label: 'Marzo', value: 3 },
    { label: 'Abril', value: 4 },
    { label: 'Mayo', value: 5 },
    { label: 'Junio', value: 6 },
    { label: 'Julio', value: 7 },
    { label: 'Agosto', value: 8 },
    { label: 'Septiembre', value: 9 },
    { label: 'Octubre', value: 10 },
    { label: 'Noviembre', value: 11 },
    { label: 'Diciembre', value: 12 }
  ];

  roleOptions = [
    { label: 'Administrador', value: 'ADMIN' },
    { label: 'Tesorero', value: 'TREASURER' },
    { label: 'Miembro', value: 'MEMBER' },
    { label: 'Visor', value: 'VIEWER' }
  ];

  currentUserId = computed(() => this.authService.currentUser()?.id);
  currentRole = computed(() => this.orgService.currentRole());
  canManageOrganization = computed(() => this.orgService.canManageOrg());
  roleLabel = computed(() => {
    const role = this.currentRole();
    return role ? this.getRoleLabel(role) : 'Sin rol asignado';
  });

  canManageMembers = computed(() => {
    const role = this.currentRole();
    return role === 'OWNER' || role === 'ADMIN';
  });

  ngOnInit(): void {
    this.loadOrganization();
    this.loadProfile();
    this.loadMembers();

    // Determinar tab activo según la ruta
    const path = this.route.snapshot.routeConfig?.path;
    if (path === 'members') {
      this.activeTabIndex = 1;
    } else if (path === 'profile') {
      this.activeTabIndex = this.canManageMembers() ? 2 : 1;
    }
  }

  loadOrganization(): void {
    const org = this.orgService.activeOrganization();
    if (org) {
      this.orgForm.patchValue({
        name: org.name,
        description: org.description,
        currency: org.currency,
        timezone: org.timezone,
        fiscalYearStart: org.fiscalYearStart
      });
    }
  }

  loadProfile(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      });
    }
  }

  loadMembers(): void {
    this.memberService.getAll().subscribe({
      next: (response) => this.members.set(response.data.data)
    });
  }

  saveOrganization(): void {
    if (this.orgForm.invalid) return;
    const orgId = this.orgService.activeOrgId();
    if (!orgId) return;
    this.savingOrg.set(true);

    this.orgService.update(orgId, this.orgForm.value).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Organización actualizada' });
        this.savingOrg.set(false);
      },
      error: () => this.savingOrg.set(false)
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.savingProfile.set(true);

    this.authService.updateProfile(this.profileForm.value).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Perfil actualizado' });
        this.savingProfile.set(false);
      },
      error: () => this.savingProfile.set(false)
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    this.changingPassword.set(true);

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Contraseña actualizada' });
        this.passwordForm.reset();
        this.changingPassword.set(false);
      },
      error: () => this.changingPassword.set(false)
    });
  }

  openInviteDialog(): void {
    this.inviteForm.reset({ role: 'MEMBER' });
    this.inviteDialogVisible = true;
  }

  inviteMember(): void {
    if (this.inviteForm.invalid) return;
    this.inviting.set(true);

    this.memberService.invite(this.inviteForm.value).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Invitación enviada' });
        this.inviteDialogVisible = false;
        this.inviting.set(false);
        this.loadMembers();
      },
      error: () => this.inviting.set(false)
    });
  }

  editMemberRole(member: Member): void {
    this.selectedMember = member;
    this.newRole = member.role;
    this.roleDialogVisible = true;
  }

  updateRole(): void {
    if (!this.selectedMember) return;
    this.updatingRole.set(true);

    this.memberService.updateRole(this.selectedMember.id, this.newRole).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Rol actualizado' });
        this.roleDialogVisible = false;
        this.updatingRole.set(false);
        this.loadMembers();
      },
      error: () => this.updatingRole.set(false)
    });
  }

  confirmRevoke(member: Member): void {
    this.confirmService.confirm({
      message: `¿Está seguro de revocar el acceso a ${member.user.firstName} ${member.user.lastName}?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Revocar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.memberService.revoke(member.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Acceso revocado' });
            this.loadMembers();
          }
        });
      }
    });
  }

  getInitials(user: any): string {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  }

  getRoleLabel(role: Role): string {
    const labels: Record<Role, string> = {
      OWNER: 'Propietario',
      ADMIN: 'Administrador',
      TREASURER: 'Tesorero',
      MEMBER: 'Miembro',
      VIEWER: 'Visor'
    };
    return labels[role] || role;
  }

  getRoleSeverity(role: Role): 'success' | 'info' | 'warning' | 'danger' {
    const map: Record<Role, 'success' | 'info' | 'warning' | 'danger'> = {
      OWNER: 'danger',
      ADMIN: 'warning',
      TREASURER: 'info',
      MEMBER: 'success',
      VIEWER: 'info'
    };
    return map[role] || 'info';
  }

  private passwordMatchValidator(form: FormGroup): { mismatch: boolean } | null {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }
}