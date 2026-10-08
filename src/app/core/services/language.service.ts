import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { BrowserStorageService } from './browser-storage.service';
import { ProfileService } from './profile.service';

export type AppLanguage = 'en' | 'mk';

/** The languages the app ships, each labelled in its own language for the switcher. */
export const APP_LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'mk', label: 'Македонски' }
];

// Angular locale ids (registered in app.config.ts) used for dates and numbers.
const LOCALE_IDS: Record<AppLanguage, string> = { en: 'en-US', mk: 'mk' };

const LANGUAGE_KEY = 'medbook_language';

function isAppLanguage(value: unknown): value is AppLanguage {
  return APP_LANGUAGES.some((lang) => lang.code === value);
}

/**
 * The app's current language. The choice is kept in localStorage and, for clinic staff, on
 * their profile too, so it follows them to other devices. On startup the order is: the
 * logged-in user's saved choice, this browser's last choice, the browser's own language if
 * it's Macedonian, otherwise English.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly storage = inject(BrowserStorageService);
  private readonly authSrv = inject(AuthService);
  private readonly profileSrv = inject(ProfileService);
  private readonly dateAdapter = inject<DateAdapter<unknown>>(DateAdapter);
  private readonly document = inject(DOCUMENT);

  private readonly language = signal<AppLanguage>('en');
  readonly current = this.language.asReadonly();
  /** For DatePipe/formatDate, angular-calendar and the like. */
  readonly locale = computed(() => LOCALE_IDS[this.language()]);

  /** Run once before the app renders (provideAppInitializer), so no untranslated keys flash up. */
  init(): Promise<unknown> {
    this.apply(this.initialLanguage());

    // Logging in (or registering) on a device brings the user's saved choice with it.
    this.authSrv.currentUser$.subscribe((user) => {
      if (isAppLanguage(user?.preferredLanguage) && user.preferredLanguage !== this.language()) {
        this.apply(user.preferredLanguage);
      }
    });

    return firstValueFrom(this.transloco.load(this.language()));
  }

  /** Switches the language and remembers it - in this browser, and on the profile for clinic staff. */
  use(language: AppLanguage): void {
    this.apply(language);

    const user = this.authSrv.getCurrentUser();
    if (this.authSrv.isClinicStaff() && user?.preferredLanguage !== language) {
      // Best effort: the switch has already happened here; only other devices miss out.
      this.profileSrv.updateLanguage(language).subscribe({ error: () => undefined });
    }
  }

  private apply(language: AppLanguage): void {
    this.language.set(language);
    this.storage.setItem(LANGUAGE_KEY, language);
    this.transloco.setActiveLang(language);
    this.dateAdapter.setLocale(LOCALE_IDS[language]);
    this.document.documentElement.lang = language;
  }

  private initialLanguage(): AppLanguage {
    const saved = this.authSrv.getCurrentUser()?.preferredLanguage ?? this.storage.getItem<string>(LANGUAGE_KEY);
    if (isAppLanguage(saved)) {
      return saved;
    }
    // No navigator.language on the server (route extraction at build time runs this too).
    const browser = this.document.defaultView?.navigator?.language?.slice(0, 2);
    return browser === 'mk' ? 'mk' : 'en';
  }
}
