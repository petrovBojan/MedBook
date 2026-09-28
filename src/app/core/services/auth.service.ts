import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BrowserStorageService } from './browser-storage.service';
import { StaffMember } from '../../shared/models/staff-member.model';
import { environment } from '../../../environments/environment';

// The session token itself lives in an HttpOnly cookie set by the API - no script in the
// page, ours included, can read it. What's kept here is only non-secret state: who is
// logged in and until when, so a reload can go straight to the app without asking the
// server first. If the cookie turns out to be invalid, the first API call gets a 401 and
// the interceptor ends the session.
const EXPIRES_AT_KEY = 'medbook_session_expires_at';
const USER_KEY = 'medbook_current_user';

// Left behind by earlier versions: medbook_db was the pre-API mock's full copy of the demo
// patient data; medbook_token / medbook_session held the bearer token in plain
// localStorage. Cleared on startup so none of it lingers.
const LEGACY_KEYS = ['medbook_token', 'medbook_db', 'medbook_session'];

interface SessionResponse {
  expiresAt: string;
  user: StaffMember;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(BrowserStorageService);

  private readonly currentUser = new BehaviorSubject<StaffMember | null>(this.restoreUser());
  readonly currentUser$ = this.currentUser.asObservable();

  constructor() {
    LEGACY_KEYS.forEach((key) => this.storage.removeItem(key));
  }

  login(email: string, password: string): Observable<StaffMember> {
    return this.http.post<SessionResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      map(({ expiresAt, user }) => {
        this.storage.setItem(EXPIRES_AT_KEY, expiresAt);
        this.storage.setItem(USER_KEY, user);
        this.currentUser.next(user);
        return user;
      })
    );
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

  getCurrentUser(): StaffMember | null {
    return this.currentUser.value;
  }

  private clearLocalSession(): void {
    this.storage.removeItem(EXPIRES_AT_KEY);
    this.storage.removeItem(USER_KEY);
    this.currentUser.next(null);
  }

  private restoreUser(): StaffMember | null {
    if (!this.isLoggedIn()) {
      return null;
    }
    return this.storage.getItem<StaffMember>(USER_KEY);
  }
}
