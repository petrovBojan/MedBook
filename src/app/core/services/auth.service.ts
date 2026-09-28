import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BrowserStorageService } from './browser-storage.service';
import { StaffMember } from '../../shared/models/staff-member.model';
import { environment } from '../../../environments/environment';

const SESSION_KEY = 'medbook_session';
const USER_KEY = 'medbook_current_user';

// Left behind by the pre-API mock backend. medbook_db held a full copy of the demo
// clinic's patient data, so it's cleared rather than left sitting in localStorage.
const LEGACY_KEYS = ['medbook_token', 'medbook_db'];

interface LoginResponse {
  token: string;
  expiresAt: string;
  user: StaffMember;
}

interface StoredSession {
  token: string;
  expiresAt: string;
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
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      map(({ token, expiresAt, user }) => {
        this.storage.setItem(SESSION_KEY, { token, expiresAt } satisfies StoredSession);
        this.storage.setItem(USER_KEY, user);
        this.currentUser.next(user);
        return user;
      })
    );
  }

  logout(): void {
    this.storage.removeItem(SESSION_KEY);
    this.storage.removeItem(USER_KEY);
    this.currentUser.next(null);
  }

  isLoggedIn(): boolean {
    return this.getSession() !== null;
  }

  /** The bearer token for API calls, or null if there's no unexpired session. */
  getToken(): string | null {
    return this.getSession()?.token ?? null;
  }

  getCurrentUser(): StaffMember | null {
    return this.currentUser.value;
  }

  private getSession(): StoredSession | null {
    const session = this.storage.getItem<StoredSession>(SESSION_KEY);
    return session && Date.parse(session.expiresAt) > Date.now() ? session : null;
  }

  private restoreUser(): StaffMember | null {
    if (!this.isLoggedIn()) {
      return null;
    }
    return this.storage.getItem<StaffMember>(USER_KEY);
  }
}
