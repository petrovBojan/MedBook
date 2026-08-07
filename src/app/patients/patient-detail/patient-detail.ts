import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { PatientService } from '../../core/services/patient.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { StaffService } from '../../core/services/staff.service';
import { Patient } from '../../shared/models/patient.model';
import { Appointment } from '../../shared/models/appointment.model';
import { StaffMember } from '../../shared/models/staff-member.model';
import { PatientForm } from '../patient-form/patient-form';
import { AppointmentForm, AppointmentFormDialogData } from '../../appointments/appointment-form/appointment-form';

@Component({
  selector: 'app-patient-detail',
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css',
  imports: [DatePipe, MatCardModule, MatButtonModule, MatListModule, MatChipsModule]
})
export class PatientDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly patientSrv = inject(PatientService);
  private readonly appointmentSrv = inject(AppointmentService);
  private readonly staffSrv = inject(StaffService);
  private readonly dialog = inject(MatDialog);

  private readonly patientId = this.route.snapshot.paramMap.get('id')!;

  readonly patient = signal<Patient | undefined>(undefined);
  private readonly appointments = signal<Appointment[]>([]);
  private readonly doctorsById = signal<Map<string, StaffMember>>(new Map());

  readonly appointmentsForPatient = computed(() =>
    this.appointments()
      .filter((a) => a.patientId === this.patientId)
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
  );

  constructor() {
    this.loadPatient();
    this.loadAppointments();
    this.staffSrv.getClinicStaff().subscribe((staff) => this.doctorsById.set(new Map(staff.map((s) => [s.id, s]))));
  }

  doctorName(doctorId: string): string {
    const doctor = this.doctorsById().get(doctorId);
    return doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unknown doctor';
  }

  editPatient(): void {
    const dialogRef = this.dialog.open<PatientForm, unknown, Patient | undefined>(PatientForm, {
      width: '640px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { patientId: this.patientId }
    });

    dialogRef.afterClosed().subscribe((patient) => {
      if (patient) {
        this.patient.set(patient);
      }
    });
  }

  bookAppointment(): void {
    this.openAppointmentDialog({ patientId: this.patientId });
  }

  openAppointment(appointmentId: string): void {
    this.openAppointmentDialog({ appointmentId });
  }

  private openAppointmentDialog(data: AppointmentFormDialogData): void {
    const dialogRef = this.dialog.open(AppointmentForm, {
      width: '640px',
      maxWidth: '95vw',
      autoFocus: false,
      data
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadAppointments();
      }
    });
  }

  private loadPatient(): void {
    this.patientSrv.getPatient(this.patientId).subscribe((patient) => this.patient.set(patient));
  }

  private loadAppointments(): void {
    this.appointmentSrv.getAppointments().subscribe((appointments) => this.appointments.set(appointments));
  }
}
