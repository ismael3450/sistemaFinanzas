import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { AuditService, MemberService } from '../../core/services';
import { AuditLog, AuditAction, AuditFilter } from '../../core/models';
import { DateAgoPipe } from '../../shared/pipes';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    InputTextModule,
    TagModule,
    DialogModule,
    PaginatorModule,
    SkeletonModule,
    TooltipModule,
    DateAgoPipe
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Bitácora de Auditoría</h1>
        <p-button
            icon="pi pi-refresh"
            label="Actualizar"
            [outlined]="true"
            (onClick)="loadLogs()">
        </p-button>
      </div>

      <!-- Filtros -->
      <p-card styleClass="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div class="form-group mb-0">
            <label>Fecha Inicio</label>
            <p-calendar
                [(ngModel)]="filters.startDate"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                appendTo="body"
                styleClass="w-full">
            </p-calendar>
          </div>
          <div class="form-group mb-0">
            <label>Fecha Fin</label>
            <p-calendar
                [(ngModel)]="filters.endDate"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                appendTo="body"
                styleClass="w-full">
            </p-calendar>
          </div>
          <div class="form-group mb-0">
            <label>Usuario</label>
            <p-dropdown
                [options]="members()"
                [(ngModel)]="filters.userId"
                optionLabel="user.firstName"
                optionValue="userId"
                placeholder="Todos"
                [showClear]="true"
                appendTo="body"
                styleClass="w-full">
              <ng-template pTemplate="selectedItem" let-member>
                {{ member?.user?.firstName }} {{ member?.user?.lastName }}
              </ng-template>
              <ng-template pTemplate="item" let-member>
                {{ member.user.firstName }} {{ member.user.lastName }}
              </ng-template>
            </p-dropdown>
          </div>
          <div class="form-group mb-0">
            <label>Módulo</label>
            <p-dropdown
                [options]="moduleOptions"
                [(ngModel)]="filters.module"
                optionLabel="label"
                optionValue="value"
                placeholder="Todos"
                [showClear]="true"
                appendTo="body"
                styleClass="w-full">
            </p-dropdown>
          </div>
          <div class="form-group mb-0">
            <label>Acción</label>
            <p-dropdown
                [options]="actionOptions"
                [(ngModel)]="filters.action"
                optionLabel="label"
                optionValue="value"
                placeholder="Todas"
                [showClear]="true"
                appendTo="body"
                styleClass="w-full">
            </p-dropdown>
          </div>
        </div>
        <div class="flex justify-end mt-4">
          <p-button
              icon="pi pi-filter-slash"
              label="Limpiar"
              severity="secondary"
              [outlined]="true"
              class="mr-2"
              (onClick)="clearFilters()">
          </p-button>
          <p-button
              icon="pi pi-search"
              label="Buscar"
              (onClick)="loadLogs()">
          </p-button>
        </div>
      </p-card>

      <!-- Tabla de logs -->
      <p-card>
        @if (isLoading()) {
          <div class="space-y-4">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="flex gap-4 items-center">
                <p-skeleton width="100px" height="1.5rem"></p-skeleton>
                <p-skeleton width="150px" height="1.5rem"></p-skeleton>
                <p-skeleton width="100px" height="1.5rem"></p-skeleton>
                <p-skeleton width="200px" height="1.5rem"></p-skeleton>
              </div>
            }
          </div>
        } @else {
          <p-table
              [value]="logs()"
              [rowHover]="true"
              styleClass="p-datatable-sm"
              [paginator]="false">
            <ng-template pTemplate="header">
              <tr>
                <th style="width: 180px">Fecha</th>
                <th>Usuario</th>
                <th style="width: 120px">Acción</th>
                <th style="width: 120px">Módulo</th>
                <th>Descripción</th>
                <th style="width: 80px" class="text-center">Detalle</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-log>
              <tr>
                <td>
                  <div class="text-sm">
                    {{ log.createdAt | date:'dd/MM/yyyy HH:mm' }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ log.createdAt | dateAgo }}
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span class="text-xs text-primary-600 font-medium">
                        {{ getInitials(log.userName) }}
                      </span>
                    </div>
                    <span>{{ log.userName || 'Sistema' }}</span>
                  </div>
                </td>
                <td>
                  <p-tag
                      [value]="getActionLabel(log.action)"
                      [severity]="getActionSeverity(log.action)">
                  </p-tag>
                </td>
                <td>
                  <span class="text-sm">{{ getModuleLabel(log.module) }}</span>
                </td>
                <td>
                  <span class="text-sm text-gray-600">
                    {{ getDescription(log) }}
                  </span>
                </td>
                <td class="text-center">
                  @if (log.oldValues || log.newValues) {
                    <button
                        pButton
                        icon="pi pi-eye"
                        class="p-button-text p-button-sm"
                        pTooltip="Ver cambios"
                        (click)="showDetails(log)">
                    </button>
                  }
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="6" class="text-center py-8">
                  <i class="pi pi-history text-4xl text-gray-300 mb-4"></i>
                  <p class="text-gray-500">No hay registros de auditoría</p>
                </td>
              </tr>
            </ng-template>
          </p-table>

          <!-- Paginador -->
          @if (totalCount() > 0) {
            <p-paginator
                [rows]="pageSize"
                [totalRecords]="totalCount()"
                [first]="(currentPage() - 1) * pageSize"
                (onPageChange)="onPageChange($event)"
                [rowsPerPageOptions]="[10, 25, 50]">
            </p-paginator>
          }
        }
      </p-card>
    </div>

    <!-- Dialog de detalles -->
    <p-dialog
        [(visible)]="detailsDialogVisible"
        header="Detalles del Cambio"
        [modal]="true"
        [style]="{ width: '600px', maxHeight: '90vh' }"
        [contentStyle]="{ 'overflow-y': 'auto' }">
      @if (selectedLog()) {
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-gray-500">Fecha</label>
              <p class="font-medium">{{ selectedLog()!.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-500">Usuario</label>
              <p class="font-medium">{{ selectedLog()!.userName || 'Sistema' }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-500">Acción</label>
              <p><p-tag [value]="getActionLabel(selectedLog()!.action)" [severity]="getActionSeverity(selectedLog()!.action)"></p-tag></p>
            </div>
            <div>
              <label class="text-sm text-gray-500">Módulo</label>
              <p class="font-medium">{{ getModuleLabel(selectedLog()!.module) }}</p>
            </div>
          </div>

          @if (selectedLog()!.entityId) {
            <div>
              <label class="text-sm text-gray-500">ID del Registro</label>
              <p class="font-mono text-sm bg-gray-100 p-2 rounded">{{ selectedLog()!.entityId }}</p>
            </div>
          }

          @if (selectedLog()!.oldValues) {
            <div>
              <label class="text-sm text-gray-500 block mb-2">Valores Anteriores</label>
              <pre class="bg-red-50 p-3 rounded text-sm overflow-auto max-h-48">{{ selectedLog()!.oldValues | json }}</pre>
            </div>
          }

          @if (selectedLog()!.newValues) {
            <div>
              <label class="text-sm text-gray-500 block mb-2">Valores Nuevos</label>
              <pre class="bg-green-50 p-3 rounded text-sm overflow-auto max-h-48">{{ selectedLog()!.newValues | json }}</pre>
            </div>
          }

          @if (selectedLog()!.ipAddress) {
            <div class="pt-4 border-t">
              <label class="text-sm text-gray-500">Información Adicional</label>
              <p class="text-sm text-gray-600">
                IP: {{ selectedLog()!.ipAddress }}
                @if (selectedLog()!.userAgent) {
                  <br>User Agent: {{ selectedLog()!.userAgent }}
                }
              </p>
            </div>
          }
        </div>
      }
    </p-dialog>
  `
})
export class AuditComponent implements OnInit {
  private readonly auditService = inject(AuditService);
  private readonly memberService = inject(MemberService);

  // Usar signals del servicio directamente
  readonly logs = this.auditService.logs;
  readonly totalCount = this.auditService.totalCount;
  readonly isLoading = this.auditService.isLoading;
  readonly members = this.memberService.members;

  currentPage = signal(1);
  pageSize = 10;

  detailsDialogVisible = false;
  selectedLog = signal<AuditLog | null>(null);

  filters: AuditFilter = {};

  moduleOptions = [
    { label: 'Autenticación', value: 'AUTH' },
    { label: 'Organizaciones', value: 'ORGANIZATIONS' },
    { label: 'Membresías', value: 'MEMBERSHIP' },
    { label: 'Cuentas', value: 'ACCOUNTS' },
    { label: 'Categorías', value: 'CATEGORIES' },
    { label: 'Transacciones', value: 'TRANSACTIONS' },
    { label: 'Reportes', value: 'REPORTS' },
    { label: 'Exportaciones', value: 'EXPORTS' }
  ];

  actionOptions = [
    { label: 'Crear', value: 'CREATE' },
    { label: 'Actualizar', value: 'UPDATE' },
    { label: 'Eliminar', value: 'DELETE' },
    { label: 'Iniciar Sesión', value: 'LOGIN' },
    { label: 'Cerrar Sesión', value: 'LOGOUT' },
    { label: 'Anular', value: 'VOID' },
    { label: 'Exportar', value: 'EXPORT' },
    { label: 'Invitar', value: 'INVITE' },
    { label: 'Revocar', value: 'REVOKE' }
  ];

  ngOnInit(): void {
    this.loadMembers();
    this.loadLogs();
  }

  /**
   * Cargar miembros - el servicio actualiza su signal interno
   */
  loadMembers(): void {
    this.memberService.getAll().subscribe({
      next: () => console.log('Miembros cargados'),
      error: (err) => console.error('Error cargando miembros:', err)
    });
  }

  /**
   * Cargar logs de auditoría - usa getAll() del servicio
   * El servicio actualiza sus signals internos (_logs, _totalCount)
   */
  loadLogs(): void {
    const query: AuditFilter = {
      ...this.filters,
      page: this.currentPage(),
      limit: this.pageSize
    };

    this.auditService.getAll(query).subscribe({
      next: () => console.log('Logs cargados'),
      error: (err) => console.error('Error cargando logs:', err)
    });
  }

  clearFilters(): void {
    this.filters = {};
    this.currentPage.set(1);
    this.loadLogs();
  }

  onPageChange(event: { first?: number; rows?: number }): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize;
    this.currentPage.set(Math.floor(first / rows) + 1);
    this.pageSize = rows;
    this.loadLogs();
  }

  showDetails(log: AuditLog): void {
    this.selectedLog.set(log);
    this.detailsDialogVisible = true;
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getActionLabel(action: AuditAction): string {
    const labels: Record<AuditAction, string> = {
      CREATE: 'Crear',
      UPDATE: 'Actualizar',
      DELETE: 'Eliminar',
      LOGIN: 'Iniciar Sesión',
      LOGOUT: 'Cerrar Sesión',
      VOID: 'Anular',
      EXPORT: 'Exportar',
      INVITE: 'Invitar',
      REVOKE: 'Revocar'
    };
    return labels[action] || action;
  }

  getActionSeverity(action: AuditAction): 'success' | 'info' | 'warning' | 'danger' {
    const map: Record<AuditAction, 'success' | 'info' | 'warning' | 'danger'> = {
      CREATE: 'success',
      UPDATE: 'info',
      DELETE: 'danger',
      LOGIN: 'info',
      LOGOUT: 'warning',
      VOID: 'danger',
      EXPORT: 'info',
      INVITE: 'success',
      REVOKE: 'danger'
    };
    return map[action] || 'info';
  }

  getModuleLabel(module: string): string {
    const option = this.moduleOptions.find(m => m.value === module);
    return option?.label || module;
  }

  getDescription(log: AuditLog): string {
    const actionLabels: Record<string, string> = {
      CREATE: 'creó',
      UPDATE: 'actualizó',
      DELETE: 'eliminó',
      LOGIN: 'inició sesión',
      LOGOUT: 'cerró sesión',
      VOID: 'anuló',
      EXPORT: 'exportó',
      INVITE: 'invitó a',
      REVOKE: 'revocó acceso a'
    };

    const moduleLabels: Record<string, string> = {
      AUTH: 'autenticación',
      ORGANIZATIONS: 'organización',
      MEMBERSHIP: 'membresía',
      ACCOUNTS: 'cuenta',
      CATEGORIES: 'categoría',
      TRANSACTIONS: 'transacción',
      REPORTS: 'reporte',
      EXPORTS: 'exportación'
    };

    const action = actionLabels[log.action] || log.action;
    const module = moduleLabels[log.module] || log.module;

    if (log.action === 'LOGIN' || log.action === 'LOGOUT') {
      return `Usuario ${action}`;
    }

    return `Se ${action} ${log.entityType ? `un(a) ${module}` : module}`;
  }
}