import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { IconComponent } from '../shared/icon.component';
import { LayoutComponent } from '../shared/layout.component';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [FormsModule, LayoutComponent, IconComponent],
  template: `
    <app-layout title="Change Password">
      <form ngNoForm (submit)="submit($event)" class="anim-rise glass rounded-2xl p-6 max-w-md space-y-4">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <app-icon name="lock" [size]="17" />
          </div>
          <p class="text-sm text-slate-500">Choose a strong password you don't use elsewhere.</p>
        </div>

        @for (f of fields; track f.key) {
          <div>
            <label class="text-xs font-medium text-slate-600 mb-1.5 block">{{ f.label }} *</label>
            <input
              required
              type="password"
              [(ngModel)]="form[f.key]"
              class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 focus:border-teal-600 outline-none text-sm"
            />
          </div>
        }

        <button type="submit" [disabled]="saving" class="w-full bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-70">
          {{ saving ? 'Updating...' : 'Update Password' }}
        </button>
      </form>
    </app-layout>
  `,
})
export class ChangePasswordPage {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  fields = [
    { key: 'current_password', label: 'Current Password' },
    { key: 'new_password', label: 'New Password' },
    { key: 'confirm_password', label: 'Confirm New Password' },
  ];

  form: any = { current_password: '', new_password: '', confirm_password: '' };
  saving = false;

  async submit(e: Event) {
    e.preventDefault();
    if (this.form.new_password !== this.form.confirm_password) {
      this.toast.error('New password and confirmation do not match.');
      return;
    }
    this.saving = true;
    try {
      await this.api.changePassword(this.form);
      this.toast.success('Password changed successfully.');
      this.form = { current_password: '', new_password: '', confirm_password: '' };
    } catch (err) {
      this.toast.error(errMsg(err, 'Failed to change password.'));
    } finally {
      this.saving = false;
    }
  }
}
