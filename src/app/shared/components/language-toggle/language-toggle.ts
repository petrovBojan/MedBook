import { Component, inject } from '@angular/core';
import { APP_LANGUAGES, LanguageService } from '../../../core/services/language.service';

/**
 * "EN · MK" in the corner of the logged-out pages (sign in, invitation, password reset).
 * Logged in, the language is picked from the account menu instead.
 */
@Component({
  selector: 'app-language-toggle',
  template: `
    @for (lang of languages; track lang.code; let last = $last) {
      <button
        type="button"
        class="lang-option"
        [class.lang-option--active]="lang.code === language.current()"
        [attr.aria-pressed]="lang.code === language.current()"
        [attr.lang]="lang.code"
        [title]="lang.label"
        (click)="language.use(lang.code)"
      >
        {{ lang.code.toUpperCase() }}
      </button>
      @if (!last) {
        <span class="lang-separator" aria-hidden="true">&middot;</span>
      }
    }
  `,
  styles: `
    :host {
      position: fixed;
      top: 12px;
      right: 16px;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 13px;
    }

    .lang-option {
      border: none;
      background: none;
      padding: 4px 6px;
      border-radius: 6px;
      font: inherit;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      cursor: pointer;
    }

    .lang-option:hover {
      background: var(--mat-sys-surface-container-high);
    }

    .lang-option--active {
      color: var(--mat-sys-primary);
      font-weight: 700;
    }

    .lang-separator {
      color: var(--mat-sys-outline);
    }
  `
})
export class LanguageToggle {
  readonly language = inject(LanguageService);
  readonly languages = APP_LANGUAGES;
}
