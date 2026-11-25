import { Component, OnInit, inject } from '@angular/core';
import { ApiService, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { fx } from '../utils/format';
import { DataTableComponent } from '../shared/data-table.component';
import { IconComponent } from '../shared/icon.component';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

type Tab = 'low' | 'out' | 'expiry';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [LayoutComponent, LoaderComponent, DataTableComponent, StatusBadgeComponent, IconComponent],
  template: `
    <app-layout title="Inventory">
      <div class="flex gap-2 mb-5">
        @for (t of tabs; track t.key) {
          <button
            type="button"
            (click)="setTab(t.key)"
            [class]="'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ' +
              (tab === t.key ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' : 'glass text-slate-600')"
          >
            <app-icon [name]="t.icon" [size]="15" /> {{ t.label }}
          </button>
        }
      </div>

      @if (loading) {
        <app-loader label="Loading" />
      } @else {
        @if (tab === 'expiry') {
          <app-table [columns]="['Product', 'Quantity', 'Expiry Date', 'Estimated Loss', 'Status']">
            @for (p of rows; track p.id) {
              <tr class="hover:bg-white/50">
                <td class="px-4 py-3 font-medium text-slate-700">{{ p.product_name }}</td>
                <td class="px-4 py-3 text-slate-500">{{ p.quantity }} {{ p.unit }}</td>
                <td class="px-4 py-3 text-slate-500">{{ p.expiry_date }}</td>
                <td class="px-4 py-3 text-red-600 font-medium">Rs {{ fx(p.estimated_loss) }}</td>
                <td class="px-4 py-3"><app-status-badge [status]="p.expiry_status" /></td>
              </tr>
            }
            @if (rows.length === 0) {
              <tr><td colspan="5" class="px-4 py-10 text-center text-slate-400 text-sm">Nothing expiring soon.</td></tr>
            }
          </app-table>
        } @else {
          <app-table [columns]="['Product', 'Supplier', 'Current Stock', 'Minimum', 'Suggested Reorder', 'Action']">
            @for (p of rows; track p.id) {
              <tr class="hover:bg-white/50">
                <td class="px-4 py-3 font-medium text-slate-700">{{ p.product_name }}</td>
                <td class="px-4 py-3 text-slate-500">{{ p.supplier_name || '—' }}</td>
                <td class="px-4 py-3 text-slate-700">{{ p.quantity }} {{ p.unit }}</td>
                <td class="px-4 py-3 text-slate-500">{{ p.minimum_stock }}</td>
                <td class="px-4 py-3 text-slate-700">{{ suggested(p) }}</td>
                <td class="px-4 py-3">
                  <button type="button" (click)="reorder(p.id)" class="flex items-center gap-1.5 text-xs font-medium bg-teal-50 text-teal-600 px-3 py-1.5 rounded-lg hover:bg-teal-100">
                    <app-icon name="send" [size]="12" /> Send Order
                  </button>
                </td>
              </tr>
            }
            @if (rows.length === 0) {
              <tr><td colspan="6" class="px-4 py-10 text-center text-slate-400 text-sm">All good here.</td></tr>
            }
          </app-table>
        }
      }
    </app-layout>
  `,
})
export class InventoryPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  fx = fx;
  tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'low', label: 'Low Stock', icon: 'triangle-alert' },
    { key: 'out', label: 'Out of Stock', icon: 'circle-x' },
    { key: 'expiry', label: 'Expiry Center', icon: 'calendar-clock' },
  ];

  tab: Tab = 'low';
  rows: any[] = [];
  loading = true;

  ngOnInit() { this.load(); }

  setTab(t: Tab) {
    this.tab = t;
    this.load();
  }

  load() {
    this.loading = true;
    const call = this.tab === 'low' ? this.api.getLowStock() : this.tab === 'out' ? this.api.getOutOfStock() : this.api.getExpiryCenter();
    call.then((res) => { this.rows = res.data; }).finally(() => { this.loading = false; });
  }

  suggested(p: any) {
    return p.suggested_reorder_qty || Math.max(p.minimum_stock * 2 - p.quantity, p.minimum_stock);
  }

  async reorder(productId: number) {
    try {
      const res = await this.api.sendReorder(productId);
      this.toast.success(`Reorder sent — ${res.data.requested_quantity} units requested.`);
    } catch (err) {
      this.toast.error(errMsg(err, 'Reorder failed.'));
    }
  }
}
