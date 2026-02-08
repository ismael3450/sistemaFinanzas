import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { BadgeModule } from 'primeng/badge';
import { MenuItem } from 'primeng/api';
import { filter } from 'rxjs';
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
    <div class="min-h-screen bg-[#fafbfc]">
      <!-- Sidebar -->
      <aside
          class="fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-out bg-white border-r border-gray-100"
          [class.w-[260px]]="!sidebarCollapsed()"
          [class.w-[72px]]="sidebarCollapsed()">

        <!-- Logo Section -->
        <div class="h-16 flex items-center px-5 border-b border-gray-100 bg-white"
             [class.justify-center]="sidebarCollapsed()"
             [class.justify-between]="!sidebarCollapsed()">
          @if (!sidebarCollapsed()) {
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md shadow-indigo-200">
                <i class="pi pi-chart-line text-white text-base leading-none"></i>
              </div>
              <div class="flex flex-col leading-tight">
                <span class="font-bold text-gray-900 text-base tracking-tight">FinControl</span>
                <span class="text-[10px] text-gray-400 block -mt-0.5">Sistema Financiero</span>
              </div>
            </div>
          } @else {
            <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md shadow-indigo-200">
              <i class="pi pi-chart-line text-white text-base leading-none"></i>
            </div>
          }
          <button
              pRipple
              class="p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600 hidden lg:block"
              [class.invisible]="sidebarCollapsed()"
              (click)="toggleSidebar()">
            <i class="pi pi-chevron-left text-xs"></i>
          </button>
        </div>

        <!-- Organization Selector -->
        @if (!sidebarCollapsed() && activeOrg()) {
          <div class="p-4 pt-5">
            <button
                pRipple
                class="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-200 border border-gray-100 shadow-sm"                
                (click)="goToOrganizations()">
              <div class="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white">
                <span class="text-indigo-600 font-semibold text-sm leading-none">{{ orgInitials() }}</span>
              </div>
              <div class="flex-1 text-left overflow-hidden min-w-0">
                <p class="font-semibold text-gray-800 text-sm truncate leading-5">{{ activeOrg()?.name }}</p>
                <p class="text-xs text-gray-500">{{ getRoleLabel(currentRole()) }}</p>
              </div>
              <i class="pi pi-chevron-right text-gray-300 text-xs"></i>
            </button>
          </div>
        }

        <!-- Navigation -->
        <nav class="px-3 pb-4 space-y-1 overflow-y-auto"
             [style.height]="sidebarCollapsed() ? 'calc(100vh - 80px)' : 'calc(100vh - 180px)'">
          @if (!sidebarCollapsed()) {
            <p class="px-3 pb-2 text-[11px] uppercase tracking-[0.16em] text-gray-400 font-semibold">
              Menú principal
            </p>
          }
          @for (item of navItems; track item.route) {
            @if (canShowNavItem(item)) {
                <a
                  pRipple
                  [routerLink]="item.route"
                  routerLinkActive="nav-active"
                  [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                  class="group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 w-full border border-transparent hover:border-gray-100"                  
                  [class.justify-center]="sidebarCollapsed()"
                  [pTooltip]="sidebarCollapsed() ? item.label : ''"
                  tooltipPosition="right">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center transition-colors group-hover:bg-white group-hover:shadow-sm flex-shrink-0">
                    <i [class]="'pi ' + item.icon + ' text-[15px] leading-none'"></i>
                </div>
                @if (!sidebarCollapsed()) {
                  <span class="font-medium text-sm leading-5">{{ item.label }}</span>
                }
              </a>
            }
          }
        </nav>

        <!-- Collapse Button (visible when collapsed) -->
        @if (sidebarCollapsed()) {
          <div class="absolute bottom-4 left-0 right-0 flex justify-center">
            <button
                pRipple
                class="p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600"
                (click)="toggleSidebar()">
              <i class="pi pi-chevron-right text-xs"></i>
            </button>
          </div>
        }
      </aside>

      <!-- Main Content -->
      <div
          class="transition-all duration-300 ease-out"
          [class.ml-[260px]]="!sidebarCollapsed()"
          [class.ml-[72px]]="sidebarCollapsed()">

        <!-- Top Header -->
        <header class="h-16 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm flex items-center justify-between px-6 sticky top-0 z-30">          <div class="flex items-center gap-4">
            <button
                pRipple
                class="lg:hidden p-2 rounded-lg hover:bg-gray-50 text-gray-600"
                (click)="toggleSidebar()">
              <i class="pi pi-bars"></i>
            </button>
          <div class="flex flex-col">
            <span class="text-[10px] uppercase tracking-[0.2em] text-gray-400">Sección</span>
              <h1 class="text-lg font-semibold text-gray-900 tracking-tight">{{ pageTitle() }}</h1>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Quick Actions -->
            <button pRipple
                    class="p-2.5 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors relative"
                    routerLink="/transactions/new"
                    pTooltip="Nueva Transacción"
                    tooltipPosition="bottom">
              <i class="pi pi-plus text-sm"></i>
            </button>

            <!-- Notifications -->
            <button pRipple class="p-2.5 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors relative">
              <i class="pi pi-bell text-sm"></i>
              <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </button>

            <!-- Divider -->
            <div class="w-px h-8 bg-gray-200 mx-1"></div>

            <!-- User Menu -->
            <div class="relative">
              <button
                  pRipple
                  type="button"
                  class="flex items-center gap-3 p-1.5 pr-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"                 
                  (click)="userMenu.toggle($event)">
                <div class="w-9 h-9 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm ring-2 ring-white leading-none">                  
                  {{ userInitials() }}
                </div>
                <div class="text-left hidden sm:block leading-tight">
                  <p class="text-sm font-medium text-gray-800 leading-5">{{ userName() }}</p>
                  <p class="text-[11px] text-gray-500">{{ userEmail() }}</p>
                </div>
                <i class="pi pi-chevron-down text-gray-400 text-[10px] hidden sm:block ml-1"></i>
              </button>
              <p-menu #userMenu [model]="userMenuItems" [popup]="true" appendTo="body"></p-menu>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main class="p-6 min-h-[calc(100vh-64px)]">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    /* Active nav item styling */
    .nav-active {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%) !important;
      color: #4f46e5 !important;

      > div {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%) !important;
      }

      i {
        color: #6366f1 !important;
      }

      span {
        color: #4338ca !important;
        font-weight: 600 !important;
      }
    }

    /* Smooth scrollbar for nav */
    nav::-webkit-scrollbar {
      width: 4px;
    }

    nav::-webkit-scrollbar-track {
      background: transparent;
    }

    nav::-webkit-scrollbar-thumb {
      background: #e5e7eb;
      border-radius: 100px;
    }
  `]
})
export class LayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly orgService = inject(OrganizationService);
  private readonly router = inject(Router);

  sidebarCollapsed = signal(false);
  pageTitle = signal('Dashboard');
  currentRoute = signal('');

  readonly activeOrg = this.orgService.activeOrganization;
  readonly currentRole = this.orgService.currentRole;

  // Navigation items - Todos los items del menú
  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/dashboard' },
    { label: 'Transacciones', icon: 'pi-arrow-right-arrow-left', route: '/transactions' },
    { label: 'Cuentas', icon: 'pi-wallet', route: '/accounts' },
    { label: 'Categorías', icon: 'pi-tags', route: '/categories' },
    { label: 'Métodos de Pago', icon: 'pi-credit-card', route: '/payment-methods', roles: ['OWNER', 'ADMIN', 'TREASURER'] },
    { label: 'Reportes', icon: 'pi-chart-bar', route: '/reports' },
    { label: 'Miembros', icon: 'pi-users', route: '/settings/members', roles: ['OWNER', 'ADMIN'] },
    { label: 'Auditoría', icon: 'pi-history', route: '/audit', roles: ['OWNER', 'ADMIN'] },
    { label: 'Configuración', icon: 'pi-cog', route: '/settings' },
  ];

  readonly userMenuItems: MenuItem[] = [
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

  constructor() {
    // Listen to route changes to update page title
    this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute.set(event.url);
      this.updatePageTitle(event.url);
    });
  }

  private updatePageTitle(url: string): void {
    const titleMap: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/transactions': 'Transacciones',
      '/transactions/new': 'Nueva Transacción',
      '/accounts': 'Cuentas',
      '/categories': 'Categorías',
      '/payment-methods': 'Métodos de Pago',
      '/reports': 'Reportes',
      '/settings/members': 'Miembros',
      '/audit': 'Auditoría',
      '/settings': 'Configuración',
      '/settings/profile': 'Mi Perfil'
    };

    // Find matching title
    const matchingKey = Object.keys(titleMap).find(key => url.startsWith(key));
    this.pageTitle.set(matchingKey ? titleMap[matchingKey] : 'Dashboard');
  }

  isRouteActive(route: string): boolean {
    return this.currentRoute().startsWith(route);
  }

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
    if (!role) return 'Cargando...';
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