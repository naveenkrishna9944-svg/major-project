import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, ChartConfiguration, DoughnutController,
  Filler, LineController, LineElement, LinearScale, PointElement, Tooltip,
} from 'chart.js';

Chart.register(
  ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Filler,
  LineController, LineElement, LinearScale, PointElement, Tooltip,
);

/** Thin wrapper around Chart.js (replaces Recharts). */
@Component({
  selector: 'app-chart',
  standalone: true,
  template: `<div class="relative w-full" [style.height.px]="height"><canvas #canvas></canvas></div>`,
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) config!: ChartConfiguration;
  @Input() height = 260;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;

  ngAfterViewInit() { this.create(); }
  ngOnChanges() { if (this.chart) this.create(); }
  ngOnDestroy() { this.chart?.destroy(); }

  private create() {
    this.chart?.destroy();
    this.chart = new Chart(this.canvas.nativeElement, this.config);
  }
}

/* ---- shared look & feel (matches the Recharts styling of the original) ---- */
export const CHART_TOOLTIP = {
  backgroundColor: '#ffffff',
  titleColor: '#334155',
  bodyColor: '#334155',
  borderColor: '#E2E8F0',
  borderWidth: 1,
  cornerRadius: 12,
  padding: 10,
  titleFont: { size: 12, family: 'Poppins, sans-serif' },
  bodyFont: { size: 12, family: 'Poppins, sans-serif' },
};

export const CHART_TICK = { color: '#64748B', font: { size: 11, family: 'Poppins, sans-serif' } };
export const CHART_GRID = { color: '#E2E8F0', tickBorderDash: [3, 3], drawTicks: false };

/** Horizontal bar chart config used by the dashboard and the product report. */
export function horizontalBarConfig(labels: string[], values: number[]): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: '#0F766E',
        borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 6, bottomRight: 6 },
        borderSkipped: false,
        barThickness: 'flex',
        maxBarThickness: 22,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: CHART_TOOLTIP },
      scales: {
        x: { beginAtZero: true, ticks: CHART_TICK, grid: CHART_GRID, border: { display: false } },
        y: { ticks: CHART_TICK, grid: { display: false }, border: { display: false } },
      },
    },
  };
}
