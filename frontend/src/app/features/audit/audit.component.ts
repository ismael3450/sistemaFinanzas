import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { AuditService, MemberService } from '../../core/services';
import { AuditLog, AuditAction, AuditFilter } from '../../core/models';
import { DateAgoPipe } from '../../shared/pipes';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, TableModule, ButtonModule, CalendarModule,
    DropdownModule, TagModule, TooltipModule, DialogModule, DateAgoPipe
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Bitácora de Auditoría</h1>
      </div>

      <!-- Filters -->
      <p-card styleClass="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <p-calendar [(ngModel)]="filters.startDate" dateFormat="dd/mm/yy" [showIcon]="true" 
                        styleClass="w-full" (onSelect)="loadLogs()"></p-calendar>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <p-calendar [(ngModel)]="filters.endDate" dateFormat="dd/mm/yy" [showIcon]="true" 
                        styleClass="w-full" (onSelect)="loadLogs()"></p-calendar>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Módulo</label>
            <p-dropdown [options]="moduleOptions" [(ngModel)]="filters.module" placeholder="Todos"
                        [showClear]="true" styleClass="w-full" (onChange)="loadLogs()"></p-dropdown>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Acción</label>
            <p-dropdown [options]="actionOptions" [(ngModel)]="filters.action" optionLabel="label" 
                        optionValue="value" placeholder="Todas" [showClear]="true" styleClass="w-full"
                        (onChange)="loadLogs()"></p-dropdown>
          </div>
          <div class="flex items-end">
            <p-button label="Limpiar" severity="secondary" [text]="true" (onClick)="clearFilters()"></p-button>
          </div>
        </div>
      </p-card>

      <!-- Table -->
      <p-card>
        <p-table [value]="logs()" [paginator]="true" [rows]="20" [totalRecords]="totalCount()"
                 [lazy]="true" (onLazyLoad)="onLazyLoad($event)" [loading]="isLoading()"
                 styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 180px">Fecha</th>
              <th>Usuario</th>
              <th>Módulo</th>
              <th>Acción</th>
              <th>Descripción</th>
              <th style="width: 80px"></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-log>
            <tr>
              <td>
                <div class="flex flex-col">
                  <span class="font-medium">{{ log.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  <span class="text-xs text-gray-500">{{ log.createdAt | dateAgo }}</span>
                </div>
              </td>
              <td>
                <span class="font-medium">{{ log.userName || 'Sistema' }}</span>
              </td>
              <td>
                <span class="text-gray-600">{{ log.module }}</span>
              </td>
              <td>
                <p-tag [value]="getActionLabel(log.action)" [severity]="getActionSeverity(log.action)"></p-tag>
              </td>
              <td>
                <span class="text-gray-600">{{ getDescription(log) }}</span>
              </td>
              <td>
                @if (log.oldValues || log.newValues) {
                  <button pButton icon="pi pi-eye" class="p-button-text p-button-sm" 
                          pTooltip="Ver cambios" (click)="showDetails(log)"></button>
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
      </p-card>
    </div>

    <!-- Details Dialog -->
    <p-dialog [(visible)]="detailsVisible" header="Detalles del Cambio" [modal]="true" [style]="{ width: '600px' }">
      @if (selectedLog) {
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">Fecha</label>
              <p>{{ selectedLog.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Usuario</label>
              <p>{{ selectedLog.userName || 'Sistema' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Módulo</label>
              <p>{{ selectedLog.module }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Acción</label>
              <p-tag [value]="getActionLabel(selectedLog.action)" [severity]="getActionSeverity(selectedLog.action)"></p-tag>
            </div>
          </div>

          @if (selectedLog.oldValues) {
            <div>
              <label class="text-sm font-medium text-gray-500">Valores Anteriores</label>
              <pre class="bg-gray-100 p-3 rounded-lg text-sm overflow-auto max-h-48">{{ selectedLog.oldValues | json }}</pre>
            </div>
          }

          @if (selectedLog.newValues) {
            <div>
              <label class="text-sm font-medium text-gray-500">Valores Nuevos</label>
              <pre class="bg-gray-100 p-3 rounded-lg text-sm overflow-auto max-h-48">{{ selectedLog.newValues | json }}</pre>
            </div>
          }

          @if (selectedLog.ipAddress) {
            <div>
              <label class="text-sm font-medium text-gray-500">IP</label>
              <p>{{ selectedLog.ipAddress }}</p>
            </div>
          }
        </div>
      }
    </p-dialog>
  `
})
export class AuditComponent implements OnInit {
  private auditService = inject(AuditService);

  logs = this.auditService.logs;
  totalCount = this.auditService.totalCount;
  isLoading = this.auditService.isLoading;
  modules = this.auditService.modules;

  filters: AuditFilter = {};
  detailsVisible = false;
  selectedLog: AuditLog | null = null;

  moduleOptions: string[] = [];

  actionOptions = [
    { label: 'Crear', value: 'CREATE' },
    { label: 'Actualizar', value: 'UPDATE' },
    { label: 'Eliminar', value: 'DELETE' },
    { label: 'Inicio Sesión', value: 'LOGIN' },
    { label: 'Cierre Sesión', value: 'LOGOUT' },
    { label: 'Anular', value: 'VOID' },
    { label: 'Exportar', value: 'EXPORT' },
    { label: 'Invitar', value: 'INVITE' },
    { label: 'Revocar', value: 'REVOKE' }
  ];

  ngOnInit() {
    this.loadLogs();
    this.auditService.getModules().subscribe(res => {
      this.moduleOptions = res.data;
    });
  }

  loadLogs() {
    this.auditService.getAll(this.filters).subscribe();
  }

  onLazyLoad(event: any) {
    this.filters.page = Math.floor(event.first / event.rows) + 1;
    this.filters.limit = event.rows;
    this.loadLogs();
  }

  clearFilters() {
    this.filters = {};
    this.loadLogs();
  }

  showDetails(log: AuditLog) {
    this.selectedLog = log;
    this.detailsVisible = true;
  }

  getActionLabel(action: AuditAction): string {
    const labels: Record<AuditAction, string> = {
      CREATE: 'Crear', UPDATE: 'Actualizar', DELETE: 'Eliminar', LOGIN: 'Inicio',
      LOGOUT: 'Cierre', VOID: 'Anular', EXPORT: 'Exportar', INVITE: 'Invitar', REVOKE: 'Revocar'
    };
    return labels[action] || action;
  }

  getActionSeverity(action: AuditAction): 'success' | 'info' | 'warning' | 'danger' {
    const map: Record<AuditAction, 'success' | 'info' | 'warning' | 'danger'> = {
      CREATE: 'success', UPDATE: 'info', DELETE: 'danger', LOGIN: 'info',
      LOGOUT: 'warning', VOID: 'danger', EXPORT: 'info', INVITE: 'success', REVOKE: 'danger'
    };
    return map[action] || 'info';
  }

  getDescription(log: AuditLog): string {
    if (log.entityType && log.entityId) {
      return `${log.entityType} (${log.entityId.substring(0, 8)}...)`;
    }
    return '-';
  }
}
