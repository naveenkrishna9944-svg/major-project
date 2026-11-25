import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  Ban, Barcode, Bell, Boxes, CalendarClock, ChartBar, Check, CircleX, ClipboardList, Download,
  Eye, FileDown, Layers, LayoutDashboard, LoaderCircle, Lock, LogOut, Mail, Menu, Minus, Moon,
  Package, PackageCheck, Pencil, Plus, Printer, Receipt, Search, Send, Settings, ShoppingCart,
  Store, Sun, Trash2, TrendingUp, TriangleAlert, Truck, UserCog, UserRound, Users, Wallet, X,
  IconNode,
} from 'lucide';

/** Lucide icons used by the app (same icon set the React version used via react-icons/lu). */
const ICONS: Record<string, IconNode> = {
  ban: Ban, barcode: Barcode, bell: Bell, boxes: Boxes, 'calendar-clock': CalendarClock,
  'chart-bar': ChartBar, check: Check, 'circle-x': CircleX, 'clipboard-list': ClipboardList,
  download: Download, eye: Eye, 'file-down': FileDown, layers: Layers,
  'layout-dashboard': LayoutDashboard, 'loader-circle': LoaderCircle, lock: Lock,
  'log-out': LogOut, mail: Mail, menu: Menu, minus: Minus, moon: Moon, package: Package,
  'package-check': PackageCheck, pencil: Pencil, plus: Plus, printer: Printer, receipt: Receipt,
  search: Search, send: Send, settings: Settings, 'shopping-cart': ShoppingCart, store: Store,
  sun: Sun, 'trash-2': Trash2, 'trending-up': TrendingUp, 'triangle-alert': TriangleAlert,
  truck: Truck, 'user-cog': UserCog, 'user-round': UserRound, users: Users, wallet: Wallet, x: X,
};

const attrs = (a: Record<string, string | number | undefined>) =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ');

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  host: { class: 'inline-flex shrink-0 items-center justify-center', '[innerHTML]': 'svg' },
  template: '',
})
export class IconComponent {
  private sanitizer = inject(DomSanitizer);

  private _name = '';
  private _size = 16;
  svg: SafeHtml = '';

  @Input({ required: true }) set name(v: string) { this._name = v; this.render(); }
  @Input() set size(v: number | string) { this._size = Number(v) || 16; this.render(); }

  private render() {
    const node = ICONS[this._name];
    if (!node) { this.svg = ''; return; }
    const inner = node.map(([tag, a]) => `<${tag} ${attrs(a as any)}/>`).join('');
    const html =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this._size}" height="${this._size}" viewBox="0 0 24 24" ` +
      `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
    // The markup is built only from the static icon data above, never from user input.
    this.svg = this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
