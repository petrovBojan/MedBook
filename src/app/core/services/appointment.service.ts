import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { MockDbService } from './mock-db.service';
import { AuthService } from './auth.service';
import { Appointment, AppointmentDto, AppointmentStatus } from '../../shared/models/appointment.model';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly mockDb = inject(MockDbService);
  private readonly authSrv = inject(AuthService);

  getAppointments(): Observable<Appointment[]> {
    const clinicId = this.requireClinicId();
    return of(this.mockDb.getAppointments(clinicId));
  }

  getAppointment(id: string): Observable<Appointment | undefined> {
    return of(this.mockDb.getAppointment(id));
  }

  createAppointment(dto: AppointmentDto): Observable<Appointment> {
    const clinicId = this.requireClinicId();
    const staffId = this.requireStaffId();
    const validationError = this.validate(clinicId, dto);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const now = new Date().toISOString();
    const appointment: Appointment = {
      ...dto,
      id: crypto.randomUUID(),
      clinicId,
      createdBy: staffId,
      createdAt: now,
      updatedAt: now
    };
    return of(this.mockDb.createAppointment(appointment));
  }

  updateAppointment(id: string, dto: AppointmentDto): Observable<Appointment> {
    const clinicId = this.requireClinicId();
    const staffId = this.requireStaffId();
    const validationError = this.validate(clinicId, dto, id);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const updated = this.mockDb.updateAppointment(id, {
      ...dto,
      updatedBy: staffId,
      updatedAt: new Date().toISOString()
    });
    if (!updated) {
      return throwError(() => new Error('Appointment not found.'));
    }
    return of(updated);
  }

  /**
   * Returns an error message if the appointment is invalid or overlaps another
   * active appointment for the same doctor, otherwise null.
   */
  private validate(clinicId: string, dto: AppointmentDto, excludeId?: string): string | null {
    if (new Date(dto.end) <= new Date(dto.start)) {
      return 'End time must be after the start time.';
    }

    const overlaps = this.mockDb
      .getAppointments(clinicId)
      .some(
        (existing) =>
          existing.id !== excludeId &&
          existing.doctorId === dto.doctorId &&
          existing.status !== AppointmentStatus.Cancelled &&
          new Date(dto.start) < new Date(existing.end) &&
          new Date(dto.end) > new Date(existing.start)
      );

    return overlaps ? 'This doctor already has an appointment during that time.' : null;
  }

  private requireClinicId(): string {
    const clinicId = this.authSrv.getCurrentClinicId();
    if (!clinicId) {
      throw new Error('No clinic in session.');
    }
    return clinicId;
  }

  private requireStaffId(): string {
    const staffId = this.authSrv.getCurrentUser()?.id;
    if (!staffId) {
      throw new Error('No staff member in session.');
    }
    return staffId;
  }
}
