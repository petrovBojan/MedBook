import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { startWith } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ClinicService } from '../../core/services/clinic.service';
import { ReminderChannel, ReminderSettings as ReminderSettingsModel } from '../../shared/models/clinic.model';

/** The "how long before" choices offered; a saved value outside this list is added to it. */
const HOURS_BEFORE_OPTIONS = [1, 2, 3, 6, 12, 24, 48, 72, 168];

/**
 * The Settings page's "Patient reminders" section: whether patients get a reminder before
 * their appointments, by email or SMS, how long before, and in which language. Clinic admins
 * can change it and send themselves a test; everyone else sees it read-only.
 */
@Component({
  selector: 'app-reminder-settings',
  templateUrl: './reminder-settings.html',
  styleUrl: './reminder-settings.css',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslocoDirective
  ]
})
export class ReminderSettings {
  private readonly fb = inject(FormBuilder);
  private readonly clinicSrv = inject(ClinicService);
  private readonly transloco = inject(TranslocoService);

  readonly isAdmin = !!inject(AuthService).getCurrentUser()?.isClinicAdmin;

  readonly settings = signal<ReminderSettingsModel | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly isSaving = signal(false);
  readonly justSaved = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    channel: 'Off' as ReminderChannel,
    hoursBefore: 24,
    fallback: true,
    language: 'mk'
  });

  // A form group of its own: a bare <form> isn't handled by ReactiveFormsModule, so
  // submitting it would do a real browser submit and reload the page.
  readonly testForm = this.fb.nonNullable.group({ to: '' });
  readonly testTo = this.testForm.controls.to;
  readonly isTesting = signal(false);
  readonly testResult = signal<{ ok: boolean; message: string } | null>(null);

  // The form's values as signals, so the template's dependent bits re-render (zoneless).
  readonly channel = toSignal(this.form.controls.channel.valueChanges.pipe(startWith(this.form.controls.channel.value)), {
    requireSync: true
  });
  readonly language = toSignal(this.form.controls.language.valueChanges.pipe(startWith(this.form.controls.language.value)), {
    requireSync: true
  });

  readonly hoursOptions = computed(() => {
    const saved = this.settings()?.hoursBefore;
    return saved && !HOURS_BEFORE_OPTIONS.includes(saved)
      ? [...HOURS_BEFORE_OPTIONS, saved].sort((a, b) => a - b)
      : HOURS_BEFORE_OPTIONS;
  });

  /** The other channel exists on the server, so falling back to it can work. */
  readonly canFallBack = computed(() => {
    const settings = this.settings();
    const channel = this.channel();
    return (channel === 'Email' && !!settings?.smsAvailable) || (channel === 'Sms' && !!settings?.emailAvailable);
  });

  constructor() {
    if (!this.isAdmin) {
      this.form.disable();
      this.testTo.disable();
    }

    this.clinicSrv.getReminderSettings().subscribe({
      next: (settings) => this.apply(settings),
      error: (err: Error) => this.loadError.set(err.message)
    });

    this.form.valueChanges.subscribe(() => this.justSaved.set(false));
    this.form.controls.channel.valueChanges.subscribe(() => this.testResult.set(null));
  }

  hoursLabel(hours: number): string {
    if (hours % 24 === 0) {
      const days = hours / 24;
      return this.transloco.translate(days === 1 ? 'settings.reminders.oneDayBefore' : 'settings.reminders.daysBefore', {
        count: days
      });
    }
    return this.transloco.translate(hours === 1 ? 'settings.reminders.oneHourBefore' : 'settings.reminders.hoursBefore', {
      count: hours
    });
  }

  save(): void {
    this.isSaving.set(true);
    this.justSaved.set(false);
    this.errorMessage.set(null);

    this.clinicSrv.updateReminderSettings(this.form.getRawValue()).subscribe({
      next: (settings) => {
        this.apply(settings);
        this.isSaving.set(false);
        this.justSaved.set(true);
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.message);
      }
    });
  }

  sendTest(): void {
    const channel = this.channel();
    const to = this.testTo.value.trim();
    if (channel === 'Off' || !to) {
      return;
    }

    this.isTesting.set(true);
    this.testResult.set(null);

    this.clinicSrv.sendTestReminder(channel, to, this.form.controls.language.value).subscribe({
      next: () => {
        this.isTesting.set(false);
        this.testResult.set({ ok: true, message: this.transloco.translate('settings.reminders.testSent', { to }) });
      },
      error: (err: Error) => {
        this.isTesting.set(false);
        this.testResult.set({ ok: false, message: err.message });
      }
    });
  }

  private apply(settings: ReminderSettingsModel): void {
    this.settings.set(settings);
    this.form.setValue(
      {
        channel: settings.channel,
        hoursBefore: settings.hoursBefore,
        fallback: settings.fallback,
        language: settings.language
      },
      { emitEvent: true }
    );
    // setValue counts as a change; what was just loaded or saved isn't "unsaved".
    this.form.markAsPristine();
  }
}
