import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div class="absolute -top-24 -left-24 w-72 h-72 bg-teal-400/15 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-400/15 rounded-full blur-3xl"></div>

      <div class="glass anim-rise-lg w-full max-w-md rounded-3xl p-8 relative">
        <div class="flex flex-col items-center mb-7">
          <div class="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/30 mb-3 text-white">
            <app-icon name="store" [size]="26" />
          </div>
          <h1 class="text-xl font-semibold text-slate-800">Mart Management System</h1>
          <p class="text-sm text-slate-500 mt-1">Sign in to your account</p>
        </div>

        <form ngNoForm (submit)="submit($event)" class="space-y-4">
          <div>
            <label class="text-xs font-medium text-slate-600 mb-1.5 block">Email</label>
            <div class="relative">
              <app-icon name="mail" [size]="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                [(ngModel)]="email"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/70 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm transition"
                placeholder="you@mart.com"
              />
            </div>
          </div>

          <div>
            <label class="text-xs font-medium text-slate-600 mb-1.5 block">Password</label>
            <div class="relative">
              <app-icon name="lock" [size]="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                [(ngModel)]="password"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/70 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            [disabled]="loading"
            class="press w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-70"
          >
            @if (loading) { <app-icon name="loader-circle" [size]="16" class="animate-spin" /> }
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  email = '';
  password = '';
  loading = false;

  async submit(e: Event) {
    e.preventDefault();
    this.loading = true;
    try {
      await this.auth.login(this.email, this.password);
      this.toast.success('Welcome back!');
      this.router.navigateByUrl('/dashboard');
    } catch (err) {
      this.toast.error(errMsg(err, 'Login failed.'));
    } finally {
      this.loading = false;
    }
  }
}
