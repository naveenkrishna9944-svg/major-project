import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <header class="glass sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3.5 mb-6 rounded-2xl">
      <div class="flex items-center gap-3">
        <button
          type="button"
          (click)="menuClick.emit()"
          class="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
        >
          <app-icon name="menu" [size]="19" />
        </button>
        <div>
          <h1 class="text-lg font-semibold text-slate-800">{{ title }}</h1>
          <p class="text-xs text-slate-400">Welcome back, {{ auth.user?.name?.split(' ')?.[0] }}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          (click)="theme.toggle()"
          class="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
          title="Toggle dark mode"
        >
          <app-icon [name]="theme.theme === 'Dark' ? 'sun' : 'moon'" [size]="17" />
        </button>
        <a
          routerLink="/notifications"
          class="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
        >
          <app-icon name="bell" [size]="18" />
          @if (unread > 0) {
            <span class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {{ unread > 9 ? '9+' : unread }}
            </span>
          }
        </a>
        <a routerLink="/change-password" class="flex items-center gap-2 pl-3 border-l border-slate-200 hover:opacity-80 transition">
          <div class="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
            <app-icon name="user-round" [size]="16" />
          </div>
          <div class="hidden sm:block">
            <p class="text-sm font-medium text-slate-700 leading-tight">{{ auth.user?.name }}</p>
            <p class="text-[11px] text-slate-400">{{ auth.user?.role }}</p>
          </div>
        </a>
      </div>
    </header>
  `,
})
export class NavbarComponent implements OnInit {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private api = inject(ApiService);

  @Input() title = '';
  @Output() menuClick = new EventEmitter<void>();

  unread = 0;

  ngOnInit() {
    this.api.getNotifications()
      .then((res) => { this.unread = res.data.unread_count; })
      .catch(() => {});
  }
}
