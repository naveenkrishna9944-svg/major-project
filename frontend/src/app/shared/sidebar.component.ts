import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { IconComponent } from './icon.component';

const MENU = [
  { to: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { to: '/products', label: 'Products', icon: 'package' },
  { to: '/categories', label: 'Categories', icon: 'layers' },
  { to: '/inventory', label: 'Inventory', icon: 'boxes' },
  { to: '/suppliers', label: 'Suppliers', icon: 'truck' },
  { to: '/customers', label: 'Customers', icon: 'users' },
  { to: '/pos', label: 'POS', icon: 'shopping-cart' },
  { to: '/sales', label: 'Sales', icon: 'receipt' },
  { to: '/purchases', label: 'Purchases', icon: 'clipboard-list' },
  { to: '/reports', label: 'Reports', icon: 'chart-bar' },
  { to: '/employees', label: 'Employees', icon: 'user-cog', adminOnly: true },
  { to: '/notifications', label: 'Notifications', icon: 'bell' },
  { to: '/settings', label: 'Settings', icon: 'settings', adminOnly: true },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <!-- Mobile overlay -->
    @if (open) {
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden" (click)="closed.emit()"></div>
    }

    <aside
      [class]="'glass-dark fixed lg:static top-0 left-0 h-screen w-64 z-40 flex flex-col text-slate-100 transition-transform duration-300 lg:translate-x-0 ' + (open ? 'translate-x-0' : '-translate-x-full')"
    >
      <div class="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-teal-500/90 flex items-center justify-center">
            <app-icon name="store" [size]="18" />
          </div>
          <div>
            <p class="font-semibold text-sm leading-tight">Mart Manager</p>
            <p class="text-[11px] text-slate-400">Retail Suite</p>
          </div>
        </div>
        <button type="button" class="lg:hidden text-slate-400" (click)="closed.emit()"><app-icon name="x" [size]="20" /></button>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        @for (m of menu; track m.to) {
          @if (!m.adminOnly || auth.user?.role === 'Admin') {
            <a
              [routerLink]="m.to"
              (click)="closed.emit()"
              [class]="'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ' +
                (isActive(m.to) ? 'bg-teal-500/90 text-white shadow-lg shadow-teal-900/30' : 'text-slate-300 hover:bg-white/5 hover:text-white')"
            >
              <app-icon [name]="m.icon" [size]="17" />
              {{ m.label }}
            </a>
          }
        }
      </nav>

      <div class="px-3 py-4 border-t border-white/10">
        <button
          type="button"
          (click)="logout()"
          class="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <app-icon name="log-out" [size]="17" />
          Logout
        </button>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  menu = MENU;

  isActive(to: string) {
    const path = this.router.url.split('?')[0].split('#')[0];
    return path === to || path.startsWith(to + '/');
  }

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
