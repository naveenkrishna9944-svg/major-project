import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-[min(320px,calc(100vw-2rem))] pointer-events-none">
      @for (t of toasts.toasts; track t.id) {
        <div
          class="anim-toast pointer-events-auto relative overflow-hidden flex items-center gap-3 bg-white text-slate-600 rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.12)] px-4 py-4 min-h-16"
          role="alert"
        >
          <span [class]="'shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white ' + (t.type === 'success' ? 'bg-[#07bc0c]' : 'bg-[#e74c3c]')">
            @if (t.type === 'success') { <app-icon name="check" [size]="12" /> } @else { <span class="text-[12px] font-bold leading-none">!</span> }
          </span>
          <p class="flex-1 text-sm">{{ t.message }}</p>
          <button type="button" class="text-slate-400 hover:text-slate-600" (click)="toasts.dismiss(t.id)" aria-label="Close">
            <app-icon name="x" [size]="14" />
          </button>
          <div
            class="anim-toast-progress absolute bottom-0 left-0 h-1 w-full"
            [class]="t.type === 'success' ? 'bg-[#07bc0c]' : 'bg-[#e74c3c]'"
            [style.animation-duration.ms]="toasts.autoClose"
          ></div>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  toasts = inject(ToastService);
}
