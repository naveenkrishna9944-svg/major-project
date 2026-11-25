import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);

  user: any = null;
  /** true until the first session check has finished */
  loading = true;

  private ready?: Promise<void>;

  /** Checks the server session once (like AuthProvider's useEffect did). */
  ensureLoaded(): Promise<void> {
    if (!this.ready) {
      this.ready = this.api
        .checkSession()
        .then((res) => { this.user = res.data; })
        .catch(() => { this.user = null; })
        .finally(() => { this.loading = false; });
    }
    return this.ready;
  }

  async login(email: string, password: string) {
    const res = await this.api.login({ email, password });
    this.user = res.data;
    return res;
  }

  async logout() {
    try {
      await this.api.logout();
    } finally {
      this.user = null;
    }
  }

  get isAdmin() {
    return this.user?.role === 'Admin';
  }
}
