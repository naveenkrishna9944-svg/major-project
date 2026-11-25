import { Component, Input } from '@angular/core';

const STYLES: Record<string, string> = {
  Healthy: 'bg-emerald-100 text-emerald-700',
  Active: 'bg-emerald-100 text-emerald-700',
  'Low Stock': 'bg-amber-100 text-amber-700',
  'Out Of Stock': 'bg-red-100 text-red-700',
  Expired: 'bg-slate-200 text-slate-600',
  Inactive: 'bg-slate-200 text-slate-600',
  Pending: 'bg-amber-100 text-amber-700',
  Received: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-red-100 text-red-700',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span [class]="'text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ' + style">{{ status }}</span>`,
})
export class StatusBadgeComponent {
  @Input() status = '';
  get style() { return STYLES[this.status] || 'bg-slate-100 text-slate-600'; }
}
