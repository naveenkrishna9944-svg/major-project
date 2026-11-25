import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { DataTableComponent } from '../shared/data-table.component';
import { IconComponent } from '../shared/icon.component';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

const EMPTY = { id: null, supplier_name: '', company_name: '', phone: '', email: '', address: '', city: '', country: '', notes: '' };

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [FormsModule, LayoutComponent, LoaderComponent, DataTableComponent, StatusBadgeComponent, IconComponent],
  template: `
    <app-layout title="Suppliers">
      <div class="flex justify-end mb-5">
        <button
          type="button"
          (click)="openAdd()"
          class="press flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <app-icon name="plus" [size]="16" /> Add Supplier
        </button>
      </div>

      @if (loading) {
        <app-loader label="Loading suppliers" />
      } @else {
        <app-table [columns]="['Company', 'Contact', 'Phone', 'Email', 'City', 'Status', 'Actions']">
          @for (s of rows; track s.id) {
            <tr class="hover:bg-white/50">
              <td class="px-4 py-3 font-medium text-slate-700">{{ s.company_name || s.supplier_name }}</td>
              <td class="px-4 py-3 text-slate-500">{{ s.supplier_name }}</td>
              <td class="px-4 py-3 text-slate-500">{{ s.phone || '—' }}</td>
              <td class="px-4 py-3 text-slate-500">{{ s.email || '—' }}</td>
              <td class="px-4 py-3 text-slate-500">{{ s.city || '—' }}</td>
              <td class="px-4 py-3"><app-status-badge [status]="s.status" /></td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button type="button" (click)="openEdit(s)" class="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><app-icon name="pencil" [size]="14" /></button>
                  <button type="button" (click)="remove(s.id)" class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><app-icon name="trash-2" [size]="14" /></button>
                </div>
              </td>
            </tr>
          }
          @if (rows.length === 0) {
            <tr><td colspan="7" class="px-4 py-10 text-center text-slate-400 text-sm">No suppliers found.</td></tr>
          }
        </app-table>
      }

      @if (modalOpen) {
        <div class="anim-fade fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="modalOpen = false">
          <div class="anim-pop glass w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold text-slate-800">{{ form.id ? 'Edit Supplier' : 'Add Supplier' }}</h2>
              <button type="button" (click)="modalOpen = false" class="text-slate-400"><app-icon name="x" [size]="20" /></button>
            </div>
            <form ngNoForm (submit)="submit($event)" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @for (f of fields; track f.key) {
                <div>
                  <label class="text-xs font-medium text-slate-600 mb-1.5 block">{{ f.label }}</label>
                  <input [required]="!!f.required" [(ngModel)]="form[f.key]" class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 outline-none text-sm" />
                </div>
              }
              <div class="sm:col-span-2">
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Address</label>
                <input [(ngModel)]="form.address" class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 outline-none text-sm" />
              </div>
              <div class="sm:col-span-2">
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Notes</label>
                <textarea [(ngModel)]="form.notes" rows="2" class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 outline-none text-sm"></textarea>
              </div>
              <div class="sm:col-span-2 flex justify-end gap-3">
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
export class SuppliersPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  fields = [
    { key: 'supplier_name', label: 'Contact Person *', required: true },
    { key: 'company_name', label: 'Company Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'city', label: 'City' },
    { key: 'country', label: 'Country' },
  ];

  rows: any[] = [];
  loading = true;
  modalOpen = false;
  form: any = { ...EMPTY };
  saving = false;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getSuppliers().then((res) => { this.rows = res.data; }).finally(() => { this.loading = false; });
  }

  openAdd() { this.form = { ...EMPTY }; this.modalOpen = true; }
  openEdit(s: any) { this.form = { ...s }; this.modalOpen = true; }

  async remove(id: number) {
    if (!confirm('Delete this supplier?')) return;
    try {
      await this.api.deleteSupplier(id);
      this.toast.success('Supplier deleted.');
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
        await this.api.updateSupplier(this.form);
        this.toast.success('Supplier updated.');
      } else {
        await this.api.addSupplier(this.form);
        this.toast.success('Supplier added.');
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
