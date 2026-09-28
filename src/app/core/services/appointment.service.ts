import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Appointment, AppointmentDto } from '../../shared/models/appointment.model';
import { environment } from '../../../environments/environment';
import { undefinedIfNotFound } from '../http/api-error';

export type AvailabilityCheckDto = Pick<AppointmentDto, 'doctorId' | 'start' | 'end' | 'status'>;

interface AvailabilityResponse {
  available: boolean;
  message?: string;
}

// Scheduling rules (working hours, same-day, no double-booking) are enforced by the API
// on create/update; a violation comes back as an ApiError carrying the reason.
@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/appointments`;

  getAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.baseUrl);
  }

  getAppointment(id: string): Observable<Appointment | undefined> {
    return this.http.get<Appointment>(`${this.baseUrl}/${encodeURIComponent(id)}`).pipe(undefinedIfNotFound());
  }

  createAppointment(dto: AppointmentDto): Observable<Appointment> {
    return this.http.post<Appointment>(this.baseUrl, dto);
  }

  updateAppointment(id: string, dto: AppointmentDto): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.baseUrl}/${encodeURIComponent(id)}`, dto);
  }

  /**
   * Emits an error message if the given slot is invalid for the chosen doctor - outside
   * their working hours or clashing with another active appointment - otherwise null.
   * Runs the same rules as create/update without saving, so the appointment form can
   * surface them live, before the user submits.
   */
  checkAvailability(dto: AvailabilityCheckDto, excludeId?: string): Observable<string | null> {
    return this.http
      .post<AvailabilityResponse>(`${this.baseUrl}/check-availability`, { ...dto, excludeId })
      .pipe(map((res) => (res.available ? null : (res.message ?? 'This time slot is not available.'))));
  }
}
