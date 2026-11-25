import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { DataTableComponent } from '../shared/data-table.component';
import { IconComponent } from '../shared/icon.component';
import { LayoutComponent } from '../shared/layout.component';
import { LoaderComponent } from '../shared/loader.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

const EMPTY = { full_name: '', email: '', password: '', phone: '', address: '', salary: '', joining_date: '', role: 'Employee' };

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [FormsModule, LayoutComponent, LoaderComponent, DataTableComponent, StatusBadgeComponent, IconComponent],
  template: `
    <app-layout title="Employees">
      <div class="flex justify-end mb-5">
        <button
          type="button"
          (click)="openAdd()"
          class="press flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <app-icon name="plus" [size]="16" /> Add Employee
        </button>
      </div>

      @if (loading) {
        <app-loader label="Loading employees" />
      } @else {
        <app-table [columns]="['Code', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Actions']">
          @for (e of rows; track e.id) {
            <tr class="hover:bg-white/50">
              <td class="px-4 py-3 text-slate-500">{{ e.employee_code }}</td>
              <td class="px-4 py-3 font-medium text-slate-700">{{ e.full_name }}</td>
              <td class="px-4 py-3 text-slate-500">{{ e.login_email }}</td>
              <td class="px-4 py-3 text-slate-500">{{ e.phone || '—' }}</td>
              <td class="px-4 py-3 text-slate-500">{{ e.role }}</td>
              <td class="px-4 py-3"><app-status-badge [status]="e.status" /></td>
              <td class="px-4 py-3">
                <button type="button" (click)="remove(e.id)" class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><app-icon name="trash-2" [size]="14" /></button>
              </td>
            </tr>
          }
          @if (rows.length === 0) {
            <tr><td colspan="7" class="px-4 py-10 text-center text-slate-400 text-sm">No employees yet.</td></tr>
          }
        </app-table>
      }

      @if (modalOpen) {
        <div class="anim-fade fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="modalOpen = false">
          <div class="anim-pop glass w-full max-w-md rounded-2xl p-6" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold text-slate-800">Add Employee</h2>
              <button type="button" (click)="modalOpen = false" class="text-slate-400"><app-icon name="x" [size]="20" /></button>
            </div>
            <form ngNoForm (submit)="submit($event)" class="space-y-4">
              @for (f of fields; track f.key) {
                <div>
                  <label class="text-xs font-medium text-slate-600 mb-1.5 block">{{ f.label }} *</label>
                  <input required [type]="f.type" [(ngModel)]="form[f.key]" class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 outline-none text-sm" />
                </div>
              }
              <div>
                <label class="text-xs font-medium text-slate-600 mb-1.5 block">Role</label>
                <select [(ngModel)]="form.role" class="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 outline-none text-sm">
                  <option>Employee</option><option>Admin</option>
                </select>
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
export class EmployeesPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  fields = [
    { key: 'full_name', label: 'Full Name', type: 'text' },
    { key: 'email', label: 'Login Email', type: 'email' },
    { key: 'password', label: 'Password', type: 'password' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'salary', label: 'Salary', type: 'number' },
    { key: 'joining_date', label: 'Joining Date', type: 'date' },
  ];

  rows: any[] = [];
  loading = true;
  modalOpen = false;
  form: any = { ...EMPTY };
  saving = false;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getEmployees().then((res) => { this.rows = res.data; }).finally(() => { this.loading = false; });
  }

  openAdd() { this.form = { ...EMPTY }; this.modalOpen = true; }

  async remove(id: number) {
    if (!confirm('Delete this employee? Their login will be removed.')) return;
    try {
      await this.api.deleteEmployee(id);
      this.toast.success('Employee deleted.');
      this.load();
    } catch (err) {
      this.toast.error(errMsg(err, 'Delete failed.'));
    }
  }

  async submit(e: Event) {
    e.preventDefault();
    this.saving = true;
    try {
      await this.api.addEmployee(this.form);
      this.toast.success('Employee added.');
      this.modalOpen = false;
      this.load();
    } catch (err) {
      this.toast.error(errMsg(err, 'Save failed.'));
    } finally {
      this.saving = false;
    }
  }
}
