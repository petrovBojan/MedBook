import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { StaffService } from '../../core/services/staff.service';
import { StaffRole } from '../../shared/models/staff-member.model';
import { StaffInvitation } from '../../shared/models/account.model';
import { STAFF_COLORS as COLORS } from '../../shared/utils/staff-colors';
import { TranslocoDirective } from '@jsverse/transloco';

/** A clinic admin adding a staff member. Closes with the created member and their invitation. */
@Component({
  selector: 'app-staff-form',
  templateUrl: './staff-form.html',
  styleUrl: './staff-form.css',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatDialogModule,
    TranslocoDirective
  ]
})
export class StaffForm {
  private readonly fb = inject(FormBuilder);
  private readonly staffSrv = inject(StaffService);
  private readonly dialogRef = inject(MatDialogRef<StaffForm, StaffInvitation | undefined>);

  readonly StaffRole = StaffRole;
  readonly colors = COLORS;
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: [StaffRole.Doctor, Validators.required],
    specialty: [''],
    color: [COLORS[Math.floor(Math.random() * COLORS.length)]],
    isClinicAdmin: [false]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    this.staffSrv
      .createStaff({
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        email: raw.email.trim(),
        role: raw.role,
        specialty: raw.role === StaffRole.Doctor ? raw.specialty.trim() || undefined : undefined,
        color: raw.color,
        isClinicAdmin: raw.isClinicAdmin
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
