import { Component, Input } from '@angular/core';

/** <app-table [columns]="[...]"> ...<tr> rows... </app-table> */
@Component({
  selector: 'app-table',
  standalone: true,
  template: `
    <div class="glass rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200/70">
              @for (c of columns; track c) {
                <th class="px-4 py-3 whitespace-nowrap">{{ c }}</th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/60"><ng-content /></tbody>
        </table>
      </div>
    </div>
  `,
})
export class DataTableComponent {
  @Input({ required: true }) columns: string[] = [];
}
