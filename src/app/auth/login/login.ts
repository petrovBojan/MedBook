import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule
  ]
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authSrv = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();
    this.authSrv.login(email, password).subscribe({
      next: (session) => {
        this.isSubmitting.set(false);
        // Only follow returnUrl into the part of the app this account can use: the admin
        // panel for the platform owner, the clinic app for staff.
        const isAdmin = !!session.platformAdmin;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const returnsToAdmin = !!returnUrl?.startsWith('/admin');
        const target = returnUrl && returnsToAdmin === isAdmin ? returnUrl : this.authSrv.homeUrl();
        this.router.navigateByUrl(target);
      },
      error: (err: Error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message || 'Unable to log in. Please try again.');
      }
    });
  }
}
