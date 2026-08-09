import { Component, inject, signal, WritableSignal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ClinicService } from '../core/services/clinic.service';
import { StaffService } from '../core/services/staff.service';
import { StaffMember } from '../shared/models/staff-member.model';
import { DaySchedule, WorkingHours, createDefaultWorkingHours } from '../shared/models/working-hours.model';
import { DateTimeUtils } from '../shared/utils/date-time.utils';
import { DayFormGroup, WorkingHoursEditor } from './working-hours-editor/working-hours-editor';

type ScheduleForm = FormGroup<{ days: FormArray<DayFormGroup> }>;

interface StaffScheduleEntry {
  staff: StaffMember;
  form: ScheduleForm;
  isSaving: WritableSignal<boolean>;
  justSaved: WritableSignal<boolean>;
  errorMessage: WritableSignal<string | null>;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  imports: [ReactiveFormsModule, MatExpansionModule, MatButtonModule, MatIconModule, WorkingHoursEditor]
})
export class Settings {
  private readonly fb = inject(FormBuilder);
  private readonly clinicSrv = inject(ClinicService);
  private readonly staffSrv = inject(StaffService);

  private clinicId = '';
  // The clinic hours staff schedules are validated against - the last-saved value,
  // not the unsaved draft in clinicForm, so the constraint doesn't shift until the
  // clinic hours are actually saved.
  private clinicWorkingHours: WorkingHours | null = null;

  readonly clinicName = signal('');
  readonly clinicForm = signal<ScheduleForm | null>(null);
  readonly clinicIsSaving = signal(false);
  readonly clinicJustSaved = signal(false);

  readonly entries = signal<StaffScheduleEntry[]>([]);

  constructor() {
    this.clinicSrv.getCurrentClinic().subscribe((clinic) => {
      if (!clinic) {
        return;
      }
      this.clinicId = clinic.id;
      this.clinicName.set(clinic.name);
      this.clinicWorkingHours = clinic.workingHours ?? createDefaultWorkingHours();
      this.clinicForm.set(this.buildForm(this.clinicWorkingHours));
    });

    this.staffSrv.getClinicStaff().subscribe((staff) => {
      this.entries.set(
        staff.map((member) => ({
          staff: member,
          form: this.buildForm(member.workingHours ?? createDefaultWorkingHours()),
          isSaving: signal(false),
          justSaved: signal(false),
          errorMessage: signal<string | null>(null)
        }))
      );
    });
  }

  saveClinicHours(): void {
    const form = this.clinicForm();
    if (!form) {
      return;
    }

    this.clinicIsSaving.set(true);
    this.clinicJustSaved.set(false);

    const workingHours = this.extractWorkingHours(form);
    this.clinicSrv.updateWorkingHours(this.clinicId, workingHours).subscribe({
      next: () => {
        this.clinicWorkingHours = workingHours;
        this.clinicIsSaving.set(false);
        this.clinicJustSaved.set(true);
      },
      error: () => {
        this.clinicIsSaving.set(false);
      }
    });
  }

  saveStaffHours(entry: StaffScheduleEntry): void {
    const workingHours = this.extractWorkingHours(entry.form);
    const validationError = this.validateAgainstClinicHours(workingHours);
    if (validationError) {
      entry.errorMessage.set(validationError);
      return;
    }

    entry.errorMessage.set(null);
    entry.isSaving.set(true);
    entry.justSaved.set(false);

    this.staffSrv.updateWorkingHours(entry.staff.id, workingHours).subscribe({
      next: () => {
        entry.isSaving.set(false);
        entry.justSaved.set(true);
      },
      error: () => {
        entry.isSaving.set(false);
      }
    });
  }

  /** A staff member's hours must fit inside the clinic's own hours - they can be
   * narrower, but never open earlier, later, or on a day the clinic is closed. */
  private validateAgainstClinicHours(workingHours: WorkingHours): string | null {
    if (!this.clinicWorkingHours) {
      return null;
    }

    const clinicByDay = new Map(this.clinicWorkingHours.map((day) => [day.day, day]));

    for (const day of workingHours) {
      if (!day.enabled) {
        continue;
      }
      const clinicDay = clinicByDay.get(day.day);
      if (!clinicDay?.enabled) {
        return `The clinic is closed on ${day.day}s - disable this day or update the clinic hours first.`;
      }
      if (day.start < clinicDay.start || day.end > clinicDay.end) {
        return `${day.day} hours must fall within the clinic's hours (${clinicDay.start}–${clinicDay.end}).`;
      }
    }

    return null;
  }

  private extractWorkingHours(form: ScheduleForm): WorkingHours {
    return form.controls.days.controls.map((group) => {
      const raw = group.getRawValue();
      return {
        day: raw.day,
        enabled: raw.enabled,
        start: DateTimeUtils.dateToTimeString(raw.start),
        end: DateTimeUtils.dateToTimeString(raw.end)
      } satisfies DaySchedule;
    });
  }

  private buildForm(workingHours: WorkingHours): ScheduleForm {
    return this.fb.nonNullable.group({
      days: this.fb.array(workingHours.map((day) => this.buildDayGroup(day)))
    });
  }

  private buildDayGroup(day: DaySchedule): DayFormGroup {
    const group = this.fb.nonNullable.group({
      day: day.day,
      enabled: day.enabled,
      start: { value: DateTimeUtils.timeStringToDate(day.start), disabled: !day.enabled },
      end: { value: DateTimeUtils.timeStringToDate(day.end), disabled: !day.enabled }
    });

    // Keep the time controls' enabled/disabled state in the form model rather than
    // toggling a template [disabled] attribute, which Angular forms flags as unsafe.
    group.controls.enabled.valueChanges.subscribe((enabled) => {
      if (enabled) {
        group.controls.start.enable();
        group.controls.end.enable();
      } else {
        group.controls.start.disable();
        group.controls.end.disable();
      }
    });

    return group;
  }
}
