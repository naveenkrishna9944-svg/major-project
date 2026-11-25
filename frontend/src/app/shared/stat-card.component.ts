import { Component, Input } from '@angular/core';
import { IconComponent } from './icon.component';

const COLOR_MAP: Record<string, string> = {
  primary: 'from-teal-500/15 to-teal-600/5 text-teal-600',
  success: 'from-emerald-500/15 to-emerald-600/5 text-emerald-600',
  warning: 'from-amber-500/15 to-amber-600/5 text-amber-600',
  danger: 'from-red-500/15 to-red-600/5 text-red-600',
  dark: 'from-slate-700/15 to-slate-900/5 text-slate-700',
};

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="glass lift anim-rise rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden" [style.animation-delay.s]="delay">
      <div [class]="'absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none ' + gradient"></div>
      <div class="relative flex items-center justify-between">
        <div [class]="'w-11 h-11 rounded-xl bg-white/70 flex items-center justify-center ' + textColor">
          @if (icon) { <app-icon [name]="icon" [size]="20" /> }
        </div>
        @if (trend !== undefined) {
          <span [class]="'text-xs font-semibold px-2 py-1 rounded-full ' + (trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')">
            {{ trend >= 0 ? '+' : '' }}{{ trend }}%
          </span>
        }
      </div>
      <div class="relative">
        <p class="text-2xl font-bold text-slate-800 leading-tight">{{ value }}</p>
        <p class="text-xs font-medium text-slate-500 mt-0.5">{{ label }}</p>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  @Input() icon = '';
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() trend?: number;
  @Input() tone: keyof typeof COLOR_MAP | string = 'primary';
  @Input() delay = 0;

  get gradient() { return COLOR_MAP[this.tone] ?? COLOR_MAP['primary']; }
  get textColor() { return this.gradient.split(' ').pop(); }
}
