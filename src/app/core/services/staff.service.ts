import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StaffMember } from '../../shared/models/staff-member.model';
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
}
