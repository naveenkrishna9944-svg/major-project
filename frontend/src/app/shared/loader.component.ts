import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
      <div class="w-9 h-9 rounded-full border-[3px] border-teal-200 border-t-teal-600 animate-spin"></div>
      <p class="text-sm font-medium">{{ label }}...</p>
    </div>
  `,
})
export class LoaderComponent {
  @Input() label = 'Loading';
}
