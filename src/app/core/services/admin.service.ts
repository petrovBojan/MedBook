import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClinicSummary, CreateClinicDto, CreatedClinic, Invitation } from '../../shared/models/account.model';
import { StaffMember } from '../../shared/models/staff-member.model';
import { environment } from '../../../environments/environment';

/** The platform owner's API: clinics and who has access to them. */
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/clinics`;

  getClinics(): Observable<ClinicSummary[]> {
    return this.http.get<ClinicSummary[]>(this.baseUrl);
  }

  getClinic(id: string): Observable<ClinicSummary> {
    return this.http.get<ClinicSummary>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  createClinic(dto: CreateClinicDto): Observable<CreatedClinic> {
    return this.http.post<CreatedClinic>(this.baseUrl, dto);
  }

  setClinicActive(id: string, isActive: boolean): Observable<ClinicSummary> {
    return this.http.put<ClinicSummary>(`${this.baseUrl}/${encodeURIComponent(id)}/status`, { isActive });
  }

  getClinicStaff(id: string): Observable<StaffMember[]> {
    return this.http.get<StaffMember[]>(`${this.baseUrl}/${encodeURIComponent(id)}/staff`);
  }

  regenerateInvitation(clinicId: string, staffId: string): Observable<Invitation> {
    return this.http.post<Invitation>(
      `${this.baseUrl}/${encodeURIComponent(clinicId)}/staff/${encodeURIComponent(staffId)}/invitation`,
      null
    );
  }
}
