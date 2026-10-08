import { Component, Injectable, computed, inject, signal } from '@angular/core';
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
import { addDays, startOfDay } from 'date-fns';
import { formatDate } from '@angular/common';
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
import { StaffMember, StaffRole } from '../shared/models/staff-member.model';
import { Patient } from '../shared/models/patient.model';
import { AppointmentForm, AppointmentFormDialogData } from '../appointments/appointment-form/appointment-form';
import { DateTimeUtils } from '../shared/utils/date-time.utils';
import { formDialogConfig } from '../shared/utils/dialog.utils';
import { LayoutService } from '../core/services/layout.service';
import { AuthService } from '../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../core/services/language.service';
import { AppDatePipe } from '../shared/pipes/app-date.pipe';

interface AppointmentEventMeta {
  appointmentId: string;
}

type CalendarPageView = CalendarView | 'list';

interface AppointmentListGroup {
  dateLabel: string;
  dateParam: string;
  items: Appointment[];
}

interface AppointmentList {
  groups: AppointmentListGroup[];
  /** Matching appointments exist before the shown days ("Previous"). */
  hasEarlier: boolean;
  /** Matching appointments exist after the shown days ("Show more"). */
  hasLater: boolean;
}

/** The list starts with today plus this many days after it; "Show more" adds this many days that have appointments. */
const LIST_DAYS_AHEAD = 2;
const LIST_MORE_DAYS = 3;

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
    AppDatePipe,
    RouterLink,
    TranslocoDirective
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
  private readonly authSrv = inject(AuthService);
  private readonly transloco = inject(TranslocoService);
  readonly layout = inject(LayoutService);
  readonly language = inject(LanguageService);

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

  // The days the list view shows: [listFrom, listUntil). Starts as today and the next two
  // days; "Previous" and "Show more" widen it. Ignored when a single day is picked in the
  // Day filter.
  private listFrom = startOfDay(new Date());
  private listUntil = addDays(this.listFrom, LIST_DAYS_AHEAD + 1);

  // Signals rather than plain fields: the app is zoneless, so data arriving from the API
  // only re-renders the view (including the getters below that read these) via signals.
  // Everyone who is or was on staff, so past appointments of removed doctors keep their
  // name; the doctor filter and count only use current doctors.
  private readonly staff = signal<StaffMember[]>([]);
  readonly doctors = computed(() => this.staff().filter((s) => s.role === StaffRole.Doctor && !s.removedAt));
  private readonly appointments = signal<Appointment[]>([]);
  private readonly patients = signal<Patient[]>([]);

  constructor() {
    this.staffSrv.getClinicStaff().subscribe((staff) => this.staff.set(staff));
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

  /**
   * Where the "Doctors" tile leads: the Team page for clinic admins, otherwise Settings
   * (everyone's working hours) - only admins can open Team.
   */
  readonly doctorsLink = this.authSrv.getCurrentUser()?.isClinicAdmin ? '/team' : '/settings';

  /** Today's appointments: the day view on today, with no filters hiding any of them. */
  showToday(): void {
    this.view = CalendarView.Day;
    this.viewDate = new Date();
    this.selectedDoctorId = null;
    this.selectedDate = null;
    this.selectedStatuses = [];
  }

  /** The list view, filtered down to the unconfirmed appointments - the call list. */
  showUnconfirmed(): void {
    this.view = 'list';
    this.selectedDoctorId = null;
    this.selectedDate = null;
    this.selectedStatuses = [AppointmentStatus.Unconfirmed];
    this.resetListWindow();
  }

  get totalPatientsCount(): number {
    return this.patients().length;
  }

  get events(): CalendarEvent<AppointmentEventMeta>[] {
    const doctorsById = new Map(this.staff().map((s) => [s.id, s]));
    const patientsById = new Map(this.patients().map((p) => [p.id, p]));

    return this.appointments()
      .filter((appt) => this.matchesFilters(appt))
      .map((appt) => this.toCalendarEvent(appt, doctorsById, patientsById));
  }

  get appointmentList(): AppointmentList {
    const filtered = this.listCandidates();
    // A day picked in the filter shows just that day, whatever the window.
    if (this.selectedDate) {
      return { groups: this.groupByDay(filtered), hasEarlier: false, hasLater: false };
    }

    const from = this.listFrom.getTime();
    const until = this.listUntil.getTime();
    const startOf = (appt: Appointment) => new Date(appt.start).getTime();
    return {
      groups: this.groupByDay(filtered.filter((appt) => startOf(appt) >= from && startOf(appt) < until)),
      hasEarlier: filtered.some((appt) => startOf(appt) < from),
      hasLater: filtered.some((appt) => startOf(appt) >= until)
    };
  }

  /** Adds the next few days that have appointments to the end of the list (empty days in between are skipped). */
  showMoreDays(): void {
    const laterDays = this.daysWithAppointments().filter((day) => day >= this.listUntil.getTime());
    const lastDay = laterDays[Math.min(LIST_MORE_DAYS, laterDays.length) - 1];
    if (lastDay !== undefined) {
      this.listUntil = addDays(new Date(lastDay), 1);
    }
  }

  /** Adds the closest earlier day that has appointments to the top of the list, one day per click. */
  showPreviousDay(): void {
    const earlierDays = this.daysWithAppointments().filter((day) => day < this.listFrom.getTime());
    const previousDay = earlierDays.at(-1);
    if (previousDay !== undefined) {
      this.listFrom = new Date(previousDay);
    }
  }

  private resetListWindow(): void {
    this.listFrom = startOfDay(new Date());
    this.listUntil = addDays(this.listFrom, LIST_DAYS_AHEAD + 1);
  }

  /** The appointments the list could show with the current filters, oldest first. */
  private listCandidates(): Appointment[] {
    return (
      this.appointments()
        // Cancelled appointments stay hidden by default, unless the user explicitly
        // filters for them via the status filter.
        .filter((appt) => this.selectedStatuses.length > 0 || appt.status !== AppointmentStatus.Cancelled)
        .filter((appt) => this.matchesFilters(appt))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    );
  }

  /** Start-of-day timestamps of the days with matching appointments, ascending and distinct. */
  private daysWithAppointments(): number[] {
    const days = this.listCandidates().map((appt) => startOfDay(new Date(appt.start)).getTime());
    return [...new Set(days)];
  }

  private groupByDay(appointments: Appointment[]): AppointmentListGroup[] {
    const groups = new Map<string, Appointment[]>();
    for (const appt of appointments) {
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
        dateLabel: date.toLocaleDateString(this.language.locale(), {
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
    const doctor = this.staff().find((s) => s.id === doctorId);
    return doctor
      ? this.transloco.translate('common.doctorName', {
          name: `${doctor.firstName} ${doctor.lastName}`
        })
      : this.transloco.translate('common.unknownDoctor');
  }

  patientName(patientId: string): string {
    const patient = this.patients().find((p) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : this.transloco.translate('common.unknownPatient');
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
    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : this.transloco.translate('common.unknownPatient');
    const doctorName = doctor ? this.transloco.translate('common.doctorName', { name: doctor.lastName }) : '';
    const color = doctor?.color ?? '#607d8b';
    const isUnconfirmed = appointment.status === AppointmentStatus.Unconfirmed;
    const unconfirmedPrefix = isUnconfirmed ? this.transloco.translate('calendar.unconfirmedPrefix') + ' ' : '';

    return {
      id: appointment.id,
      start: new Date(appointment.start),
      end: new Date(appointment.end),
      title: `${unconfirmedPrefix}${patientName}${doctorName ? ' · ' + doctorName : ''}${appointment.reason ? ' — ' + appointment.reason : ''}`,
      color: { primary: color, secondary: color + '22' },
      cssClass:
        appointment.status === AppointmentStatus.Cancelled ? 'appt-cancelled' : isUnconfirmed ? 'appt-unconfirmed' : '',
      meta: { appointmentId: appointment.id }
    };
  }
}
