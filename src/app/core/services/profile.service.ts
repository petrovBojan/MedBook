import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { StaffMember, UpdateProfileDto } from '../../shared/models/staff-member.model';
import { environment } from '../../../environments/environment';

/** The logged-in staff member's own profile. Every change is mirrored into the session's user. */
@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly authSrv = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/account`;

  getProfile(): Observable<StaffMember> {
    return this.http.get<StaffMember>(`${this.baseUrl}/profile`).pipe(tap((user) => this.authSrv.updateCurrentUser(user)));
  }

  updateProfile(dto: UpdateProfileDto): Observable<StaffMember> {
    return this.http.put<StaffMember>(`${this.baseUrl}/profile`, dto).pipe(tap((user) => this.authSrv.updateCurrentUser(user)));
  }

  /** Uploads an already-resized photo (see resizeToSquare). */
  uploadPhoto(photo: Blob): Observable<StaffMember> {
    const form = new FormData();
    form.append('file', photo, 'photo.jpg');
    return this.http.put<StaffMember>(`${this.baseUrl}/photo`, form).pipe(tap((user) => this.authSrv.updateCurrentUser(user)));
  }

  deletePhoto(): Observable<StaffMember> {
    return this.http.delete<StaffMember>(`${this.baseUrl}/photo`).pipe(tap((user) => this.authSrv.updateCurrentUser(user)));
  }
}
