import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { fmtDate, fx } from '../utils/format';
import { DataTableComponent } from '../shared/data-table.component';
import { IconComponent } from '../shared/icon.component';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

const blankItem = () => ({ product_id: '' as any, quantity: 1 as any, purchase_price: '' as any });

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [FormsModule, LayoutComponent, LoaderComponent, DataTableComponent, StatusBadgeComponent, IconComponent],
  template: `
    <app-layout title="Purchases">
      <div class="flex justify-end mb-5">
        <button
          type="button"
          (click)="openAdd()"
          class="press flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <app-icon name="plus" [size]="16" /> Create Purchase
        </button>
      </div>

      @if (loading) {
        <app-loader label="Loading purchases" />
      } @else {
        <app-table [columns]="['PO Number', 'Supplier', 'Total', 'Payment', 'Status', 'Date', 'Actions']">
          @for (p of rows; track p.id) {
            <tr class="hover:bg-white/50">
              <td class="px-4 py-3 font-medium text-slate-700">{{ p.purchase_number }}</td>
              <td class="px-4 py-3 text-slate-500">{{ p.company_name || p.supplier_name || '—' }}</td>
              <td class="px-4 py-3 text-slate-700 font-medium">Rs {{ fx(p.total_amount) }}</td>
              <td class="px-4 py-3 text-slate-500">{{ p.payment_status }}</td>
              <td class="px-4 py-3"><app-status-badge [status]="p.order_status" /></td>
              <td class="px-4 py-3 text-slate-500">{{ fmtDate(p.purchase_date) }}</td>
              <td class="px-4 py-3">
                @if (p.order_status === 'Pending') {
                  <div class="flex gap-2">
                    <button type="button" (click)="receive(p.id)" class="flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100">
                      <app-icon name="package-check" [size]="13" /> Receive
                    </button>
                    <button type="button" (click)="cancel(p.id)" class="flex items-center gap-1 text-xs font-medium bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-100">
                      <app-icon name="ban" [size]="13" />
                    </button>
                  </div>
                } @else {
                  <span class="text-xs text-slate-400">—</span>
                }
              </td>
            </tr>
          }
          @if (rows.length === 0) {
            <tr><td colspan="7" class="px-4 py-10 text-center text-slate-400 text-sm">No purchase orders yet.</td></tr>
          }
        </app-table>
      }

      @if (modalOpen) {
        <div class="anim-fade fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="modalOpen = false">
          <div class="anim-pop glass w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold text-slate-800">Create Purchase Order</h2>
              <button type="button" (click)="modalOpen = false" class="text-slate-400"><app-icon name="x" [size]="20" /></button>
            </div>

            <form ngNoForm (submit)="submit($event)" class="space-y-4">
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Supplier *</label>
                <select required [(ngModel)]="supplierId" class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 outline-none text-sm">
                  <option value="">Select supplier</option>
                  @for (s of suppliers; track s.id) { <option [value]="s.id">{{ s.company_name || s.supplier_name }}</option> }
                </select>
              </div>

              <div>
                <label class="text-xs font-medium text-slate-600 mb-2 block">Items</label>
                <div class="space-y-2">
                  @for (it of items; track it; let i = $index) {
                    <div class="flex gap-2 items-center">
                      <select [(ngModel)]="it.product_id" class="flex-1 px-3 py-2 rounded-lg bg-white/70 border border-slate-200 outline-none text-sm">
                        <option value="">Select product</option>
                        @for (p of products; track p.id) { <option [value]="p.id">{{ p.product_name }}</option> }
                      </select>
                      <input type="number" min="1" placeholder="Qty" [(ngModel)]="it.quantity" class="w-20 px-3 py-2 rounded-lg bg-white/70 border border-slate-200 outline-none text-sm" />
                      <input type="number" min="0" step="0.01" placeholder="Cost" [(ngModel)]="it.purchase_price" class="w-24 px-3 py-2 rounded-lg bg-white/70 border border-slate-200 outline-none text-sm" />
                      <button type="button" (click)="removeItemRow(i)" class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <app-icon name="trash-2" [size]="13" />
                      </button>
                    </div>
                  }
                </div>
                <button type="button" (click)="addItemRow()" class="mt-2 text-xs font-medium text-teal-700 hover:text-teal-800">+ Add another item</button>
              </div>

              <div class="flex justify-between items-center bg-white/60 rounded-xl px-4 py-3">
                <span class="text-sm text-slate-500">Order Total</span>
                <span class="text-lg font-bold text-slate-800">Rs {{ fx(total) }}</span>
              </div>

              <div class="flex justify-end gap-3">
                <button type="button" (click)="modalOpen = false" class="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" [disabled]="saving" class="px-5 py-2.5 rounded-xl text-sm font-medium bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-70">
                  {{ saving ? 'Creating...' : 'Create Purchase Order' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </app-layout>
  `,
})
export class PurchasesPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  fx = fx;
  fmtDate = fmtDate;

  rows: any[] = [];
  products: any[] = [];
  suppliers: any[] = [];
  loading = true;
  modalOpen = false;
  supplierId: any = '';
  items = [blankItem()];
  saving = false;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    Promise.all([this.api.getPurchases(), this.api.getProducts({}), this.api.getSuppliers()])
      .then(([p, pr, s]) => {
        this.rows = p.data;
        this.products = pr.data;
        this.suppliers = s.data;
      })
      .finally(() => { this.loading = false; });
  }

  openAdd() {
    this.supplierId = '';
    this.items = [blankItem()];
    this.modalOpen = true;
  }

  addItemRow() { this.items = [...this.items, blankItem()]; }
  removeItemRow(i: number) { this.items = this.items.filter((_, idx) => idx !== i); }

  get total() {
    return this.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.purchase_price) || 0), 0);
  }

  async submit(e: Event) {
    e.preventDefault();
    if (!this.supplierId) { this.toast.error('Please select a supplier.'); return; }
    const cleanItems = this.items.filter((it) => it.product_id && it.quantity > 0 && it.purchase_price !== '' && it.purchase_price !== null);
    if (cleanItems.length === 0) { this.toast.error('Add at least one valid item.'); return; }

    this.saving = true;
    try {
      await this.api.createPurchase({ supplier_id: this.supplierId, items: cleanItems });
      this.toast.success('Purchase order created.');
      this.modalOpen = false;
      this.load();
    } catch (err) {
      this.toast.error(errMsg(err, 'Failed to create purchase.'));
    } finally {
      this.saving = false;
    }
  }

  async receive(id: number) {
    if (!confirm('Mark this purchase as received? Stock will be updated.')) return;
    try {
      await this.api.receivePurchase(id);
      this.toast.success('Purchase received and stock updated.');
      this.load();
    } catch (err) {
      this.toast.error(errMsg(err, 'Failed to receive purchase.'));
    }
  }

  async cancel(id: number) {
    if (!confirm('Cancel this purchase order?')) return;
    try {
      await this.api.cancelPurchase(id);
      this.toast.success('Purchase cancelled.');
      this.load();
    } catch (err) {
      this.toast.error(errMsg(err, 'Failed to cancel purchase.'));
    }
  }
}
