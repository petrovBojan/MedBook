import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BrowserStorageService } from './browser-storage.service';
import { StaffMember } from '../../shared/models/staff-member.model';
import { PlatformAdmin, Session } from '../../shared/models/account.model';
import { environment } from '../../../environments/environment';

// The session token itself lives in an HttpOnly cookie set by the API - no script in the
// page, ours included, can read it. What's kept here is only non-secret state: who is
// logged in and until when, so a reload can go straight to the app without asking the
// server first. If the cookie turns out to be invalid, the first API call gets a 401 and
// the interceptor ends the session.
const EXPIRES_AT_KEY = 'medbook_session_expires_at';
const USER_KEY = 'medbook_current_user';
const PLATFORM_ADMIN_KEY = 'medbook_platform_admin';

// Left behind by earlier versions: medbook_db was the pre-API mock's full copy of the demo
// patient data; medbook_token / medbook_session held the bearer token in plain
// localStorage. Cleared on startup so none of it lingers.
const LEGACY_KEYS = ['medbook_token', 'medbook_db', 'medbook_session'];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(BrowserStorageService);

  /** A clinic staff member's session (null for the platform owner). */
  private readonly currentUser = new BehaviorSubject<StaffMember | null>(this.restore<StaffMember>(USER_KEY));
  readonly currentUser$ = this.currentUser.asObservable();

  /** The platform owner's session (null for clinic staff). */
  private readonly platformAdmin = new BehaviorSubject<PlatformAdmin | null>(this.restore<PlatformAdmin>(PLATFORM_ADMIN_KEY));
  readonly platformAdmin$ = this.platformAdmin.asObservable();

  constructor() {
    LEGACY_KEYS.forEach((key) => this.storage.removeItem(key));
  }

  login(email: string, password: string): Observable<Session> {
    return this.http
      .post<Session>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((session) => this.applySession(session)));
  }

  /** Records a session the API has just started (login, or registering via an invitation). */
  applySession(session: Session): void {
    this.clearLocalSession();
    this.storage.setItem(EXPIRES_AT_KEY, session.expiresAt);
    if (session.platformAdmin) {
      this.storage.setItem(PLATFORM_ADMIN_KEY, session.platformAdmin);
      this.platformAdmin.next(session.platformAdmin);
    } else if (session.user) {
      this.storage.setItem(USER_KEY, session.user);
      this.currentUser.next(session.user);
    }
  }

  /**
   * Replaces the stored staff member after they edit their own profile or photo, so the
   * toolbar avatar and name update everywhere. The session itself doesn't change.
   */
  updateCurrentUser(user: StaffMember): void {
    if (!this.isClinicStaff()) {
      return;
    }
    this.storage.setItem(USER_KEY, user);
    this.currentUser.next(user);
  }

  /** Ends the session here and asks the API to clear the (HttpOnly) session cookie. */
  logout(): void {
    this.clearLocalSession();
    // Best effort: the local session is already gone, and the cookie expires on its own.
    this.http.post(`${environment.apiUrl}/auth/logout`, null).subscribe({ error: () => undefined });
  }

  isLoggedIn(): boolean {
    const expiresAt = this.storage.getItem<string>(EXPIRES_AT_KEY);
    return !!expiresAt && Date.parse(expiresAt) > Date.now();
  }

  isPlatformAdmin(): boolean {
    return this.isLoggedIn() && this.platformAdmin.value !== null;
  }

  isClinicStaff(): boolean {
    return this.isLoggedIn() && this.currentUser.value !== null;
  }

  getCurrentUser(): StaffMember | null {
    return this.currentUser.value;
  }

  getPlatformAdmin(): PlatformAdmin | null {
    return this.platformAdmin.value;
  }

  /** Where this session starts: the admin panel for the platform owner, the calendar for staff. */
  homeUrl(): string {
    return this.isPlatformAdmin() ? '/admin' : '/calendar';
  }

  private clearLocalSession(): void {
    this.storage.removeItem(EXPIRES_AT_KEY);
    this.storage.removeItem(USER_KEY);
    this.storage.removeItem(PLATFORM_ADMIN_KEY);
    this.currentUser.next(null);
    this.platformAdmin.next(null);
  }

  private restore<T>(key: string): T | null {
    return this.isLoggedIn() ? this.storage.getItem<T>(key) : null;
  }
}
