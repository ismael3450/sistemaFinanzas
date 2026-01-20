import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { BadgeModule } from 'primeng/badge';
import { MenuItem } from 'primeng/api';
import { AuthService, OrganizationService } from '../../core/services';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    AvatarModule,
    MenuModule,
    TooltipModule,
    RippleModule,
    BadgeModule
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Sidebar -->
      <aside
          class="fixed left-0 top-0 z-40 h-screen transition-all duration-300 bg-white border-r border-gray-200"
          [class.w-64]="!sidebarCollapsed()"
          [class.w-20]="sidebarCollapsed()">

        <!-- Logo -->
        <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          @if (!sidebarCollapsed()) {
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <i class="pi pi-wallet text-white"></i>
              </div>
              <span class="font-bold text-gray-800">FinControl</span>
            </div>
          } @else {
            <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
              <i class="pi pi-wallet text-white"></i>
            </div>
          }
          <button
              pRipple
              class="p-2 rounded-lg hover:bg-gray-100 transition-colors hidden lg:block"
              (click)="toggleSidebar()">
            <i class="pi" [class.pi-chevron-left]="!sidebarCollapsed()" [class.pi-chevron-right]="sidebarCollapsed()"></i>
          </button>
        </div>

        <!-- Organization Selector -->
        @if (!sidebarCollapsed() && activeOrg()) {
          <div class="p-4 border-b border-gray-200">
            <button
                pRipple
                class="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                (click)="goToOrganizations()">
              <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <span class="text-primary-600 font-semibold">{{ orgInitials() }}</span>
              </div>
              <div class="flex-1 text-left overflow-hidden">
                <p class="font-medium text-gray-800 truncate">{{ activeOrg()?.name }}</p>
                <p class="text-xs text-gray-500">{{ getRoleLabel(currentRole()) }}</p>
              </div>
              <i class="pi pi-chevron-down text-gray-400"></i>
            </button>
          </div>
        }

        <!-- Navigation -->
        <nav class="p-4 space-y-1 overflow-y-auto" style="height: calc(100vh - 180px);">
          @for (item of navItems; track item.route) {
            <!-- CORRECCIÓN: Ahora usamos canShowNavItem para filtrar items por rol -->
            @if (canShowNavItem(item)) {
              <a
                  pRipple
                  [routerLink]="item.route"
                  routerLinkActive="active-nav-item"
                  [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors border-l-4 border-transparent"
                  [pTooltip]="sidebarCollapsed() ? item.label : ''"
                  tooltipPosition="right">
                <i [class]="'pi ' + item.icon + ' text-lg'"></i>
                @if (!sidebarCollapsed()) {
                  <span class="font-medium">{{ item.label }}</span>
                }
              </a>
            }
          }
        </nav>
      </aside>

      <!-- Main Content -->
      <div
          class="transition-all duration-300"
          [class.ml-64]="!sidebarCollapsed()"
          [class.ml-20]="sidebarCollapsed()">

        <!-- Top Header -->
        <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div class="flex items-center gap-4">
            <button
                pRipple
                class="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                (click)="toggleSidebar()">
              <i class="pi pi-bars"></i>
            </button>
            <h1 class="text-lg font-semibold text-gray-800">{{ pageTitle() }}</h1>
          </div>

          <div class="flex items-center gap-4">
            <!-- Notifications -->
            <button pRipple class="p-2 rounded-lg hover:bg-gray-100 relative">
              <i class="pi pi-bell text-gray-600"></i>
              <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <!-- User Menu -->
            <div class="relative">
              <button
                  pRipple
                  class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100"
                  (click)="userMenu.toggle($event)">
                <p-avatar
                    [label]="userInitials()"
                    styleClass="bg-primary-100 text-primary-600"
                    shape="circle">
                </p-avatar>
                @if (!sidebarCollapsed()) {
                  <div class="text-left hidden sm:block">
                    <p class="text-sm font-medium text-gray-800">{{ userName() }}</p>
                    <p class="text-xs text-gray-500">{{ userEmail() }}</p>
                  </div>
                }
                <i class="pi pi-chevron-down text-gray-400 hidden sm:block"></i>
              </button>
              <p-menu #userMenu [model]="userMenuItems" [popup]="true"></p-menu>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main class="p-6">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    /* CORRECCIÓN: Clase específica para nav activo */
    .active-nav-item {
      background-color: rgba(59, 130, 246, 0.1) !important;
      color: #3b82f6 !important;
      border-left-color: #3b82f6 !important;
    }
  `]
})
export class LayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly orgService = inject(OrganizationService);
  private readonly router = inject(Router);

  sidebarCollapsed = signal(false);
  pageTitle = signal('Dashboard');

  readonly activeOrg = this.orgService.activeOrganization;
  readonly currentRole = this.orgService.currentRole;

  // Navigation items - Todos los items del menú
  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/dashboard' },
    { label: 'Transacciones', icon: 'pi-arrow-right-arrow-left', route: '/transactions' },
    { label: 'Cuentas', icon: 'pi-wallet', route: '/accounts' },
    { label: 'Categorías', icon: 'pi-tags', route: '/categories' },
    { label: 'Reportes', icon: 'pi-chart-bar', route: '/reports' },
    { label: 'Miembros', icon: 'pi-users', route: '/settings/members', roles: ['OWNER', 'ADMIN'] },
    { label: 'Auditoría', icon: 'pi-history', route: '/audit', roles: ['OWNER', 'ADMIN'] },
    { label: 'Configuración', icon: 'pi-cog', route: '/settings' },
  ];

  readonly userMenuItems: MenuItem[] = [
    { label: 'Mi Perfil', icon: 'pi pi-user', command: () => this.router.navigate(['/settings/profile']) },
    { label: 'Organizaciones', icon: 'pi pi-building', command: () => this.goToOrganizations() },
    { separator: true },
    { label: 'Cerrar Sesión', icon: 'pi pi-sign-out', command: () => this.logout() }
  ];

  userName = computed(() => this.authService.userFullName());
  userInitials = computed(() => this.authService.userInitials());
  userEmail = computed(() => this.authService.currentUser()?.email || '');

  orgInitials = computed(() => {
    const name = this.activeOrg()?.name || '';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  });

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  goToOrganizations(): void {
    this.router.navigate(['/organizations']);
  }

  logout(): void {
    this.authService.logout();
  }

  /**
   * CORRECCIÓN PRINCIPAL: Este método ahora se usa en el template
   * Verifica si el usuario tiene el rol necesario para ver el item
   */
  canShowNavItem(item: NavItem): boolean {
    // Si no tiene restricción de roles, mostrar a todos
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    // Verificar si el rol actual está en la lista de roles permitidos
    const currentRole = this.currentRole();
    return currentRole ? item.roles.includes(currentRole) : false;
  }

  /**
   * Obtener etiqueta legible del rol
   */
  getRoleLabel(role: string | null): string {
    if (!role) return '';
    const labels: Record<string, string> = {
      OWNER: 'Propietario',
      ADMIN: 'Administrador',
      TREASURER: 'Tesorero',
      MEMBER: 'Miembro',
      VIEWER: 'Visor'
    };
    return labels[role] || role;
  }
}