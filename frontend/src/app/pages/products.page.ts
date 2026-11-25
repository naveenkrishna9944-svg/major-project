import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { fx } from '../utils/format';
import { printBarcode } from '../utils/barcode';
import { DataTableComponent } from '../shared/data-table.component';
import { IconComponent } from '../shared/icon.component';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

const EMPTY_FORM = {
  id: null as number | null, product_name: '', sku: '', barcode: '', category_id: '' as any, supplier_id: '' as any,
  brand: '', cost_price: '' as any, selling_price: '' as any, quantity: '' as any, minimum_stock: 5 as any,
  unit: 'pcs', manufacturing_date: '', expiry_date: '', description: '',
};

/** Fields sent to the API (multipart form, because of the image upload). */
const FIELDS = [
  'product_name', 'sku', 'barcode', 'category_id', 'supplier_id', 'brand', 'cost_price', 'selling_price',
  'quantity', 'minimum_stock', 'unit', 'manufacturing_date', 'expiry_date', 'description',
] as const;

const INPUT = 'w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 focus:border-teal-500 outline-none text-sm';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [FormsModule, LayoutComponent, LoaderComponent, DataTableComponent, StatusBadgeComponent, IconComponent],
  template: `
    <app-layout title="Products">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div class="relative w-full sm:w-80">
          <app-icon name="search" [size]="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            [ngModel]="search"
            (ngModelChange)="onSearch($event)"
            placeholder="Search by name, SKU, barcode..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/70 border border-slate-200 focus:border-teal-500 outline-none text-sm"
          />
        </div>
        <button
          type="button"
          (click)="openAdd()"
          class="press flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <app-icon name="plus" [size]="16" /> Add Product
        </button>
      </div>

      @if (loading) {
        <app-loader label="Loading products" />
      } @else {
        <app-table [columns]="['Product', 'SKU', 'Category', 'Price', 'Qty', 'Status', 'Actions']">
          @for (p of products; track p.id) {
            <tr class="hover:bg-white/50 transition-colors">
              <td class="px-4 py-3 font-medium text-slate-700">{{ p.product_name }}</td>
              <td class="px-4 py-3 text-slate-500">{{ p.sku }}</td>
              <td class="px-4 py-3 text-slate-500">{{ p.category_name || '—' }}</td>
              <td class="px-4 py-3 text-slate-700">Rs {{ fx(p.selling_price) }}</td>
              <td class="px-4 py-3 text-slate-700">{{ p.quantity }} {{ p.unit }}</td>
              <td class="px-4 py-3"><app-status-badge [status]="p.stock_status" /></td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button type="button" (click)="print(p)" class="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center hover:bg-teal-100" title="Print barcode">
                    <app-icon name="barcode" [size]="14" />
                  </button>
                  <button type="button" (click)="openEdit(p)" class="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-100">
                    <app-icon name="pencil" [size]="14" />
                  </button>
                  <button type="button" (click)="remove(p.id)" class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100">
                    <app-icon name="trash-2" [size]="14" />
                  </button>
                </div>
              </td>
            </tr>
          }
          @if (products.length === 0) {
            <tr><td colspan="7" class="px-4 py-10 text-center text-slate-400 text-sm">No products found.</td></tr>
          }
        </app-table>
      }

      @if (modalOpen) {
        <div class="anim-fade fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="modalOpen = false">
          <div class="anim-pop glass w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold text-slate-800">{{ form.id ? 'Edit Product' : 'Add Product' }}</h2>
              <button type="button" (click)="modalOpen = false" class="text-slate-400 hover:text-slate-600"><app-icon name="x" [size]="20" /></button>
            </div>

            <form ngNoForm (submit)="submit($event)" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Product Name *</label>
                <input required [(ngModel)]="form.product_name" [class]="input" />
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">SKU *</label>
                <input required [(ngModel)]="form.sku" [class]="input" />
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Barcode *</label>
                <input required [(ngModel)]="form.barcode" [class]="input" />
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Brand</label>
                <input [(ngModel)]="form.brand" [class]="input" />
              </div>

              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Category</label>
                <select [(ngModel)]="form.category_id" [class]="input">
                  <option value="">Select Category</option>
                  @for (c of categories; track c.id) { <option [value]="c.id">{{ c.category_name }}</option> }
                </select>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Supplier</label>
                <select [(ngModel)]="form.supplier_id" [class]="input">
                  <option value="">Select Supplier</option>
                  @for (s of suppliers; track s.id) { <option [value]="s.id">{{ s.supplier_name }}</option> }
                </select>
              </div>

              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Cost Price *</label>
                <input type="number" step="0.01" required [(ngModel)]="form.cost_price" [class]="input" />
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Selling Price *</label>
                <input type="number" step="0.01" required [(ngModel)]="form.selling_price" [class]="input" />
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Quantity *</label>
                <input type="number" required [(ngModel)]="form.quantity" [class]="input" />
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Minimum Stock</label>
                <input type="number" [(ngModel)]="form.minimum_stock" [class]="input" />
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Unit</label>
                <input [(ngModel)]="form.unit" [class]="input" />
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Manufacturing Date</label>
                <input type="date" [(ngModel)]="form.manufacturing_date" [class]="input" />
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Expiry Date</label>
                <input type="date" [(ngModel)]="form.expiry_date" [class]="input" />
              </div>

              <div class="sm:col-span-2">
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  (change)="onFile($event)"
                  class="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-600 file:text-xs file:font-medium"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Description</label>
                <textarea [(ngModel)]="form.description" rows="3" [class]="input"></textarea>
              </div>

              <div class="sm:col-span-2 flex justify-end gap-3 mt-2">
                <button type="button" (click)="modalOpen = false" class="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" [disabled]="saving" class="px-5 py-2.5 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-70">
                  {{ saving ? 'Saving...' : 'Save Product' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </app-layout>
  `,
})
export class ProductsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  fx = fx;
  input = INPUT;

  products: any[] = [];
  categories: any[] = [];
  suppliers: any[] = [];
  loading = true;
  search = '';
  modalOpen = false;
  form: any = { ...EMPTY_FORM };
  imageFile: File | null = null;
  saving = false;

  private debounce?: ReturnType<typeof setTimeout>;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    Promise.all([this.api.getProducts({ search: this.search }), this.api.getCategories(), this.api.getSuppliers()])
      .then(([p, c, s]) => {
        this.products = p.data;
        this.categories = c.data;
        this.suppliers = s.data;
      })
      .catch(() => this.toast.error('Failed to load products.'))
      .finally(() => { this.loading = false; });
  }

  onSearch(v: string) {
    this.search = v;
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.load(), 350);
  }

  openAdd() {
    this.form = { ...EMPTY_FORM };
    this.imageFile = null;
    this.modalOpen = true;
  }

  openEdit(p: any) {
    this.form = {
      ...EMPTY_FORM,
      ...Object.fromEntries(FIELDS.map((k) => [k, p[k] ?? ''])),
      id: p.id,
      category_id: p.category_id || '',
      supplier_id: p.supplier_id || '',
      manufacturing_date: p.manufacturing_date || '',
      expiry_date: p.expiry_date || '',
    };
    this.imageFile = null;
    this.modalOpen = true;
  }

  onFile(e: Event) {
    this.imageFile = (e.target as HTMLInputElement).files?.[0] ?? null;
  }

  print(p: any) { printBarcode(p); }

  async remove(id: number) {
    if (!confirm('Delete this product?')) return;
    try {
      await this.api.deleteProduct(id);
      this.toast.success('Product deleted.');
      this.load();
    } catch (err) {
      this.toast.error(errMsg(err, 'Delete failed.'));
    }
  }

  async submit(e: Event) {
    e.preventDefault();
    this.saving = true;

    const fd = new FormData();
    for (const k of FIELDS) {
      const v = this.form[k];
      fd.append(k, v === null || v === undefined ? '' : String(v));
    }
    if (this.imageFile) fd.append('image', this.imageFile);

    try {
      if (this.form.id) {
        fd.append('id', String(this.form.id));
        await this.api.updateProduct(fd);
        this.toast.success('Product updated.');
      } else {
        await this.api.addProduct(fd);
        this.toast.success('Product added.');
      }
      this.modalOpen = false;
      this.load();
    } catch (err) {
      this.toast.error(errMsg(err, 'Save failed.'));
    } finally {
      this.saving = false;
    }
  }
}
