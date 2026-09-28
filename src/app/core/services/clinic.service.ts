import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Clinic } from '../../shared/models/clinic.model';
import { WorkingHours } from '../../shared/models/working-hours.model';
import { environment } from '../../../environments/environment';
import { undefinedIfNotFound } from '../http/api-error';

@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clinics`;

  /** The logged-in staff member's clinic (the API resolves it from the session token). */
  getCurrentClinic(): Observable<Clinic | undefined> {
    return this.http.get<Clinic>(`${this.baseUrl}/current`).pipe(undefinedIfNotFound());
  }

  updateWorkingHours(clinicId: string, workingHours: WorkingHours): Observable<Clinic> {
    return this.http.put<Clinic>(`${this.baseUrl}/${encodeURIComponent(clinicId)}/working-hours`, workingHours);
  }
}
