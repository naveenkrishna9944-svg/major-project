import { Component, OnInit, inject } from '@angular/core';
import { ChartConfiguration, ScriptableContext } from 'chart.js';
import { ApiService, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { money } from '../utils/format';
import { CHART_GRID, CHART_TICK, CHART_TOOLTIP, ChartComponent, horizontalBarConfig } from '../shared/chart.component';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';
import { StatCardComponent } from '../shared/stat-card.component';

const PIE_COLORS = ['#0F766E', '#B45309', '#0E9488', '#65A30D', '#7C5A3B', '#475569'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [LayoutComponent, LoaderComponent, StatCardComponent, ChartComponent],
  template: `
    <app-layout title="Dashboard">
      @if (loading) {
        <app-loader label="Loading dashboard" />
      } @else if (stats && charts) {
        <!-- Inventory + business stats -->
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          @for (c of cards; track c.label; let i = $index) {
            <app-stat-card [icon]="c.icon" [label]="c.label" [value]="c.value" [tone]="c.tone" [delay]="i * 0.03" />
          }
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
          <div class="glass rounded-2xl p-5 xl:col-span-2">
            <h3 class="text-sm font-semibold text-slate-700 mb-4">Sales — Last 7 Days</h3>
            <app-chart [config]="salesConfig" [height]="260" />
          </div>

          <div class="glass rounded-2xl p-5">
            <h3 class="text-sm font-semibold text-slate-700 mb-4">Category Distribution</h3>
            <app-chart [config]="categoryConfig" [height]="260" />
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div class="glass rounded-2xl p-5">
            <h3 class="text-sm font-semibold text-slate-700 mb-4">Top Selling Products</h3>
            <app-chart [config]="topConfig" [height]="260" />
          </div>

          <div class="glass rounded-2xl p-5">
            <h3 class="text-sm font-semibold text-slate-700 mb-4">Inventory Status</h3>
            <div class="grid grid-cols-2 gap-4 h-full items-center">
              @for (s of statusBoxes; track s.key; let i = $index) {
                <div class="rounded-xl bg-white/60 p-4 text-center">
                  <p class="text-2xl font-bold" [style.color]="color(i)">{{ s.value }}</p>
                  <p class="text-xs text-slate-500 mt-1 capitalize">{{ s.label }}</p>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </app-layout>
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  stats: any = null;
  charts: any = null;
  loading = true;

  cards: { icon: string; label: string; value: string | number; tone: string }[] = [];
  statusBoxes: { key: string; label: string; value: number }[] = [];
  salesConfig!: ChartConfiguration;
  categoryConfig!: ChartConfiguration;
  topConfig!: ChartConfiguration;

  color = (i: number) => PIE_COLORS[i % PIE_COLORS.length];

  ngOnInit() {
    Promise.all([this.api.getStats(), this.api.getCharts()])
      .then(([s, c]) => {
        this.stats = s.data;
        this.charts = c.data;
        this.build();
      })
      .catch((err) => this.toast.error(errMsg(err, 'Failed to load dashboard.')))
      .finally(() => { this.loading = false; });
  }

  private build() {
    const s = this.stats;
    this.cards = [
      { icon: 'package', label: 'Total Products', value: s.total_products, tone: 'primary' },
      { icon: 'layers', label: 'Total Categories', value: s.total_categories, tone: 'primary' },
      { icon: 'users', label: 'Total Customers', value: s.total_customers, tone: 'dark' },
      { icon: 'truck', label: 'Total Suppliers', value: s.total_suppliers, tone: 'dark' },
      { icon: 'user-cog', label: 'Total Employees', value: s.total_employees, tone: 'dark' },
      { icon: 'wallet', label: 'Stock Value', value: money(s.stock_value), tone: 'primary' },
      { icon: 'triangle-alert', label: 'Low Stock Items', value: s.low_stock_count, tone: 'warning' },
      { icon: 'circle-x', label: 'Out Of Stock', value: s.out_of_stock_count, tone: 'danger' },
      { icon: 'calendar-clock', label: 'Expiring Soon', value: s.expiring_count, tone: 'warning' },
      { icon: 'trending-up', label: "Today's Sales", value: money(s.today_sales), tone: 'success' },
      { icon: 'trending-up', label: 'Monthly Sales', value: money(s.monthly_sales), tone: 'success' },
      { icon: 'wallet', label: 'Total Profit', value: money(s.total_profit), tone: 'success' },
    ];

    this.statusBoxes = Object.entries(this.charts.inventory_status).map(([key, value]) => ({
      key,
      label: key.replace(/_/g, ' '),
      value: Number(value),
    }));

    const salesCfg: any = {
      type: 'line',
      data: {
        labels: this.charts.sales_last_7_days.map((d: any) => d.day),
        datasets: [{
          data: this.charts.sales_last_7_days.map((d: any) => d.total),
          borderColor: '#0F766E',
          borderWidth: 2,
          fill: true,
          cubicInterpolationMode: 'monotone',
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#0F766E',
          backgroundColor: (ctx: ScriptableContext<'line'>) => {
            const { chart } = ctx;
            const area = chart.chartArea;
            if (!area) return 'rgba(15,118,110,0.2)';
            const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
            g.addColorStop(0, 'rgba(15,118,110,0.35)');
            g.addColorStop(1, 'rgba(15,118,110,0)');
            return g;
          },
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: CHART_TOOLTIP },
        scales: {
          x: { ticks: CHART_TICK, grid: CHART_GRID, border: { display: false } },
          y: { beginAtZero: true, ticks: CHART_TICK, grid: CHART_GRID, border: { display: false } },
        },
      },
    };
    this.salesConfig = salesCfg;

    const catCfg: any = {
      type: 'doughnut',
      data: {
        labels: this.charts.category_distribution.map((c: any) => c.category_name),
        datasets: [{
          data: this.charts.category_distribution.map((c: any) => c.product_count),
          backgroundColor: this.charts.category_distribution.map((_: any, i: number) => this.color(i)),
          borderWidth: 0,
          spacing: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { display: false }, tooltip: CHART_TOOLTIP },
      },
    };
    this.categoryConfig = catCfg;

    this.topConfig = horizontalBarConfig(
      this.charts.top_products.map((p: any) => p.product_name),
      this.charts.top_products.map((p: any) => Number(p.total_sold)),
    );
  }
}
