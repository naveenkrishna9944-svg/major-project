import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage) },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage) },
  { path: 'products', canActivate: [authGuard], loadComponent: () => import('./pages/products.page').then((m) => m.ProductsPage) },
  { path: 'categories', canActivate: [authGuard], loadComponent: () => import('./pages/categories.page').then((m) => m.CategoriesPage) },
  { path: 'inventory', canActivate: [authGuard], loadComponent: () => import('./pages/inventory.page').then((m) => m.InventoryPage) },
  { path: 'suppliers', canActivate: [authGuard], loadComponent: () => import('./pages/suppliers.page').then((m) => m.SuppliersPage) },
  { path: 'customers', canActivate: [authGuard], loadComponent: () => import('./pages/customers.page').then((m) => m.CustomersPage) },
  { path: 'pos', canActivate: [authGuard], loadComponent: () => import('./pages/pos.page').then((m) => m.PosPage) },
  { path: 'sales', canActivate: [authGuard], loadComponent: () => import('./pages/sales.page').then((m) => m.SalesPage) },
  { path: 'purchases', canActivate: [authGuard], loadComponent: () => import('./pages/purchases.page').then((m) => m.PurchasesPage) },
  { path: 'reports', canActivate: [authGuard], loadComponent: () => import('./pages/reports.page').then((m) => m.ReportsPage) },
  { path: 'employees', canActivate: [authGuard], data: { adminOnly: true }, loadComponent: () => import('./pages/employees.page').then((m) => m.EmployeesPage) },
  { path: 'notifications', canActivate: [authGuard], loadComponent: () => import('./pages/notifications.page').then((m) => m.NotificationsPage) },
  { path: 'settings', canActivate: [authGuard], data: { adminOnly: true }, loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPage) },
  { path: 'change-password', canActivate: [authGuard], loadComponent: () => import('./pages/change-password.page').then((m) => m.ChangePasswordPage) },
  { path: '**', redirectTo: 'dashboard' },
];
