import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { fmtDate, fx } from '../utils/format';
import { DataTableComponent } from '../shared/data-table.component';
import { IconComponent } from '../shared/icon.component';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';

const EMPTY = { id: null, customer_name: '', phone: '', email: '', address: '', city: '', notes: '' };

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [FormsModule, LayoutComponent, LoaderComponent, DataTableComponent, IconComponent],
  template: `
    <app-layout title="Customers">
      <div class="flex justify-end mb-5">
        <button
          type="button"
          (click)="openAdd()"
          class="press flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <app-icon name="plus" [size]="16" /> Add Customer
        </button>
      </div>

      @if (loading) {
        <app-loader label="Loading customers" />
      } @else {
        <app-table [columns]="['Name', 'Phone', 'Email', 'Total Purchases', 'Total Spending', 'Last Purchase', 'Actions']">
          @for (c of rows; track c.id) {
            <tr class="hover:bg-white/50">
              <td class="px-4 py-3 font-medium text-slate-700">{{ c.customer_name }}</td>
              <td class="px-4 py-3 text-slate-500">{{ c.phone || '—' }}</td>
              <td class="px-4 py-3 text-slate-500">{{ c.email || '—' }}</td>
              <td class="px-4 py-3 text-slate-500">{{ c.total_purchases }}</td>
              <td class="px-4 py-3 text-slate-700">Rs {{ fx(c.total_spending) }}</td>
              <td class="px-4 py-3 text-slate-500">{{ c.last_purchase_date ? fmtDate(c.last_purchase_date) : '—' }}</td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button type="button" (click)="openEdit(c)" class="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><app-icon name="pencil" [size]="14" /></button>
                  <button type="button" (click)="remove(c.id)" class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><app-icon name="trash-2" [size]="14" /></button>
                </div>
              </td>
            </tr>
          }
          @if (rows.length === 0) {
            <tr><td colspan="7" class="px-4 py-10 text-center text-slate-400 text-sm">No customers found.</td></tr>
          }
        </app-table>
      }

      @if (modalOpen) {
        <div class="anim-fade fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="modalOpen = false">
          <div class="anim-pop glass w-full max-w-md rounded-2xl p-6" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold text-slate-800">{{ form.id ? 'Edit Customer' : 'Add Customer' }}</h2>
              <button type="button" (click)="modalOpen = false" class="text-slate-400"><app-icon name="x" [size]="20" /></button>
            </div>
            <form ngNoForm (submit)="submit($event)" class="space-y-4">
              @for (f of fields; track f.key) {
                <div>
                  <label class="text-xs font-medium text-slate-600 mb-1.5 block">{{ f.label }}</label>
                  <input [required]="!!f.required" [(ngModel)]="form[f.key]" class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 outline-none text-sm" />
                </div>
              }
              <div class="flex justify-end gap-3">
                <button type="button" (click)="modalOpen = false" class="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" [disabled]="saving" class="px-5 py-2.5 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-70">
                  {{ saving ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </app-layout>
  `,
})
export class CustomersPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  fx = fx;
  fmtDate = fmtDate;
  fields = [
    { key: 'customer_name', label: 'Full Name *', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'city', label: 'City' },
  ];

  rows: any[] = [];
  loading = true;
  modalOpen = false;
  form: any = { ...EMPTY };
  saving = false;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getCustomers().then((res) => { this.rows = res.data; }).finally(() => { this.loading = false; });
  }

  openAdd() { this.form = { ...EMPTY }; this.modalOpen = true; }
  openEdit(c: any) { this.form = { ...c }; this.modalOpen = true; }

  async remove(id: number) {
    if (!confirm('Delete this customer?')) return;
    try {
      await this.api.deleteCustomer(id);
      this.toast.success('Customer deleted.');
      this.load();
    } catch (err) {
      this.toast.error(errMsg(err, 'Delete failed.'));
    }
  }

  async submit(e: Event) {
    e.preventDefault();
    this.saving = true;
    try {
      if (this.form.id) {
        await this.api.updateCustomer(this.form);
        this.toast.success('Customer updated.');
      } else {
        await this.api.addCustomer(this.form);
        this.toast.success('Customer added.');
      }
      this.modalOpen = false;
      this.load();
    } catch (err) {
      this.toast.error(errMsg(err, 'Save failed.'));
    } finally {
      this.saving = false;
    }
  }
}
