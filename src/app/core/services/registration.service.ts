import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { InvitationDetails, Session } from '../../shared/models/account.model';
import { environment } from '../../../environments/environment';

// The invitation token is sent in POST bodies, never in API URLs, so it stays out of logs.
@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  private readonly http = inject(HttpClient);
  private readonly authSrv = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/registration`;

  getInvitation(token: string): Observable<InvitationDetails> {
    return this.http.post<InvitationDetails>(`${this.baseUrl}/invitation`, { token });
  }

  /** Sets the password and starts the new staff member's session. */
  register(token: string, password: string): Observable<Session> {
    return this.http
      .post<Session>(this.baseUrl, { token, password })
      .pipe(tap((session) => this.authSrv.applySession(session)));
  }
}
