import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeMk from '@angular/common/locales/mk';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_NATIVE_DATE_FORMATS, provideNativeDateAdapter } from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { apiInterceptor } from './core/http/api.interceptor';
import { provideTransloco } from '@jsverse/transloco';
import { BundledTranslocoLoader } from './core/i18n/transloco-loader';
import { LanguageService } from './core/services/language.service';

// Date names and formats for Macedonian (en-US is built in). LOCALE_ID stays en-US - it
// can't change at runtime, so dates are formatted with LanguageService.locale() instead.
registerLocaleData(localeMk);

// Force 24h time (no AM/PM) everywhere the native date adapter formats a time -
// timepicker inputs and their dropdown options - regardless of the browser locale.
const DATE_FORMATS = {
  ...MAT_NATIVE_DATE_FORMATS,
  display: {
    ...MAT_NATIVE_DATE_FORMATS.display,
    timeInput: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
    timeOptionLabel: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
  }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor])),
    provideAnimationsAsync(),
    provideNativeDateAdapter(DATE_FORMATS),
    provideTransloco({
      config: {
        availableLangs: ['en', 'mk'],
        defaultLang: 'en',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        // A key missing from mk.json shows the English text rather than the raw key.
        missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() }
      },
      loader: BundledTranslocoLoader
    }),
    provideAppInitializer(() => inject(LanguageService).init()),
    // No empty space reserved under every field for an error that usually isn't there -
    // the field label above already reserves its own space (see .field-label--empty in
    // styles.scss), and the two together left large gaps between form rows. An error
    // message, when there is one, takes up room as it appears instead.
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { subscriptSizing: 'dynamic' } }
  ]
};
