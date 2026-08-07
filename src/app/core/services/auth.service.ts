import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { BrowserStorageService } from './browser-storage.service';
import { MockDbService } from './mock-db.service';
import { StaffMember } from '../../shared/models/staff-member.model';

const TOKEN_KEY = 'medbook_token';
const USER_KEY = 'medbook_current_user';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hour session, matches a typical clinic shift

interface MockTokenPayload {
  sub: string;
  clinicId: string;
  exp: number;
}

// Stand-in for a backend-issued JWT. It has the same 3-part shape (header.payload.signature)
// and an `exp` claim, but the "signature" is not cryptographically real - once there's a real
// API, swap issueToken/decodeToken for the token it returns and everything else here is unchanged.
function issueToken(payload: MockTokenPayload): string {
  const header = btoa(JSON.stringify({ alg: 'mock', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.mocksignature`;
}

function decodeToken(token: string): MockTokenPayload | null {
  try {
    const [, body] = token.split('.');
    return JSON.parse(atob(body)) as MockTokenPayload;
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storage = inject(BrowserStorageService);
  private readonly mockDb = inject(MockDbService);

  private readonly currentUser = new BehaviorSubject<StaffMember | null>(this.restoreUser());
  readonly currentUser$ = this.currentUser.asObservable();

  login(email: string, password: string): Observable<StaffMember> {
    const staff = this.mockDb.getStaffByEmail(email);
    const credentials = staff ? this.mockDb.getCredentials(staff.id) : undefined;

    if (!staff || !credentials || credentials.password !== password) {
      return throwError(() => new Error('Invalid email or password.')).pipe(delay(300));
    }

    const token = issueToken({
      sub: staff.id,
      clinicId: staff.clinicId,
      exp: Date.now() + TOKEN_TTL_MS
    });

    return of(staff).pipe(
      delay(300),
      map((user) => {
        this.storage.setItem(TOKEN_KEY, token);
        this.storage.setItem(USER_KEY, user);
        this.currentUser.next(user);
        return user;
      })
    );
  }

  logout(): void {
    this.storage.removeItem(TOKEN_KEY);
    this.storage.removeItem(USER_KEY);
    this.currentUser.next(null);
  }

  isLoggedIn(): boolean {
    const token = this.storage.getItem<string>(TOKEN_KEY);
    const payload = token ? decodeToken(token) : null;
    return !!payload && payload.exp > Date.now();
  }

  getCurrentUser(): StaffMember | null {
    return this.currentUser.value;
  }

  getCurrentClinicId(): string | null {
    return this.currentUser.value?.clinicId ?? null;
  }

  private restoreUser(): StaffMember | null {
    if (!this.isLoggedIn()) {
      return null;
    }
    return this.storage.getItem<StaffMember>(USER_KEY);
  }
}
