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
import { RegistrationService } from '../../core/services/registration.service';
import { InvitationDetails } from '../../shared/models/account.model';
import { MIN_PASSWORD_LENGTH, passwordsMatch } from '../../shared/utils/password.utils';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { LanguageToggle } from '../../shared/components/language-toggle/language-toggle';

/**
 * Where an invited staff member lands from their invitation link: shows who the
 * invitation is for, lets them choose a password, and logs them straight in.
 */
@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrl: './register.css',
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
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly registrationSrv = inject(RegistrationService);
  private readonly transloco = inject(TranslocoService);

  readonly minPasswordLength = MIN_PASSWORD_LENGTH;
  readonly state = signal<'loading' | 'ready' | 'invalid'>('loading');
  readonly invitation = signal<InvitationDetails | null>(null);
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
    inject(Location).replaceState('/register');

    if (!this.token) {
      this.state.set('invalid');
      this.errorMessage.set(this.transloco.translate('auth.register.noToken'));
      return;
    }

    this.registrationSrv.getInvitation(this.token).subscribe({
      next: (invitation) => {
        this.invitation.set(invitation);
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

    this.registrationSrv.register(this.token, this.form.getRawValue().password).subscribe({
      next: () => this.router.navigateByUrl('/calendar'),
      error: (err: Error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message);
      }
    });
  }
}
