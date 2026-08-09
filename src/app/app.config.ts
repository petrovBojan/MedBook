import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_NATIVE_DATE_FORMATS, provideNativeDateAdapter } from '@angular/material/core';

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
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),
    provideNativeDateAdapter(DATE_FORMATS)
  ]
};
