import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
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
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../core/services/appointment.service';
import { StaffService } from '../core/services/staff.service';
import { PatientService } from '../core/services/patient.service';
import { Appointment, AppointmentStatus } from '../shared/models/appointment.model';
import { StaffMember } from '../shared/models/staff-member.model';
import { Patient } from '../shared/models/patient.model';
import { AppointmentForm, AppointmentFormDialogData } from '../appointments/appointment-form/appointment-form';
import { DateTimeUtils } from '../shared/utils/date-time.utils';

interface AppointmentEventMeta {
  appointmentId: string;
}

type CalendarPageView = CalendarView | 'list';

interface AppointmentListGroup {
  dateLabel: string;
  dateParam: string;
  items: Appointment[];
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
    MatSelectModule,
    MatCardModule,
    MatListModule,
    MatDividerModule,
    DatePipe
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
  private readonly dialog = inject(MatDialog);

  readonly CalendarView = CalendarView;
  view: CalendarPageView = 'list';
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

  get todaysAppointmentsCount(): number {
    const today = new Date().toDateString();
    return this.appointments.filter(
      (appt) => appt.status !== AppointmentStatus.Cancelled && new Date(appt.start).toDateString() === today
    ).length;
  }

  get totalPatientsCount(): number {
    return this.patients.length;
  }

  get events(): CalendarEvent<AppointmentEventMeta>[] {
    const doctorsById = new Map(this.doctors.map((d) => [d.id, d]));
    const patientsById = new Map(this.patients.map((p) => [p.id, p]));

    return this.appointments
      .filter((appt) => !this.selectedDoctorId || appt.doctorId === this.selectedDoctorId)
      .map((appt) => this.toCalendarEvent(appt, doctorsById, patientsById));
  }

  get listAppointments(): AppointmentListGroup[] {
    const filtered = this.appointments
      .filter((appt) => appt.status !== AppointmentStatus.Cancelled)
      .filter((appt) => !this.selectedDoctorId || appt.doctorId === this.selectedDoctorId)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const groups = new Map<string, Appointment[]>();
    for (const appt of filtered) {
      const key = new Date(appt.start).toDateString();
      const group = groups.get(key);
      if (group) {
        group.push(appt);
      } else {
        groups.set(key, [appt]);
      }
    }

    return Array.from(groups.entries()).map(([key, items]) => {
      const date = new Date(key);
      return {
        dateLabel: date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        dateParam: DateTimeUtils.toLocalDateString(date),
        items
      };
    });
  }

  doctorName(doctorId: string): string {
    const doctor = this.doctors.find((d) => d.id === doctorId);
    return doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unknown doctor';
  }

  patientName(patientId: string): string {
    const patient = this.patients.find((p) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown patient';
  }

  setView(view: CalendarPageView): void {
    this.view = view;
  }

  onDayClicked(day: { date: Date }): void {
    this.viewDate = day.date;
    this.view = CalendarView.Day;
  }

  onEventClicked({ event }: { event: CalendarEvent<AppointmentEventMeta> }): void {
    if (event.meta) {
      this.goToAppointment(event.meta.appointmentId);
    }
  }

  goToAppointment(appointmentId: string): void {
    this.openAppointmentDialog({ appointmentId });
  }

  createAppointment(): void {
    this.openAppointmentDialog();
  }

  createAppointmentForDate(dateParam: string): void {
    this.openAppointmentDialog({ date: dateParam });
  }

  private openAppointmentDialog(data: AppointmentFormDialogData = {}): void {
    const dialogRef = this.dialog.open(AppointmentForm, {
      width: '640px',
      maxWidth: '95vw',
      autoFocus: false,
      data
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.appointmentSrv.getAppointments().subscribe((appointments) => (this.appointments = appointments));
      }
    });
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
