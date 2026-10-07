import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_NATIVE_DATE_FORMATS, provideNativeDateAdapter } from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { apiInterceptor } from './core/http/api.interceptor';

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
    // No empty space reserved under every field for an error that usually isn't there -
    // the field label above already reserves its own space (see .field-label--empty in
    // styles.scss), and the two together left large gaps between form rows. An error
    // message, when there is one, takes up room as it appears instead.
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { subscriptSizing: 'dynamic' } }
  ]
};
