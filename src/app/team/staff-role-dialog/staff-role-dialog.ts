import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { StaffService } from '../../core/services/staff.service';
import { StaffMember, StaffRole } from '../../shared/models/staff-member.model';
import { TranslocoDirective } from '@jsverse/transloco';

/** A clinic admin switching a staff member between doctor and employee. Closes with the updated member. */
@Component({
  selector: 'app-staff-role-dialog',
  templateUrl: './staff-role-dialog.html',
  styleUrl: './staff-role-dialog.css',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    TranslocoDirective
  ]
})
export class StaffRoleDialog {
  private readonly fb = inject(FormBuilder);
  private readonly staffSrv = inject(StaffService);
  private readonly dialogRef = inject(MatDialogRef<StaffRoleDialog, StaffMember | undefined>);
  readonly member = inject<StaffMember>(MAT_DIALOG_DATA);

  readonly StaffRole = StaffRole;
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    role: [this.member.role],
    specialty: [this.member.specialty ?? '']
  });

  submit(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    this.staffSrv
      .updateRole(this.member.id, {
        role: raw.role,
        specialty: raw.role === StaffRole.Doctor ? raw.specialty.trim() || undefined : undefined
      })
      .subscribe({
        next: (updated) => this.dialogRef.close(updated),
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
