import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { addMinutes } from 'date-fns';
import { AppointmentService } from '../../core/services/appointment.service';
import { StaffService } from '../../core/services/staff.service';
import { PatientService } from '../../core/services/patient.service';
import { AppointmentDto, AppointmentStatus } from '../../shared/models/appointment.model';
import { StaffMember } from '../../shared/models/staff-member.model';
import { Patient } from '../../shared/models/patient.model';
import { DateTimeUtils } from '../../shared/utils/date-time.utils';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.html',
  styleUrl: './appointment-form.css',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule
  ]
})
export class AppointmentForm {
  private readonly fb = inject(FormBuilder);
  private readonly appointmentSrv = inject(AppointmentService);
  private readonly staffSrv = inject(StaffService);
  private readonly patientSrv = inject(PatientService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);

  readonly AppointmentStatus = AppointmentStatus;
  readonly appointmentId = this.route.snapshot.paramMap.get('id');
  readonly isEditMode = !!this.appointmentId;

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly doctors = signal<StaffMember[]>([]);
  readonly patients = signal<Patient[]>([]);

  readonly form = this.fb.nonNullable.group({
    doctorId: ['', Validators.required],
    patientId: ['', Validators.required],
    start: [DateTimeUtils.toLocalInputValue(new Date().toISOString()), Validators.required],
    end: [DateTimeUtils.toLocalInputValue(addMinutes(new Date(), 30).toISOString()), Validators.required],
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
        this.form.patchValue({
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          start: DateTimeUtils.toLocalInputValue(appointment.start),
          end: DateTimeUtils.toLocalInputValue(appointment.end),
          reason: appointment.reason ?? '',
          notes: appointment.notes ?? '',
          status: appointment.status
        });
      });
    } else {
      const prefillPatientId = this.route.snapshot.queryParamMap.get('patientId');
      if (prefillPatientId) {
        this.form.patchValue({ patientId: prefillPatientId });
      }
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const dto: AppointmentDto = {
      doctorId: raw.doctorId,
      patientId: raw.patientId,
      start: DateTimeUtils.fromLocalInputValue(raw.start),
      end: DateTimeUtils.fromLocalInputValue(raw.end),
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
        this.router.navigate(['/calendar']);
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
}
