import { Component, Injectable, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  CalendarAngularDateFormatter,
  CalendarDateFormatter,
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
  DateFormatterParams,
  provideCalendar
} from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { DatePipe, formatDate } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
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
import { formDialogConfig } from '../shared/utils/dialog.utils';
import { LayoutService } from '../core/services/layout.service';

interface AppointmentEventMeta {
  appointmentId: string;
}

type CalendarPageView = CalendarView | 'list';

interface AppointmentListGroup {
  dateLabel: string;
  dateParam: string;
  items: Appointment[];
}

// Overrides the hour gutter labels in the week/day views to 24h ("14:00" instead of "2 PM").
@Injectable()
class TwentyFourHourDateFormatter extends CalendarAngularDateFormatter {
  override weekViewHour({ date, locale }: DateFormatterParams): string {
    return formatDate(date, 'HH:mm', locale ?? 'en-US');
  }

  override dayViewHour({ date, locale }: DateFormatterParams): string {
    return formatDate(date, 'HH:mm', locale ?? 'en-US');
  }
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
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatCardModule,
    MatListModule,
    MatDividerModule,
    DatePipe
  ],
  providers: [
    provideCalendar({
      provide: DateAdapter,
      useFactory: adapterFactory
    }),
    { provide: CalendarDateFormatter, useClass: TwentyFourHourDateFormatter }
  ]
})
export class Calendar {
  private readonly appointmentSrv = inject(AppointmentService);
  private readonly staffSrv = inject(StaffService);
  private readonly patientSrv = inject(PatientService);
  private readonly dialog = inject(MatDialog);
  readonly layout = inject(LayoutService);

  readonly CalendarView = CalendarView;
  readonly statusOptions = [
    AppointmentStatus.Scheduled,
    AppointmentStatus.Unconfirmed,
    AppointmentStatus.Completed,
    AppointmentStatus.NoShow,
    AppointmentStatus.Cancelled
  ];

  view: CalendarPageView = 'list';
  viewDate: Date = new Date();
  selectedDoctorId: string | null = null;
  selectedDate: Date | null = null;
  selectedStatuses: AppointmentStatus[] = [];

  // Signals rather than plain fields: the app is zoneless, so data arriving from the API
  // only re-renders the view (including the getters below that read these) via signals.
  readonly doctors = signal<StaffMember[]>([]);
  private readonly appointments = signal<Appointment[]>([]);
  private readonly patients = signal<Patient[]>([]);

  constructor() {
    this.staffSrv.getDoctors().subscribe((doctors) => this.doctors.set(doctors));
    this.loadPatients();
    this.loadAppointments();
  }

  get todaysAppointmentsCount(): number {
    const today = new Date().toDateString();
    return this.appointments().filter(
      (appt) => appt.status !== AppointmentStatus.Cancelled && new Date(appt.start).toDateString() === today
    ).length;
  }

  /** Upcoming appointments still waiting for a call to confirm them with the patient. */
  get toConfirmCount(): number {
    const now = Date.now();
    return this.appointments().filter(
      (appt) => appt.status === AppointmentStatus.Unconfirmed && new Date(appt.start).getTime() > now
    ).length;
  }

  /** The list view, filtered down to the unconfirmed appointments - the call list. */
  showUnconfirmed(): void {
    this.view = 'list';
    this.selectedDoctorId = null;
    this.selectedDate = null;
    this.selectedStatuses = [AppointmentStatus.Unconfirmed];
  }

  get totalPatientsCount(): number {
    return this.patients().length;
  }

  get events(): CalendarEvent<AppointmentEventMeta>[] {
    const doctorsById = new Map(this.doctors().map((d) => [d.id, d]));
    const patientsById = new Map(this.patients().map((p) => [p.id, p]));

    return this.appointments()
      .filter((appt) => this.matchesFilters(appt))
      .map((appt) => this.toCalendarEvent(appt, doctorsById, patientsById));
  }

  get listAppointments(): AppointmentListGroup[] {
    const filtered = this.appointments()
      // Cancelled appointments stay hidden by default, unless the user explicitly
      // filters for them via the status filter.
      .filter((appt) => this.selectedStatuses.length > 0 || appt.status !== AppointmentStatus.Cancelled)
      .filter((appt) => this.matchesFilters(appt))
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

  private matchesFilters(appt: Appointment): boolean {
    if (this.selectedDoctorId && appt.doctorId !== this.selectedDoctorId) {
      return false;
    }
    if (this.selectedDate && new Date(appt.start).toDateString() !== this.selectedDate.toDateString()) {
      return false;
    }
    if (this.selectedStatuses.length > 0 && !this.selectedStatuses.includes(appt.status)) {
      return false;
    }
    return true;
  }

  doctorName(doctorId: string): string {
    const doctor = this.doctors().find((d) => d.id === doctorId);
    return doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unknown doctor';
  }

  patientName(patientId: string): string {
    const patient = this.patients().find((p) => p.id === patientId);
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
    const dialogRef = this.dialog.open(AppointmentForm, formDialogConfig(data));

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        // Reload patients too - the dialog may have created a new patient inline,
        // and without it here the new appointment would render as "Unknown patient".
        this.loadPatients();
        this.loadAppointments();
      }
    });
  }

  private loadPatients(): void {
    this.patientSrv.getPatients().subscribe((patients) => this.patients.set(patients));
  }

  private loadAppointments(): void {
    this.appointmentSrv.getAppointments().subscribe((appointments) => this.appointments.set(appointments));
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
    const isUnconfirmed = appointment.status === AppointmentStatus.Unconfirmed;

    return {
      id: appointment.id,
      start: new Date(appointment.start),
      end: new Date(appointment.end),
      title: `${isUnconfirmed ? '(Unconfirmed) ' : ''}${patientName}${doctorName ? ' · ' + doctorName : ''}${appointment.reason ? ' — ' + appointment.reason : ''}`,
      color: { primary: color, secondary: color + '22' },
      cssClass:
        appointment.status === AppointmentStatus.Cancelled ? 'appt-cancelled' : isUnconfirmed ? 'appt-unconfirmed' : '',
      meta: { appointmentId: appointment.id }
    };
  }
}
