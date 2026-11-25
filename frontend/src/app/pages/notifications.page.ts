import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import { fmtDateTime } from '../utils/format';
import { IconComponent } from '../shared/icon.component';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [LayoutComponent, LoaderComponent, IconComponent],
  template: `
    <app-layout title="Notifications">
      @if (loading) {
        <app-loader label="Loading notifications" />
      } @else {
        <div class="space-y-3">
          @for (n of items; track n.id; let i = $index) {
            <div
              class="anim-rise glass rounded-xl p-4 flex items-start gap-3"
              [class.border-l-4]="!n.is_read"
              [class.border-l-teal-500]="!n.is_read"
              [style.animation-delay.s]="i * 0.03"
            >
              <div class="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <app-icon name="bell" [size]="16" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-700">{{ n.title }}</p>
                <p class="text-xs text-slate-500 mt-0.5">{{ n.message }}</p>
                <p class="text-[11px] text-slate-400 mt-1">{{ fmtDateTime(n.created_at) }}</p>
              </div>
              <div class="flex gap-1.5 shrink-0">
                @if (!n.is_read) {
                  <button type="button" (click)="markRead(n.id)" class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><app-icon name="check" [size]="13" /></button>
                }
                <button type="button" (click)="remove(n.id)" class="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><app-icon name="trash-2" [size]="13" /></button>
              </div>
            </div>
          }
          @if (items.length === 0) {
            <div class="text-center text-slate-400 text-sm py-16">You're all caught up.</div>
          }
        </div>
      }
    </app-layout>
  `,
})
export class NotificationsPage implements OnInit {
  private api = inject(ApiService);

  fmtDateTime = fmtDateTime;
  items: any[] = [];
  loading = true;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getNotifications()
      .then((res) => { this.items = res.data.notifications; })
      .finally(() => { this.loading = false; });
  }

  async markRead(id: number) { await this.api.markNotificationRead(id); this.load(); }
  async remove(id: number) { await this.api.deleteNotification(id); this.load(); }
}
