import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { PasswordResetDetails, Session } from '../../shared/models/account.model';
import { environment } from '../../../environments/environment';

// Both flows replace the session: the API ends every session that predates the new password
// and sets a fresh session cookie, which is recorded here.
@Injectable({
  providedIn: 'root'
})
export class PasswordService {
  private readonly http = inject(HttpClient);
  private readonly authSrv = inject(AuthService);

  /** Whose password a reset link is for. The token goes in the POST body, never in an API URL. */
  getResetDetails(token: string): Observable<PasswordResetDetails> {
    return this.http.post<PasswordResetDetails>(`${environment.apiUrl}/password-reset/details`, { token });
  }

  /** Uses a reset link from an admin: sets the new password and starts a session. */
  resetPassword(token: string, password: string): Observable<Session> {
    return this.http
      .post<Session>(`${environment.apiUrl}/password-reset`, { token, password })
      .pipe(tap((session) => this.authSrv.applySession(session)));
  }

  /** The logged-in user (staff or platform owner) changes their own password. */
  changePassword(currentPassword: string, newPassword: string): Observable<Session> {
    return this.http
      .put<Session>(`${environment.apiUrl}/account/password`, { currentPassword, newPassword })
      .pipe(tap((session) => this.authSrv.applySession(session)));
  }
}
