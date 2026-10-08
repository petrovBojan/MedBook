import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, debounceTime, merge, of, switchMap } from 'rxjs';
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
import { LayoutService } from '../../core/services/layout.service';
import { formDialogConfig } from '../../shared/utils/dialog.utils';
import { ClinicService } from '../../core/services/clinic.service';
import { DaySchedule, WorkingHours } from '../../shared/models/working-hours.model';
import { SLOT_MINUTES, atTime, firstAvailableStart, openHoursOn, weekdayOf } from '../../shared/utils/clinic-hours.utils';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/** At most this many patients are listed while searching - the clinic's list can be long. */
const MAX_PATIENT_MATCHES = 50;

/** The patient search box is only valid once a patient has been picked from the suggestions. */
function patientPicked(control: AbstractControl): ValidationErrors | null {
  return control.value && typeof control.value === 'object' ? null : { patientNotPicked: true };
}

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
    MatDialogModule,
    MatAutocompleteModule,
    MatIconModule,
    AppDatePipe,
    TranslocoDirective
  ]
})
export class AppointmentForm {
  private readonly fb = inject(FormBuilder);
  private readonly appointmentSrv = inject(AppointmentService);
  private readonly staffSrv = inject(StaffService);
  private readonly patientSrv = inject(PatientService);
  private readonly clinicSrv = inject(ClinicService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<AppointmentForm, boolean>);
  private readonly data = inject<AppointmentFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  private readonly transloco = inject(TranslocoService);
  readonly layout = inject(LayoutService);

  readonly AppointmentStatus = AppointmentStatus;
  readonly appointmentId = this.data.appointmentId;
  readonly isEditMode = !!this.appointmentId;
  // A new booking is either confirmed or still to be confirmed with the patient; the
  // outcome statuses only make sense for an appointment that already exists.
  readonly statusOptions = this.isEditMode
    ? [
        AppointmentStatus.Scheduled,
        AppointmentStatus.Unconfirmed,
        AppointmentStatus.Completed,
        AppointmentStatus.Cancelled,
        AppointmentStatus.NoShow
      ]
    : [AppointmentStatus.Scheduled, AppointmentStatus.Unconfirmed];

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly scheduleWarning = signal<string | null>(null);
  readonly doctors = signal<StaffMember[]>([]);
  readonly patients = signal<Patient[]>([]);

  // The patient is picked by searching (name, phone or email) rather than from one long
  // dropdown. The search box holds the typed text, or the Patient once one is picked;
  // picking one fills in the form's patientId.
  readonly patientSearch = new FormControl<string | Patient>('', { nonNullable: true, validators: patientPicked });
  private readonly patientSearchValue = toSignal(this.patientSearch.valueChanges, { initialValue: '' });
  readonly patientMatches = computed(() => {
    const value = this.patientSearchValue();
    const terms = (typeof value === 'string' ? value : '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = this.patients()
      .filter((patient) => {
        const haystack = [patient.firstName, patient.lastName, patient.phone, patient.email].join(' ').toLowerCase();
        return terms.every((term) => haystack.includes(term));
      })
      .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
    return { patients: matches.slice(0, MAX_PATIENT_MATCHES), more: matches.length > MAX_PATIENT_MATCHES };
  });
  readonly patientLabel = (value: string | Patient | null): string =>
    value && typeof value === 'object' ? `${value.firstName} ${value.lastName}` : (value ?? '');

  private readonly scheduleChecks = new Subject<void>();

  // The clinic's opening days and hours bound the date and time pickers. Until they've
  // loaded (or if the clinic has none set) the pickers are unrestricted - the API applies
  // the same rules on save either way.
  private readonly clinicHours = signal<WorkingHours | null>(null);
  // The selected start day, tracked separately because prefilling the form for an edit
  // patches it without emitting value changes.
  private readonly startDay = signal(new Date());
  readonly openHours = computed(() => {
    const hours = this.clinicHours();
    return hours ? openHoursOn(hours, this.startDay()) : undefined;
  });

  /** Time picker limits: a start leaves room for one slot before closing; an end is at least one slot after opening. */
  readonly startTimeMin = computed(() => this.limit((open) => open.start));
  readonly startTimeMax = computed(() => this.limit((open) => open.end, -SLOT_MINUTES));
  readonly endTimeMin = computed(() => this.limit((open) => open.start, SLOT_MINUTES));
  readonly endTimeMax = computed(() => this.limit((open) => open.end));

  /** For the "Open 09:00–17:00 on Mondays." error shown when a picked time is outside opening hours. */
  readonly startWeekday = computed(() => weekdayOf(this.startDay()));

  /** Greys out the days the clinic is closed in the date pickers (and flags them if typed in). */
  readonly isOpenDay = (date: Date | null): boolean => {
    const hours = this.clinicHours();
    return !date || !hours || !!openHoursOn(hours, date);
  };

  /** For the "The clinic is closed on Sundays." error on a date picker. */
  readonly weekdayOf = weekdayOf;

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
    this.patientSearch.valueChanges.subscribe((value) =>
      this.form.controls.patientId.setValue(typeof value === 'object' ? value.id : '')
    );
    this.patientSrv.getPatients().subscribe((patients) => {
      this.patients.set(patients);
      this.showPatient(this.form.controls.patientId.value);
    });
    this.clinicSrv.getCurrentClinic().subscribe((clinic) => {
      if (!clinic?.workingHours?.length) {
        return;
      }
      this.clinicHours.set(clinic.workingHours);
      this.applyDefaultStart(clinic.workingHours);
    });

    if (this.appointmentId) {
      this.appointmentSrv.getAppointment(this.appointmentId).subscribe((appointment) => {
        if (!appointment) {
          this.errorMessage.set(this.transloco.translate('appointmentForm.notFound'));
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
        this.startDay.set(start);
        this.showPatient(appointment.patientId);
        this.scheduleChecks.next();
      });
    } else {
      if (this.data.patientId) {
        this.form.patchValue({ patientId: this.data.patientId });
        this.showPatient(this.data.patientId);
      }

      if (this.data.date) {
        const start = new Date(`${this.data.date}T09:00`);
        const end = addMinutes(start, 30);
        this.form.patchValue({ startDate: start, startTime: start, endDate: end, endTime: end }, { emitEvent: false });
        this.startDay.set(start);
      }
    }

    // Whenever the start date or time changes, push the end date/time to 30 minutes
    // later - a reasonable default duration the user can still override afterwards -
    // but never past closing time.
    merge(this.form.controls.startDate.valueChanges, this.form.controls.startTime.valueChanges).subscribe(() => {
      const start = DateTimeUtils.combineDateAndTime(
        this.form.controls.startDate.value,
        this.form.controls.startTime.value
      );
      this.startDay.set(start);
      const open = this.openHours();
      const closing = open ? atTime(start, open.end) : null;
      const defaultEnd = addMinutes(start, 30);
      const end = closing && defaultEnd > closing && closing > start ? closing : defaultEnd;
      this.form.patchValue({ endDate: end, endTime: end });
    });

    // Surface working-hours/double-booking conflicts live as the doctor or date/time
    // fields change, rather than only after the user hits submit. Debounced because
    // changing the start also moves the end (several changes in a row), and switchMap
    // drops responses for a slot the user has already moved away from.
    this.scheduleChecks
      .pipe(
        debounceTime(250),
        switchMap(() => this.checkSchedule()),
        takeUntilDestroyed()
      )
      .subscribe((warning) => this.scheduleWarning.set(warning));

    merge(
      this.form.controls.doctorId.valueChanges,
      this.form.controls.startDate.valueChanges,
      this.form.controls.startTime.valueChanges,
      this.form.controls.endDate.valueChanges,
      this.form.controls.endTime.valueChanges
    ).subscribe(() => this.scheduleChecks.next());
    this.scheduleChecks.next();
  }

  /**
   * A new appointment starts at the first bookable slot: now (or the requested day), moved
   * into opening hours. Left alone when editing, or once the user has picked a time.
   */
  private applyDefaultStart(hours: WorkingHours): void {
    const { startDate, startTime } = this.form.controls;
    if (this.isEditMode || startDate.dirty || startTime.dirty) {
      return;
    }

    const from = this.data.date ? new Date(`${this.data.date}T00:00`) : new Date();
    const start = firstAvailableStart(hours, from);
    // Emits, so the end follows 30 minutes later as usual.
    this.form.patchValue({ startDate: start, startTime: start });
  }

  /** A time picker limit on the selected start day, `offsetMinutes` from an opening-hours time; null when there are no hours to go by. */
  private limit(pick: (open: DaySchedule) => string, offsetMinutes = 0): Date | null {
    const open = this.openHours();
    return open ? addMinutes(atTime(this.startDay(), pick(open)), offsetMinutes) : null;
  }

  private checkSchedule(): Observable<string | null> {
    const raw = this.form.getRawValue();
    if (!raw.doctorId) {
      return of(null);
    }

    const start = DateTimeUtils.combineDateAndTime(raw.startDate, raw.startTime);
    const end = DateTimeUtils.combineDateAndTime(raw.endDate, raw.endTime);

    // If the check itself fails (e.g. network), don't block booking over it - the API
    // re-runs the same rules on submit and will report any conflict then.
    return this.appointmentSrv
      .checkAvailability(
        { doctorId: raw.doctorId, start: start.toISOString(), end: end.toISOString(), status: raw.status },
        this.appointmentId
      )
      .pipe(catchError(() => of(null)));
  }

  submit(): void {
    // Cancelling is allowed even if the slot no longer fits the opening hours (say they've
    // changed since it was booked) - the API skips the schedule check for it too.
    const isCancelling = this.form.controls.status.value === AppointmentStatus.Cancelled;
    if (this.form.invalid && !isCancelling) {
      this.form.markAllAsTouched();
      this.patientSearch.markAsTouched();
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
        title: this.transloco.translate('appointmentForm.cancelAppointment'),
        message: this.transloco.translate('appointmentForm.cancelConfirm'),
        confirmLabel: this.transloco.translate('appointmentForm.cancelAppointment')
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
    const dialogRef = this.dialog.open<PatientForm, unknown, Patient | undefined>(PatientForm, formDialogConfig());

    dialogRef.afterClosed().subscribe((patient) => {
      if (!patient) {
        return;
      }
      this.patients.update((patients) => [...patients, patient]);
      this.patientSearch.setValue(patient);
    });
  }

  /** Shows an already chosen patient (editing, booking from a patient's page) in the search box, once the list has loaded. */
  private showPatient(patientId: string): void {
    const patient = patientId ? this.patients().find((p) => p.id === patientId) : undefined;
    if (patient) {
      this.patientSearch.setValue(patient);
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
