import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { fx } from '../utils/format';
import { exportInvoicePDF } from '../utils/export-pdf';
import { IconComponent } from '../shared/icon.component';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, LayoutComponent, LoaderComponent, IconComponent],
  template: `
    <app-layout title="Point of Sale">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Left: product search -->
        <div class="lg:col-span-2">
          <div class="relative mb-4">
            <app-icon name="search" [size]="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              #searchBox
              [ngModel]="query"
              (ngModelChange)="onQuery($event)"
              placeholder="Search by name, SKU, or barcode..."
              class="w-full pl-10 pr-4 py-3 rounded-xl bg-white/70 border border-slate-200 focus:border-teal-500 outline-none text-sm"
            />
          </div>

          @if (loading) {
            <app-loader label="Loading products" />
          } @else {
            <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              @for (p of products; track p.id) {
                <button type="button" (click)="addToCart(p)" class="glass lift press rounded-xl p-3 text-left">
                  <div class="w-full aspect-square rounded-lg bg-teal-50 mb-2 flex items-center justify-center text-teal-300">
                    <app-icon name="shopping-cart" [size]="22" />
                  </div>
                  <p class="text-xs font-semibold text-slate-700 line-clamp-2 leading-tight">{{ p.product_name }}</p>
                  <div class="flex items-center justify-between mt-1.5">
                    <span class="text-sm font-bold text-teal-600">Rs {{ fx(p.selling_price) }}</span>
                    <span class="text-[10px] text-slate-400">{{ p.quantity }} left</span>
                  </div>
                </button>
              }
              @if (products.length === 0) {
                <p class="col-span-full text-center text-sm text-slate-400 py-10">No matching products.</p>
              }
            </div>
          }
        </div>

        <!-- Right: cart -->
        <div class="glass rounded-2xl p-5 flex flex-col h-fit lg:sticky lg:top-24">
          <h3 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <app-icon name="shopping-cart" [size]="16" /> Cart ({{ cart.length }})
          </h3>

          <div class="flex-1 max-h-80 overflow-y-auto space-y-2 mb-4">
            @for (c of cart; track c.id) {
              <div class="anim-slide-in flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium text-slate-700 truncate">{{ c.product_name }}</p>
                  <p class="text-[11px] text-slate-400">Rs {{ fx(c.selling_price) }} each</p>
                </div>
                <div class="flex items-center gap-1.5 ml-2">
                  <button type="button" (click)="changeQty(c.id, -1)" class="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center"><app-icon name="minus" [size]="11" /></button>
                  <span class="text-xs font-semibold w-5 text-center">{{ c.quantity }}</span>
                  <button type="button" (click)="changeQty(c.id, 1)" class="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center"><app-icon name="plus" [size]="11" /></button>
                  <button type="button" (click)="removeItem(c.id)" class="w-6 h-6 rounded-md bg-red-50 text-red-500 flex items-center justify-center ml-1"><app-icon name="trash-2" [size]="11" /></button>
                </div>
              </div>
            }
            @if (cart.length === 0) {
              <p class="text-center text-xs text-slate-400 py-6">Cart is empty.</p>
            }
          </div>

          <div class="space-y-3 border-t border-slate-200/70 pt-4">
            <div>
              <label class="text-xs font-medium text-slate-600 mb-1 block">Customer</label>
              <select [(ngModel)]="customerId" class="w-full px-3 py-2 rounded-lg bg-white/70 border border-slate-200 outline-none text-sm">
                <option value="">Walk-in Customer</option>
                @for (c of selectableCustomers; track c.id) { <option [value]="c.id">{{ c.customer_name }}</option> }
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1 block">Discount (Rs)</label>
                <input type="number" min="0" [(ngModel)]="discount" class="w-full px-3 py-2 rounded-lg bg-white/70 border border-slate-200 outline-none text-sm" />
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1 block">Payment</label>
                <select [(ngModel)]="paymentMethod" class="w-full px-3 py-2 rounded-lg bg-white/70 border border-slate-200 outline-none text-sm">
                  <option>Cash</option><option>Card</option><option>Online</option>
                </select>
              </div>
            </div>

            <div class="text-sm space-y-1 pt-2">
              <div class="flex justify-between text-slate-500"><span>Subtotal</span><span>Rs {{ fx(subtotal) }}</span></div>
              <div class="flex justify-between text-slate-500"><span>Discount</span><span>-Rs {{ fx(discountValue) }}</span></div>
              <div class="flex justify-between font-bold text-slate-800 text-base pt-1"><span>Total</span><span>Rs {{ fx(grandTotal) }}</span></div>
              <p class="text-[10px] text-slate-400">Tax is calculated automatically at checkout using store settings.</p>
            </div>

            <button
              type="button"
              (click)="completeSale()"
              [disabled]="processing || cart.length === 0"
              class="press w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-60"
            >
              {{ processing ? 'Processing...' : 'Complete Sale' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Invoice modal -->
      @if (invoice) {
        <div class="anim-fade fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="invoice = null">
          <div class="anim-pop glass w-full max-w-sm rounded-2xl p-6 text-center" (click)="$event.stopPropagation()">
            <div class="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <app-icon name="shopping-cart" [size]="20" />
            </div>
            <h2 class="text-lg font-semibold text-slate-800">Sale Completed</h2>
            <p class="text-sm text-slate-500 mt-1">Invoice: {{ invoice.invoice_number }}</p>
            <div class="text-sm text-left mt-4 space-y-1 bg-white/60 rounded-xl p-4">
              <div class="flex justify-between"><span class="text-slate-500">Subtotal</span><span>Rs {{ fx(invoice.subtotal) }}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Discount</span><span>-Rs {{ fx(invoice.discount) }}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Tax</span><span>Rs {{ fx(invoice.tax) }}</span></div>
              <div class="flex justify-between font-bold pt-1 border-t border-slate-200 mt-1"><span>Grand Total</span><span>Rs {{ fx(invoice.grand_total) }}</span></div>
            </div>
            <div class="flex gap-3 mt-5">
              <button type="button" (click)="invoice = null" class="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">Close</button>
              <button type="button" (click)="downloadPdf()" class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/70 border border-slate-200 text-slate-700 hover:bg-white flex items-center justify-center gap-2">
                <app-icon name="file-down" [size]="14" /> PDF
              </button>
              <button type="button" (click)="print()" class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2">
                <app-icon name="printer" [size]="14" /> Print
              </button>
            </div>
          </div>
        </div>
      }
    </app-layout>
  `,
})
export class PosPage implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  @ViewChild('searchBox') searchBox?: ElementRef<HTMLInputElement>;

  fx = fx;

  query = '';
  products: any[] = [];
  loading = true;
  cart: any[] = [];
  customers: any[] = [];
  customerId: any = '';
  discount: any = 0;
  paymentMethod = 'Cash';
  processing = false;
  invoice: any = null;

  private debounce?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.search('');
    this.api.getCustomers().then((res) => { this.customers = res.data; });
  }

  ngAfterViewInit() {
    this.searchBox?.nativeElement.focus();
  }

  get selectableCustomers() {
    return this.customers.filter((c) => c.customer_name !== 'Walk-in Customer');
  }

  search(q: string) {
    this.api.posSearchProducts(q)
      .then((res) => { this.products = res.data; })
      .finally(() => { this.loading = false; });
  }

  onQuery(v: string) {
    this.query = v;
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.search(this.query), 300);
  }

  addToCart(p: any) {
    const existing = this.cart.find((c) => c.id === p.id);
    if (existing) {
      if (existing.quantity + 1 > p.quantity) {
        this.toast.error('Insufficient stock available.');
        return;
      }
      this.cart = this.cart.map((c) => (c.id === p.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      this.cart = [...this.cart, { ...p, quantity: 1 }];
    }
  }

  changeQty(id: number, delta: number) {
    this.cart = this.cart.map((c) => {
      if (c.id !== id) return c;
      const newQty = c.quantity + delta;
      return newQty < 1 ? c : { ...c, quantity: newQty };
    });
  }

  removeItem(id: number) { this.cart = this.cart.filter((c) => c.id !== id); }
  clearCart() { this.cart = []; this.discount = 0; }

  get subtotal() { return this.cart.reduce((sum, c) => sum + c.selling_price * c.quantity, 0); }
  get discountValue() { return Number(this.discount || 0); }
  get grandTotal() { return Math.max(this.subtotal - this.discountValue, 0); }

  async completeSale() {
    if (this.cart.length === 0) { this.toast.error('Cart is empty.'); return; }
    this.processing = true;
    try {
      const res = await this.api.createSale({
        items: this.cart.map((c) => ({ product_id: c.id, quantity: c.quantity })),
        customer_id: this.customerId || null,
        discount: this.discountValue,
        payment_method: this.paymentMethod,
      });
      this.toast.success('Sale completed successfully.');
      this.invoice = {
        ...res.data,
        items: this.cart.map((c) => ({
          product_name: c.product_name,
          quantity: c.quantity,
          price: c.selling_price,
          total: c.selling_price * c.quantity,
        })),
      };
      this.clearCart();
      this.search(this.query);
    } catch (err) {
      this.toast.error(errMsg(err, 'Sale failed.'));
    } finally {
      this.processing = false;
    }
  }

  downloadPdf() { exportInvoicePDF(this.invoice); }
  print() { window.print(); }
}
