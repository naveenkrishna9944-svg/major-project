import { Injectable } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

/** Tiny replacement for react-toastify (top-right, auto-closes after 2.5 s). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly autoClose = 2500;
  toasts: Toast[] = [];
  private seq = 0;

  success(message: string) { this.push('success', message); }
  error(message: string) { this.push('error', message); }

  dismiss(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  private push(type: Toast['type'], message: string) {
    const id = ++this.seq;
    this.toasts = [...this.toasts, { id, type, message }];
    setTimeout(() => this.dismiss(id), this.autoClose);
  }
}
