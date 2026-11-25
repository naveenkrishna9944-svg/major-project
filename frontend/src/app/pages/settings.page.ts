import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ThemeService } from '../core/theme.service';
import { ToastService } from '../core/toast.service';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, LayoutComponent, LoaderComponent],
  template: `
    <app-layout title="Settings">
      @if (!form) {
        <app-loader label="Loading settings" />
      } @else {
        <form
          ngNoForm
          (submit)="submit($event)"
          class="anim-rise glass rounded-2xl p-6 max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          @for (f of fields; track f.key) {
            <div>
              <label class="text-xs font-medium text-slate-600 mb-1.5 block">{{ f.label }}</label>
              <input [type]="f.type" [(ngModel)]="form[f.key]" class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 outline-none text-sm" />
            </div>
          }
          <div class="sm:col-span-2">
            <label class="text-xs font-medium text-slate-600 mb-1.5 block">Address</label>
            <input [(ngModel)]="form.address" class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 outline-none text-sm" />
          </div>
          <div>
            <label class="text-xs font-medium text-slate-600 mb-1.5 block">Theme</label>
            <select [ngModel]="form.theme" (ngModelChange)="onTheme($event)" class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 outline-none text-sm">
              <option>Light</option><option>Dark</option>
            </select>
          </div>
          <div class="sm:col-span-2 flex justify-end">
            <button type="submit" [disabled]="saving" class="px-5 py-2.5 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-70">
              {{ saving ? 'Saving...' : 'Save Settings' }}
            </button>
          </div>
        </form>
      }
    </app-layout>
  `,
})
export class SettingsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private theme = inject(ThemeService);

  fields = [
    { key: 'store_name', label: 'Store Name', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'currency', label: 'Currency', type: 'text' },
    { key: 'tax_rate', label: 'Tax Rate (%)', type: 'number' },
    { key: 'invoice_prefix', label: 'Invoice Prefix', type: 'text' },
  ];

  form: any = null;
  saving = false;

  ngOnInit() {
    this.api.getSettings().then((res) => { this.form = { ...res.data, theme: this.theme.theme }; });
  }

  onTheme(value: string) {
    this.form.theme = value;
    this.theme.set(value);
  }

  async submit(e: Event) {
    e.preventDefault();
    this.saving = true;
    try {
      await this.api.updateSettings(this.form);
      this.toast.success('Settings updated.');
    } catch (err) {
      this.toast.error(errMsg(err, 'Update failed.'));
    } finally {
      this.saving = false;
    }
  }
}
