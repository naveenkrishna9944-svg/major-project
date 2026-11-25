import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { IconComponent } from '../shared/icon.component';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [FormsModule, LayoutComponent, LoaderComponent, IconComponent],
  template: `
    <app-layout title="Categories">
      <div class="flex justify-end mb-5">
        <button
          type="button"
          (click)="openAdd()"
          class="press flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <app-icon name="plus" [size]="16" /> Add Category
        </button>
      </div>

      @if (loading) {
        <app-loader label="Loading categories" />
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (c of categories; track c.id; let i = $index) {
            <div class="anim-rise glass rounded-2xl p-5" [style.animation-delay.s]="i * 0.03">
              <div class="flex items-start justify-between">
                <div class="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <app-icon name="layers" [size]="18" />
                </div>
                <div class="flex gap-1.5">
                  <button type="button" (click)="openEdit(c)" class="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><app-icon name="pencil" [size]="12" /></button>
                  <button type="button" (click)="remove(c.id)" class="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><app-icon name="trash-2" [size]="12" /></button>
                </div>
              </div>
              <p class="text-sm font-semibold text-slate-800 mt-3">{{ c.category_name }}</p>
              <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ c.description || 'No description' }}</p>
              <p class="text-xs text-teal-600 font-medium mt-2">{{ c.product_count }} products</p>
            </div>
          }
        </div>
      }

      @if (modalOpen) {
        <div class="anim-fade fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="modalOpen = false">
          <div class="anim-pop glass w-full max-w-md rounded-2xl p-6" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold text-slate-800">{{ form.id ? 'Edit Category' : 'Add Category' }}</h2>
              <button type="button" (click)="modalOpen = false" class="text-slate-400"><app-icon name="x" [size]="20" /></button>
            </div>
            <form ngNoForm (submit)="submit($event)" class="space-y-4">
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Category Name *</label>
                <input required [(ngModel)]="form.category_name" class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 outline-none text-sm" />
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Description</label>
                <textarea [(ngModel)]="form.description" rows="3" class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 outline-none text-sm"></textarea>
              </div>
              <div class="flex justify-end gap-3">
                <button type="button" (click)="modalOpen = false" class="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" [disabled]="saving" class="px-5 py-2.5 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-70">
                  {{ saving ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </app-layout>
  `,
})
export class CategoriesPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  categories: any[] = [];
  loading = true;
  modalOpen = false;
  form: any = { id: null, category_name: '', description: '' };
  saving = false;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getCategories()
      .then((res) => { this.categories = res.data; })
      .finally(() => { this.loading = false; });
  }

  openAdd() {
    this.form = { id: null, category_name: '', description: '' };
    this.modalOpen = true;
  }

  openEdit(c: any) {
    this.form = { ...c };
    this.modalOpen = true;
  }

  async remove(id: number) {
    if (!confirm('Delete this category?')) return;
    try {
      await this.api.deleteCategory(id);
      this.toast.success('Category deleted.');
      this.load();
    } catch (err) {
      this.toast.error(errMsg(err, 'Delete failed.'));
    }
  }

  async submit(e: Event) {
    e.preventDefault();
    this.saving = true;
    try {
      if (this.form.id) {
        await this.api.updateCategory(this.form);
        this.toast.success('Category updated.');
      } else {
        await this.api.addCategory(this.form);
        this.toast.success('Category added.');
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
