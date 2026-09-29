import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PasswordService } from '../../../core/services/password.service';
import { MIN_PASSWORD_LENGTH, passwordsMatch } from '../../utils/password.utils';

/**
 * The logged-in user (clinic staff or the platform owner) changes their own password. This
 * session carries on; the API signs them out everywhere else.
 */
@Component({
  selector: 'app-change-password-dialog',
  templateUrl: './change-password-dialog.html',
  styleUrl: './change-password-dialog.css',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class ChangePasswordDialog {
  private readonly fb = inject(FormBuilder);
  private readonly passwordSrv = inject(PasswordService);

  readonly minPasswordLength = MIN_PASSWORD_LENGTH;
  readonly isSubmitting = signal(false);
  readonly isDone = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hidePassword = signal(true);

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordsMatch }
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { currentPassword, password } = this.form.getRawValue();
    this.passwordSrv.changePassword(currentPassword, password).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isDone.set(true);
      },
      error: (err: Error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message);
      }
    });
  }
}
