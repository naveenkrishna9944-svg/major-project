import { Component, OnInit, inject } from '@angular/core';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { fmtDateTime, fx } from '../utils/format';
import { DataTableComponent } from '../shared/data-table.component';
import { IconComponent } from '../shared/icon.component';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [LayoutComponent, LoaderComponent, DataTableComponent, IconComponent],
  template: `
    <app-layout title="Sales">
      @if (loading) {
        <app-loader label="Loading sales" />
      } @else {
        <app-table [columns]="['Invoice #', 'Customer', 'Employee', 'Total', 'Payment', 'Date', 'Actions']">
          @for (s of rows; track s.id) {
            <tr class="hover:bg-white/50">
              <td class="px-4 py-3 font-medium text-slate-700">{{ s.invoice_number }}</td>
              <td class="px-4 py-3 text-slate-500">{{ s.customer_name || 'Walk-in' }}</td>
              <td class="px-4 py-3 text-slate-500">{{ s.employee_name || '—' }}</td>
              <td class="px-4 py-3 text-slate-700 font-medium">Rs {{ fx(s.grand_total) }}</td>
              <td class="px-4 py-3 text-slate-500">{{ s.payment_method }}</td>
              <td class="px-4 py-3 text-slate-500">{{ fmtDateTime(s.sale_date) }}</td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button type="button" class="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><app-icon name="eye" [size]="14" /></button>
                  @if (auth.user?.role === 'Admin') {
                    <button type="button" (click)="remove(s.id)" class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><app-icon name="trash-2" [size]="14" /></button>
                  }
                </div>
              </td>
            </tr>
          }
          @if (rows.length === 0) {
            <tr><td colspan="7" class="px-4 py-10 text-center text-slate-400 text-sm">No sales recorded yet.</td></tr>
          }
        </app-table>
      }
    </app-layout>
  `,
})
export class SalesPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  fx = fx;
  fmtDateTime = fmtDateTime;

  rows: any[] = [];
  loading = true;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getSales().then((res) => { this.rows = res.data; }).finally(() => { this.loading = false; });
  }

  async remove(id: number) {
    if (!confirm('Delete this sale record?')) return;
    try {
      await this.api.deleteSale(id);
      this.toast.success('Sale deleted.');
      this.load();
    } catch (err) {
      this.toast.error(errMsg(err, 'Delete failed.'));
    }
  }
}
