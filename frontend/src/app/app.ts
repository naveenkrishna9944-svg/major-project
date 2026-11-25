import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';
import { LoaderComponent } from './shared/loader.component';
import { ToastContainerComponent } from './shared/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoaderComponent, ToastContainerComponent],
  template: `
    @if (auth.loading) {
      <div class="min-h-screen flex items-center justify-center"><app-loader label="Checking session" /></div>
    }
    <router-outlet />
    <app-toast-container />
  `,
})
export class App {
  auth = inject(AuthService);
  private theme = inject(ThemeService); // applies the saved light/dark theme on start

  constructor() {
    this.auth.ensureLoaded();
  }
}
