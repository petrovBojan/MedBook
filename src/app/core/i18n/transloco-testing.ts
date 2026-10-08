import { EnvironmentProviders, importProvidersFrom } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import en from '../../../i18n/en.json';
import mk from '../../../i18n/mk.json';

/** Transloco for unit tests, with the real translation files loaded up front; English is active. */
export function provideTranslocoTesting(): EnvironmentProviders {
  return importProvidersFrom(
    TranslocoTestingModule.forRoot({
      langs: { en, mk },
      translocoConfig: { availableLangs: ['en', 'mk'], defaultLang: 'en' },
      preloadLangs: true
    })
  );
}
