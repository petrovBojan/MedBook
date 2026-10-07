import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateStaffDto, StaffMember, UpdateStaffRoleDto } from '../../shared/models/staff-member.model';
import { Invitation, PasswordResetLink, StaffInvitation } from '../../shared/models/account.model';
import { WorkingHours } from '../../shared/models/working-hours.model';
import { environment } from '../../../environments/environment';
import { undefinedIfNotFound } from '../http/api-error';

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/staff`;

  getClinicStaff(): Observable<StaffMember[]> {
    return this.http.get<StaffMember[]>(this.baseUrl);
  }

  getDoctors(): Observable<StaffMember[]> {
    return this.http.get<StaffMember[]>(`${this.baseUrl}/doctors`);
  }

  getStaffById(id: string): Observable<StaffMember | undefined> {
    return this.http.get<StaffMember>(`${this.baseUrl}/${encodeURIComponent(id)}`).pipe(undefinedIfNotFound());
  }

  updateWorkingHours(staffId: string, workingHours: WorkingHours): Observable<StaffMember> {
    return this.http.put<StaffMember>(`${this.baseUrl}/${encodeURIComponent(staffId)}/working-hours`, workingHours);
  }

  /** Clinic admins: adds a staff member; the response carries their one-time invitation. */
  createStaff(dto: CreateStaffDto): Observable<StaffInvitation> {
    return this.http.post<StaffInvitation>(this.baseUrl, dto);
  }

  /** Clinic admins: makes a staff member a doctor or an employee (specialty is for doctors only). */
  updateRole(staffId: string, dto: UpdateStaffRoleDto): Observable<StaffMember> {
    return this.http.put<StaffMember>(`${this.baseUrl}/${encodeURIComponent(staffId)}/role`, dto);
  }

  /** Clinic admins: a new invitation link for someone who hasn't registered (the old link stops working). */
  regenerateInvitation(staffId: string): Observable<Invitation> {
    return this.http.post<Invitation>(`${this.baseUrl}/${encodeURIComponent(staffId)}/invitation`, null);
  }

  /** Clinic admins: a password reset link for a registered staff member (their previous reset link stops working). */
  createPasswordReset(staffId: string): Observable<PasswordResetLink> {
    return this.http.post<PasswordResetLink>(`${this.baseUrl}/${encodeURIComponent(staffId)}/password-reset`, null);
  }
}
