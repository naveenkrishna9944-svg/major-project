import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { fmtDate, fx, toIsoDay } from '../utils/format';
import { exportToCSV } from '../utils/export-csv';
import { exportTablePDF } from '../utils/export-pdf';
import { ChartComponent, horizontalBarConfig } from '../shared/chart.component';
import { DataTableComponent } from '../shared/data-table.component';
import { IconComponent } from '../shared/icon.component';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

type Tab = 'sales' | 'products' | 'inventory' | 'customers' | 'suppliers';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule, LayoutComponent, LoaderComponent, DataTableComponent, StatusBadgeComponent, IconComponent, ChartComponent],
  template: `
    <app-layout title="Reports">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div class="flex gap-2 flex-wrap">
          @for (t of tabs; track t.key) {
            <button
              type="button"
              (click)="setTab(t.key)"
              [class]="'px-4 py-2.5 rounded-xl text-sm font-medium transition ' +
                (tab === t.key ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20' : 'glass text-slate-600')"
            >{{ t.label }}</button>
          }
        </div>
        <div class="flex gap-2">
          <button type="button" (click)="exportCsv()" [disabled]="!data" class="flex items-center gap-2 text-sm font-medium bg-white/70 border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-white disabled:opacity-50">
            <app-icon name="download" [size]="15" /> CSV
          </button>
          <button type="button" (click)="exportPdf()" [disabled]="!data" class="flex items-center gap-2 text-sm font-medium bg-white/70 border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-white disabled:opacity-50">
            <app-icon name="file-down" [size]="15" /> PDF
          </button>
        </div>
      </div>

      @if (tab === 'sales') {
        <div class="glass rounded-2xl p-4 mb-5 flex flex-wrap items-end gap-3">
          <div>
            <label class="text-xs font-medium text-slate-600 mb-1 block">From</label>
            <input type="date" [(ngModel)]="from" class="px-3 py-2 rounded-lg bg-white/70 border border-slate-200 outline-none text-sm" />
          </div>
          <div>
            <label class="text-xs font-medium text-slate-600 mb-1 block">To</label>
            <input type="date" [(ngModel)]="to" class="px-3 py-2 rounded-lg bg-white/70 border border-slate-200 outline-none text-sm" />
          </div>
          <button type="button" (click)="load()" class="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium">Apply</button>
        </div>
      }

      @if (loading) {
        <app-loader label="Generating report" />
      } @else if (data) {
        @if (tab === 'sales') {
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <div class="glass rounded-xl p-4 text-center"><p class="text-xl font-bold text-slate-800">{{ data.summary.invoice_count }}</p><p class="text-xs text-slate-500 mt-1">Invoices</p></div>
            <div class="glass rounded-xl p-4 text-center"><p class="text-xl font-bold text-slate-800">Rs {{ fx(data.summary.revenue) }}</p><p class="text-xs text-slate-500 mt-1">Revenue</p></div>
            <div class="glass rounded-xl p-4 text-center"><p class="text-xl font-bold text-slate-800">Rs {{ fx(data.summary.profit) }}</p><p class="text-xs text-slate-500 mt-1">Profit</p></div>
            <div class="glass rounded-xl p-4 text-center"><p class="text-xl font-bold text-slate-800">Rs {{ fx(data.summary.avg_invoice) }}</p><p class="text-xs text-slate-500 mt-1">Avg. Invoice</p></div>
          </div>
          <app-table [columns]="['Invoice #', 'Customer', 'Employee', 'Total', 'Payment', 'Date']">
            @for (s of data.sales; track s.id) {
              <tr class="hover:bg-white/50">
                <td class="px-4 py-3 font-medium text-slate-700">{{ s.invoice_number }}</td>
                <td class="px-4 py-3 text-slate-500">{{ s.customer_name || 'Walk-in' }}</td>
                <td class="px-4 py-3 text-slate-500">{{ s.employee_name || '—' }}</td>
                <td class="px-4 py-3 text-slate-700">Rs {{ fx(s.grand_total) }}</td>
                <td class="px-4 py-3 text-slate-500">{{ s.payment_method }}</td>
                <td class="px-4 py-3 text-slate-500">{{ fmtDate(s.sale_date) }}</td>
              </tr>
            }
            @if (data.sales.length === 0) {
              <tr><td colspan="6" class="px-4 py-10 text-center text-slate-400 text-sm">No sales in this range.</td></tr>
            }
          </app-table>
        }

        @if (tab === 'products') {
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div class="glass rounded-2xl p-5">
              <h3 class="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><app-icon name="chart-bar" [size]="15" /> Best Selling Products</h3>
              <app-chart [config]="bestConfig" [height]="280" />
            </div>
            <div class="glass rounded-2xl p-5 overflow-x-auto">
              <h3 class="text-sm font-semibold text-slate-700 mb-4">Slow Moving Products</h3>
              <table class="w-full text-sm">
                <thead><tr class="text-left text-xs text-slate-500 border-b border-slate-200"><th class="py-2">Product</th><th class="py-2">Stock</th><th class="py-2">Sold</th></tr></thead>
                <tbody class="divide-y divide-slate-100">
                  @for (p of data.slow_moving; track p.id) {
                    <tr><td class="py-2 text-slate-700">{{ p.product_name }}</td><td class="py-2 text-slate-500">{{ p.quantity }}</td><td class="py-2 text-slate-500">{{ p.units_sold }}</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        @if (tab === 'inventory') {
          <div class="mb-5">
            <div class="glass rounded-xl p-4 text-center inline-block min-w-48"><p class="text-xl font-bold text-slate-800">Rs {{ fx(data.total_stock_value) }}</p><p class="text-xs text-slate-500 mt-1">Total Stock Value</p></div>
          </div>
          <app-table [columns]="['Product', 'SKU', 'Category', 'Qty', 'Stock Value', 'Status']">
            @for (p of data.products; track p.id) {
              <tr class="hover:bg-white/50">
                <td class="px-4 py-3 font-medium text-slate-700">{{ p.product_name }}</td>
                <td class="px-4 py-3 text-slate-500">{{ p.sku }}</td>
                <td class="px-4 py-3 text-slate-500">{{ p.category_name || '—' }}</td>
                <td class="px-4 py-3 text-slate-700">{{ p.quantity }}</td>
                <td class="px-4 py-3 text-slate-700">Rs {{ fx(p.stock_value) }}</td>
                <td class="px-4 py-3"><app-status-badge [status]="p.status" /></td>
              </tr>
            }
          </app-table>
        }

        @if (tab === 'customers') {
          <app-table [columns]="['Customer', 'Purchases', 'Total Spent', 'Last Purchase']">
            @for (c of data; track c.id) {
              <tr class="hover:bg-white/50">
                <td class="px-4 py-3 font-medium text-slate-700">{{ c.customer_name }}</td>
                <td class="px-4 py-3 text-slate-500">{{ c.purchase_count }}</td>
                <td class="px-4 py-3 text-slate-700">Rs {{ fx(c.total_spent) }}</td>
                <td class="px-4 py-3 text-slate-500">{{ c.last_purchase ? fmtDate(c.last_purchase) : '—' }}</td>
              </tr>
            }
          </app-table>
        }

        @if (tab === 'suppliers') {
          <app-table [columns]="['Supplier', 'Total Orders', 'Pending Orders', 'Total Purchase Amount']">
            @for (s of data; track s.id) {
              <tr class="hover:bg-white/50">
                <td class="px-4 py-3 font-medium text-slate-700">{{ s.company_name || s.supplier_name }}</td>
                <td class="px-4 py-3 text-slate-500">{{ s.total_orders }}</td>
                <td class="px-4 py-3 text-slate-500">{{ s.pending_orders }}</td>
                <td class="px-4 py-3 text-slate-700">Rs {{ fx(s.total_purchase_amount) }}</td>
              </tr>
            }
          </app-table>
        }
      }
    </app-layout>
  `,
})
export class ReportsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  fx = fx;
  fmtDate = fmtDate;

  tabs: { key: Tab; label: string }[] = [
    { key: 'sales', label: 'Sales' },
    { key: 'products', label: 'Products' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'customers', label: 'Customers' },
    { key: 'suppliers', label: 'Suppliers' },
  ];

  tab: Tab = 'sales';
  loading = true;
  data: any = null;
  from = toIsoDay(new Date(new Date().setDate(1)));
  to = toIsoDay(new Date());
  bestConfig!: ChartConfiguration;

  ngOnInit() { this.load(); }

  setTab(t: Tab) {
    this.tab = t;
    this.load();
  }

  load() {
    this.loading = true;
    let call: Promise<any>;
    if (this.tab === 'sales') call = this.api.getSalesReport(this.from, this.to);
    else if (this.tab === 'products') call = this.api.getProductReport();
    else if (this.tab === 'inventory') call = this.api.getInventoryReport();
    else if (this.tab === 'customers') call = this.api.getCustomerReport();
    else call = this.api.getSupplierReport();

    call
      .then((res) => {
        this.data = res.data;
        if (this.tab === 'products') {
          this.bestConfig = horizontalBarConfig(
            res.data.best_selling.map((p: any) => p.product_name),
            res.data.best_selling.map((p: any) => Number(p.units_sold)),
          );
        }
      })
      .catch(() => this.toast.error('Failed to load report.'))
      .finally(() => { this.loading = false; });
  }

  exportCsv() {
    if (!this.data) return;
    if (this.tab === 'sales') exportToCSV('sales_report', this.data.sales);
    else if (this.tab === 'products') exportToCSV('product_report', this.data.best_selling);
    else if (this.tab === 'inventory') exportToCSV('inventory_report', this.data.products);
    else exportToCSV(`${this.tab}_report`, this.data);
  }

  exportPdf() {
    const d = this.data;
    if (!d) return;
    const money = (v: any) => `Rs ${Number(v).toFixed(2)}`;
    if (this.tab === 'sales') {
      exportTablePDF('Sales Report', ['Invoice #', 'Customer', 'Employee', 'Total', 'Payment', 'Date'],
        d.sales.map((s: any) => [s.invoice_number, s.customer_name || 'Walk-in', s.employee_name || '—', money(s.grand_total), s.payment_method, fmtDate(s.sale_date)]));
    } else if (this.tab === 'products') {
      exportTablePDF('Best Selling Products', ['Product', 'Units Sold', 'Revenue', 'Profit'],
        d.best_selling.map((p: any) => [p.product_name, p.units_sold, money(p.revenue), money(p.profit)]));
    } else if (this.tab === 'inventory') {
      exportTablePDF('Inventory Report', ['Product', 'SKU', 'Category', 'Qty', 'Stock Value', 'Status'],
        d.products.map((p: any) => [p.product_name, p.sku, p.category_name || '—', p.quantity, money(p.stock_value), p.status]));
    } else if (this.tab === 'customers') {
      exportTablePDF('Customer Report', ['Customer', 'Purchases', 'Total Spent', 'Last Purchase'],
        d.map((c: any) => [c.customer_name, c.purchase_count, money(c.total_spent), c.last_purchase ? fmtDate(c.last_purchase) : '—']));
    } else {
      exportTablePDF('Supplier Report', ['Supplier', 'Total Orders', 'Pending Orders', 'Total Purchase Amount'],
        d.map((s: any) => [s.company_name || s.supplier_name, s.total_orders, s.pending_orders, money(s.total_purchase_amount)]));
    }
  }
}
