import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

// Bundled with the app instead of fetched over HTTP: each language becomes its own lazy chunk
// with a content hash in its name, so a deploy never serves a stale translation from cache,
// and the requests don't go through the API interceptor.
const TRANSLATIONS: Record<string, () => Promise<{ default: Translation }>> = {
  en: () => import('../../../i18n/en.json'),
  mk: () => import('../../../i18n/mk.json')
};

@Injectable({ providedIn: 'root' })
export class BundledTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Promise<Translation> {
    return (TRANSLATIONS[lang] ?? TRANSLATIONS['en'])().then((module) => module.default);
  }
}
