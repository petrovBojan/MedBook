import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AdminService } from '../../core/services/admin.service';
import { StaffRole } from '../../shared/models/staff-member.model';
import { CreatedClinic } from '../../shared/models/account.model';

// Every IANA time zone the browser knows ("Europe/Belgrade", ...). The API validates it too.
const TIME_ZONES: string[] = Intl.supportedValuesOf('timeZone');

function knownTimeZone(control: AbstractControl): ValidationErrors | null {
  return control.value && !TIME_ZONES.includes(control.value) ? { unknownTimeZone: true } : null;
}

/** The platform owner creating a clinic and its first admin. Closes with the result. */
@Component({
  selector: 'app-clinic-form',
  templateUrl: './clinic-form.html',
  styleUrl: './clinic-form.css',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule
  ]
})
export class ClinicForm {
  private readonly fb = inject(FormBuilder);
  private readonly adminSrv = inject(AdminService);
  private readonly dialogRef = inject(MatDialogRef<ClinicForm, CreatedClinic | undefined>);

  readonly StaffRole = StaffRole;
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    address: [''],
    phone: [''],
    email: ['', Validators.email],
    timeZone: [Intl.DateTimeFormat().resolvedOptions().timeZone, [Validators.required, knownTimeZone]],
    admin: this.fb.nonNullable.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: [StaffRole.Doctor, Validators.required],
      specialty: ['']
    })
  });

  private readonly timeZoneInput = toSignal(this.form.controls.timeZone.valueChanges, {
    initialValue: this.form.controls.timeZone.value
  });

  /** Matching zones for the autocomplete - capped, since there are ~400. */
  readonly timeZoneOptions = computed(() => {
    const term = this.timeZoneInput().trim().toLowerCase().replace(/\s+/g, '_');
    const matches = term && !TIME_ZONES.includes(this.timeZoneInput()) ? TIME_ZONES.filter((zone) => zone.toLowerCase().includes(term)) : TIME_ZONES;
    return matches.slice(0, 50);
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    this.adminSrv
      .createClinic({
        name: raw.name.trim(),
        address: raw.address.trim() || undefined,
        phone: raw.phone.trim() || undefined,
        email: raw.email.trim() || undefined,
        timeZone: raw.timeZone,
        admin: {
          firstName: raw.admin.firstName.trim(),
          lastName: raw.admin.lastName.trim(),
          email: raw.admin.email.trim(),
          role: raw.admin.role,
          specialty: raw.admin.role === StaffRole.Doctor ? raw.admin.specialty.trim() || undefined : undefined
        }
      })
      .subscribe({
        next: (result) => this.dialogRef.close(result),
        error: (err: Error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.message);
        }
      });
  }

  close(): void {
    this.dialogRef.close(undefined);
  }
}
