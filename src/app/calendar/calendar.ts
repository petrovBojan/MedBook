import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  CalendarDatePipe,
  CalendarDayViewComponent,
  CalendarEvent,
  CalendarMonthViewComponent,
  CalendarNextViewDirective,
  CalendarPreviousViewDirective,
  CalendarTodayDirective,
  CalendarView,
  CalendarWeekViewComponent,
  DateAdapter,
  provideCalendar
} from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../core/services/appointment.service';
import { StaffService } from '../core/services/staff.service';
import { PatientService } from '../core/services/patient.service';
import { Appointment, AppointmentStatus } from '../shared/models/appointment.model';
import { StaffMember } from '../shared/models/staff-member.model';
import { Patient } from '../shared/models/patient.model';

interface AppointmentEventMeta {
  appointmentId: string;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
  imports: [
    FormsModule,
    CalendarPreviousViewDirective,
    CalendarTodayDirective,
    CalendarNextViewDirective,
    CalendarMonthViewComponent,
    CalendarWeekViewComponent,
    CalendarDayViewComponent,
    CalendarDatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  providers: [
    provideCalendar({
      provide: DateAdapter,
      useFactory: adapterFactory
    })
  ]
})
export class Calendar {
  private readonly appointmentSrv = inject(AppointmentService);
  private readonly staffSrv = inject(StaffService);
  private readonly patientSrv = inject(PatientService);
  private readonly router = inject(Router);

  readonly CalendarView = CalendarView;
  view: CalendarView = CalendarView.Week;
  viewDate: Date = new Date();
  selectedDoctorId: string | null = null;

  doctors: StaffMember[] = [];
  private appointments: Appointment[] = [];
  private patients: Patient[] = [];

  constructor() {
    this.staffSrv.getDoctors().subscribe((doctors) => (this.doctors = doctors));
    this.patientSrv.getPatients().subscribe((patients) => (this.patients = patients));
    this.appointmentSrv.getAppointments().subscribe((appointments) => (this.appointments = appointments));
  }

  get events(): CalendarEvent<AppointmentEventMeta>[] {
    const doctorsById = new Map(this.doctors.map((d) => [d.id, d]));
    const patientsById = new Map(this.patients.map((p) => [p.id, p]));

    return this.appointments
      .filter((appt) => !this.selectedDoctorId || appt.doctorId === this.selectedDoctorId)
      .map((appt) => this.toCalendarEvent(appt, doctorsById, patientsById));
  }

  setView(view: CalendarView): void {
    this.view = view;
  }

  onDayClicked(day: { date: Date }): void {
    this.viewDate = day.date;
    this.view = CalendarView.Day;
  }

  onEventClicked({ event }: { event: CalendarEvent<AppointmentEventMeta> }): void {
    if (event.meta) {
      this.router.navigate(['/appointments', event.meta.appointmentId, 'edit']);
    }
  }

  createAppointment(): void {
    this.router.navigate(['/appointments/new']);
  }

  private toCalendarEvent(
    appointment: Appointment,
    doctorsById: Map<string, StaffMember>,
    patientsById: Map<string, Patient>
  ): CalendarEvent<AppointmentEventMeta> {
    const doctor = doctorsById.get(appointment.doctorId);
    const patient = patientsById.get(appointment.patientId);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown patient';
    const doctorName = doctor ? `Dr. ${doctor.lastName}` : '';
    const color = doctor?.color ?? '#607d8b';

    return {
      id: appointment.id,
      start: new Date(appointment.start),
      end: new Date(appointment.end),
      title: `${patientName}${doctorName ? ' · ' + doctorName : ''}${appointment.reason ? ' — ' + appointment.reason : ''}`,
      color: { primary: color, secondary: color + '22' },
      cssClass: appointment.status === AppointmentStatus.Cancelled ? 'appt-cancelled' : '',
      meta: { appointmentId: appointment.id }
    };
  }
}
