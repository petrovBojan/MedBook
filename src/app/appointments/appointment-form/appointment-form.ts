import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { merge } from 'rxjs';
import { addMinutes } from 'date-fns';
import { AppointmentService } from '../../core/services/appointment.service';
import { StaffService } from '../../core/services/staff.service';
import { PatientService } from '../../core/services/patient.service';
import { AppointmentDto, AppointmentStatus } from '../../shared/models/appointment.model';
import { StaffMember } from '../../shared/models/staff-member.model';
import { Patient } from '../../shared/models/patient.model';
import { DateTimeUtils } from '../../shared/utils/date-time.utils';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { PatientForm } from '../../patients/patient-form/patient-form';

export interface AppointmentFormDialogData {
  appointmentId?: string;
  patientId?: string;
  date?: string;
}

@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.html',
  styleUrl: './appointment-form.css',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatDialogModule
  ]
})
export class AppointmentForm {
  private readonly fb = inject(FormBuilder);
  private readonly appointmentSrv = inject(AppointmentService);
  private readonly staffSrv = inject(StaffService);
  private readonly patientSrv = inject(PatientService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<AppointmentForm, boolean>);
  private readonly data = inject<AppointmentFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly AppointmentStatus = AppointmentStatus;
  readonly appointmentId = this.data.appointmentId;
  readonly isEditMode = !!this.appointmentId;

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly scheduleWarning = signal<string | null>(null);
  readonly doctors = signal<StaffMember[]>([]);
  readonly patients = signal<Patient[]>([]);

  readonly form = this.fb.nonNullable.group({
    doctorId: ['', Validators.required],
    patientId: ['', Validators.required],
    startDate: [new Date(), Validators.required],
    startTime: [new Date(), Validators.required],
    endDate: [new Date(), Validators.required],
    endTime: [addMinutes(new Date(), 30), Validators.required],
    reason: [''],
    notes: [''],
    status: [AppointmentStatus.Scheduled, Validators.required]
  });

  constructor() {
    this.staffSrv.getDoctors().subscribe((doctors) => this.doctors.set(doctors));
    this.patientSrv.getPatients().subscribe((patients) => this.patients.set(patients));

    if (this.appointmentId) {
      this.appointmentSrv.getAppointment(this.appointmentId).subscribe((appointment) => {
        if (!appointment) {
          this.errorMessage.set('Appointment not found.');
          return;
        }
        const start = new Date(appointment.start);
        const end = new Date(appointment.end);
        // emitEvent: false - this is us prefilling the real end time, not the
        // auto-set-end-30-minutes-after-start behavior below reacting to it.
        this.form.patchValue(
          {
            doctorId: appointment.doctorId,
            patientId: appointment.patientId,
            startDate: start,
            startTime: start,
            endDate: end,
            endTime: end,
            reason: appointment.reason ?? '',
            notes: appointment.notes ?? '',
            status: appointment.status
          },
          { emitEvent: false }
        );
      });
    } else {
      if (this.data.patientId) {
        this.form.patchValue({ patientId: this.data.patientId });
      }

      if (this.data.date) {
        const start = new Date(`${this.data.date}T09:00`);
        const end = addMinutes(start, 30);
        this.form.patchValue({ startDate: start, startTime: start, endDate: end, endTime: end }, { emitEvent: false });
      }
    }

    // Whenever the start date or time changes, push the end date/time to 30 minutes
    // later - a reasonable default duration the user can still override afterwards.
    merge(this.form.controls.startDate.valueChanges, this.form.controls.startTime.valueChanges).subscribe(() => {
      const start = DateTimeUtils.combineDateAndTime(
        this.form.controls.startDate.value,
        this.form.controls.startTime.value
      );
      const end = addMinutes(start, 30);
      this.form.patchValue({ endDate: end, endTime: end });
    });

    // Surface working-hours/double-booking conflicts live as the doctor or date/time
    // fields change, rather than only after the user hits submit.
    merge(
      this.form.controls.doctorId.valueChanges,
      this.form.controls.startDate.valueChanges,
      this.form.controls.startTime.valueChanges,
      this.form.controls.endDate.valueChanges,
      this.form.controls.endTime.valueChanges
    ).subscribe(() => this.checkSchedule());
    this.checkSchedule();
  }

  private checkSchedule(): void {
    const raw = this.form.getRawValue();
    if (!raw.doctorId) {
      this.scheduleWarning.set(null);
      return;
    }

    const start = DateTimeUtils.combineDateAndTime(raw.startDate, raw.startTime);
    const end = DateTimeUtils.combineDateAndTime(raw.endDate, raw.endTime);
    const dto: AppointmentDto = {
      doctorId: raw.doctorId,
      patientId: raw.patientId,
      start: start.toISOString(),
      end: end.toISOString(),
      status: raw.status
    };

    this.scheduleWarning.set(this.appointmentSrv.checkAvailability(dto, this.appointmentId));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const start = DateTimeUtils.combineDateAndTime(raw.startDate, raw.startTime);
    const end = DateTimeUtils.combineDateAndTime(raw.endDate, raw.endTime);
    const dto: AppointmentDto = {
      doctorId: raw.doctorId,
      patientId: raw.patientId,
      start: start.toISOString(),
      end: end.toISOString(),
      reason: raw.reason || undefined,
      notes: raw.notes || undefined,
      status: raw.status
    };

    const request = this.isEditMode
      ? this.appointmentSrv.updateAppointment(this.appointmentId!, dto)
      : this.appointmentSrv.createAppointment(dto);

    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message);
      }
    });
  }

  cancelAppointment(): void {
    if (!this.appointmentId) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Cancel appointment',
        message: 'This will mark the appointment as cancelled. Continue?',
        confirmLabel: 'Cancel appointment'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.form.patchValue({ status: AppointmentStatus.Cancelled });
      this.submit();
    });
  }

  openAddPatient(): void {
    const dialogRef = this.dialog.open<PatientForm, unknown, Patient | undefined>(PatientForm, {
      width: '640px',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((patient) => {
      if (!patient) {
        return;
      }
      this.patients.update((patients) => [...patients, patient]);
      this.form.patchValue({ patientId: patient.id });
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
