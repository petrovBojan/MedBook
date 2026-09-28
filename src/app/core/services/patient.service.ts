import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Patient, PatientDto } from '../../shared/models/patient.model';
import { environment } from '../../../environments/environment';
import { undefinedIfNotFound } from '../http/api-error';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/patients`;

  /** Sorted by last name, then first name (server-side). */
  getPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.baseUrl);
  }

  getPatient(id: string): Observable<Patient | undefined> {
    return this.http.get<Patient>(`${this.baseUrl}/${encodeURIComponent(id)}`).pipe(undefinedIfNotFound());
  }

  createPatient(dto: PatientDto): Observable<Patient> {
    return this.http.post<Patient>(this.baseUrl, dto);
  }

  updatePatient(id: string, dto: PatientDto): Observable<Patient> {
    return this.http.put<Patient>(`${this.baseUrl}/${encodeURIComponent(id)}`, dto);
  }
}
