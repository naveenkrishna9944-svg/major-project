import { Injectable } from '@angular/core';

export type Theme = 'Light' | 'Dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme: Theme = (localStorage.getItem('mart_theme') as Theme) || 'Light';

  constructor() {
    this.apply();
  }

  set(theme: string) {
    this.theme = theme === 'Dark' ? 'Dark' : 'Light';
    this.apply();
  }

  toggle() {
    this.set(this.theme === 'Dark' ? 'Light' : 'Dark');
  }

  private apply() {
    document.documentElement.classList.toggle('dark', this.theme === 'Dark');
    localStorage.setItem('mart_theme', this.theme);
  }
}
