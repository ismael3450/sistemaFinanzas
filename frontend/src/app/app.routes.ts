import { Routes } from '@angular/router';
import { authGuard, guestGuard, organizationGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  // Auth routes (no guard, guest only)
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
        canActivate: [guestGuard]
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
        canActivate: [guestGuard]
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // Organizations (auth required, no org required)
  {
    path: 'organizations',
    loadComponent: () => import('./features/organizations/organizations.component').then(m => m.OrganizationsComponent),
    canActivate: [authGuard]
  },

  // Main app routes (auth + org required)
  {
    path: '',
    loadComponent: () => import('./features/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard, organizationGuard],
    children: [
      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Transactions
      {
        path: 'transactions',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/transactions/transactions-list/transactions-list.component').then(m => m.TransactionsListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./features/transactions/transaction-form/transaction-form.component').then(m => m.TransactionFormComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./features/transactions/transaction-form/transaction-form.component').then(m => m.TransactionFormComponent)
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./features/transactions/transaction-form/transaction-form.component').then(m => m.TransactionFormComponent)
          }
        ]
      },

      // Accounts
      {
        path: 'accounts',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/accounts/accounts-list/accounts-list.component').then(m => m.AccountsListComponent)
          }
        ]
      },

      // Categories
      {
        path: 'categories',
        loadComponent: () => import('./features/categories/categories-list/categories-list.component').then(m => m.CategoriesListComponent)
      },

      // Reports
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },

      // Audit (admin only)
      {
        path: 'audit',
        loadComponent: () => import('./features/audit/audit.component').then(m => m.AuditComponent),
        canActivate: [roleGuard],
        data: { roles: ['OWNER', 'ADMIN'] }
      },

      // Settings
      {
        path: 'settings',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
          },
          {
            path: 'members',
            loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
            canActivate: [roleGuard],
            data: { roles: ['OWNER', 'ADMIN'] }
          },
          {
            path: 'profile',
            loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
          }
        ]
      },

      // Default redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Fallback
  { path: '**', redirectTo: 'auth/login' }
];
