import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { MockDbService } from './mock-db.service';
import { AuthService } from './auth.service';
import { Appointment, AppointmentDto, AppointmentStatus } from '../../shared/models/appointment.model';
import { WorkingHours, Weekday } from '../../shared/models/working-hours.model';
import { DateTimeUtils } from '../../shared/utils/date-time.utils';

const WEEKDAY_BY_JS_DAY: Weekday[] = [
  Weekday.Sunday,
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
  Weekday.Saturday
];

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
   * Returns an error message if the given appointment slot is invalid for the
   * chosen doctor - outside their working hours or clashing with another active
   * appointment - otherwise null. Exposed so the appointment form can surface the
   * same check live, before the user submits.
   */
  checkAvailability(dto: AppointmentDto, excludeId?: string): string | null {
    return this.validate(this.requireClinicId(), dto, excludeId);
  }

  private validate(clinicId: string, dto: AppointmentDto, excludeId?: string): string | null {
    // Cancelling shouldn't be blocked by a schedule conflict - it's the appointment
    // being removed from the schedule, not a new slot being claimed.
    if (dto.status === AppointmentStatus.Cancelled) {
      return null;
    }

    const start = new Date(dto.start);
    const end = new Date(dto.end);

    if (end <= start) {
      return 'End time must be after the start time.';
    }

    if (DateTimeUtils.toLocalDateString(start) !== DateTimeUtils.toLocalDateString(end)) {
      return 'Appointments must start and end on the same day.';
    }

    const weekday = WEEKDAY_BY_JS_DAY[start.getDay()];

    const clinic = this.mockDb.getClinic(clinicId);
    if (clinic?.workingHours) {
      const clinicError = this.checkWithinHours(clinic.workingHours, weekday, start, end, clinic.name, 'is closed');
      if (clinicError) {
        return clinicError;
      }
    }

    const doctor = this.mockDb.getStaffById(dto.doctorId);
    if (doctor?.workingHours) {
      const doctorError = this.checkWithinHours(
        doctor.workingHours,
        weekday,
        start,
        end,
        `Dr. ${doctor.lastName}`,
        "doesn't work"
      );
      if (doctorError) {
        return doctorError;
      }
    }

    const overlaps = this.mockDb
      .getAppointments(clinicId)
      .some(
        (existing) =>
          existing.id !== excludeId &&
          existing.doctorId === dto.doctorId &&
          existing.status !== AppointmentStatus.Cancelled &&
          start < new Date(existing.end) &&
          end > new Date(existing.start)
      );

    return overlaps ? 'This doctor already has an appointment during that time.' : null;
  }

  /** `closedVerb` is the phrase used when the day isn't enabled at all, e.g. "is closed" / "doesn't work". */
  private checkWithinHours(
    workingHours: WorkingHours,
    weekday: Weekday,
    start: Date,
    end: Date,
    subject: string,
    closedVerb: string
  ): string | null {
    const daySchedule = workingHours.find((d) => d.day === weekday);

    if (!daySchedule?.enabled) {
      return `${subject} ${closedVerb} on ${weekday}s.`;
    }

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const [workStartMinutes, workEndMinutes] = [daySchedule.start, daySchedule.end].map((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    });

    if (startMinutes < workStartMinutes || endMinutes > workEndMinutes) {
      return `${subject}'s hours on ${weekday}s are ${daySchedule.start}–${daySchedule.end}.`;
    }

    return null;
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
