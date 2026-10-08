import { Pipe, PipeTransform, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { LanguageService } from '../../core/services/language.service';

/**
 * DatePipe in the app's current language ("Thursday, October 8" / "четврток, 8 октомври").
 * LOCALE_ID is fixed at startup, so Angular's own DatePipe can't follow a language switch.
 * Impure so it re-renders when the language changes; formatting a date is cheap.
 */
@Pipe({ name: 'appDate', pure: false })
export class AppDatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(value: Date | string | number | null | undefined, format = 'mediumDate'): string | null {
    return value == null || value === '' ? null : formatDate(value, format, this.language.locale());
  }
}
