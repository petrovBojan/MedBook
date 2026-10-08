import { Component, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PasswordService } from '../../core/services/password.service';
import { PasswordResetDetails } from '../../shared/models/account.model';
import { MIN_PASSWORD_LENGTH, passwordsMatch } from '../../shared/utils/password.utils';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { LanguageToggle } from '../../shared/components/language-toggle/language-toggle';

/**
 * Where a staff member lands from a password reset link their admin gave them: shows whose
 * account it is, lets them choose a new password, and logs them straight in.
 */
@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  // Same layout as the registration page.
  styleUrl: '../register/register.css',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslocoDirective,
    LanguageToggle
  ]
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly passwordSrv = inject(PasswordService);
  private readonly transloco = inject(TranslocoService);

  readonly minPasswordLength = MIN_PASSWORD_LENGTH;
  readonly state = signal<'loading' | 'ready' | 'invalid'>('loading');
  readonly details = signal<PasswordResetDetails | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly hidePassword = signal(true);

  private readonly token: string;

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordsMatch }
  );

  constructor() {
    this.token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';
    // Take the token out of the address bar (and browser history) now that it's been read.
    inject(Location).replaceState('/reset-password');

    if (!this.token) {
      this.state.set('invalid');
      this.errorMessage.set(this.transloco.translate('auth.reset.noToken'));
      return;
    }

    this.passwordSrv.getResetDetails(this.token).subscribe({
      next: (details) => {
        this.details.set(details);
        this.state.set('ready');
      },
      error: (err: Error) => {
        this.state.set('invalid');
        this.errorMessage.set(err.message);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.passwordSrv.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: () => this.router.navigateByUrl('/calendar'),
      error: (err: Error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message);
      }
    });
  }
}
