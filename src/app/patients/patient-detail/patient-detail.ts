import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { PatientService } from '../../core/services/patient.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { StaffService } from '../../core/services/staff.service';
import { Patient } from '../../shared/models/patient.model';
import { Appointment } from '../../shared/models/appointment.model';
import { StaffMember } from '../../shared/models/staff-member.model';

@Component({
  selector: 'app-patient-detail',
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css',
  imports: [RouterLink, DatePipe, MatCardModule, MatButtonModule, MatListModule, MatChipsModule]
})
export class PatientDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly patientSrv = inject(PatientService);
  private readonly appointmentSrv = inject(AppointmentService);
  private readonly staffSrv = inject(StaffService);

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
    this.patientSrv.getPatient(this.patientId).subscribe((patient) => this.patient.set(patient));
    this.appointmentSrv.getAppointments().subscribe((appointments) => this.appointments.set(appointments));
    this.staffSrv.getClinicStaff().subscribe((staff) => this.doctorsById.set(new Map(staff.map((s) => [s.id, s]))));
  }

  doctorName(doctorId: string): string {
    const doctor = this.doctorsById().get(doctorId);
    return doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unknown doctor';
  }
}
