import { Component, Input } from '@angular/core';
import { NavbarComponent } from './navbar.component';
import { SidebarComponent } from './sidebar.component';

/** Page frame: sidebar + top bar + animated content area. Use as <app-layout title="Products"> ... </app-layout> */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [SidebarComponent, NavbarComponent],
  template: `
    <div class="min-h-screen flex">
      <app-sidebar [open]="sidebarOpen" (closed)="sidebarOpen = false" />
      <div class="flex-1 min-w-0 p-4 sm:p-6">
        <app-navbar [title]="title" (menuClick)="sidebarOpen = true" />
        <main class="anim-rise"><ng-content /></main>
      </div>
    </div>
  `,
})
export class LayoutComponent {
  @Input() title = '';
  sidebarOpen = false;
}
