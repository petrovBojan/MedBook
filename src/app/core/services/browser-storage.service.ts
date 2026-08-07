import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Thin localStorage wrapper that no-ops on the server, so services can be
// injected and constructed during SSR without touching a missing `window`.
@Injectable({
  providedIn: 'root'
})
export class BrowserStorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  getItem<T>(key: string): T | null {
    if (!this.isBrowser) {
      return null;
    }
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  setItem(key: string, value: unknown): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  removeItem(key: string): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(key);
  }
}
