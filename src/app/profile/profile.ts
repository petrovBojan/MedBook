import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ProfileService } from '../core/services/profile.service';
import { AuthService } from '../core/services/auth.service';
import { StaffMember, StaffRole } from '../shared/models/staff-member.model';
import { Avatar } from '../shared/components/avatar/avatar';
import { ChangePasswordDialog } from '../shared/components/change-password-dialog/change-password-dialog';
import { STAFF_COLORS } from '../shared/utils/staff-colors';
import { resizeToSquare } from '../shared/utils/image.utils';

/**
 * The logged-in staff member's own profile: photo, name, specialty and calendar color.
 * Email, role and admin rights are shown but managed by the clinic.
 */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    Avatar
  ]
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly profileSrv = inject(ProfileService);
  private readonly dialog = inject(MatDialog);

  readonly StaffRole = StaffRole;
  readonly colors = STAFF_COLORS;

  // Starts from the session's copy so the page renders at once; refreshed from the API below.
  readonly profile = signal<StaffMember | null>(inject(AuthService).getCurrentUser());

  readonly isSaving = signal(false);
  readonly justSaved = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isPhotoBusy = signal(false);
  readonly photoError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    specialty: ['', Validators.maxLength(100)],
    color: ['']
  });

  constructor() {
    const cached = this.profile();
    if (cached) {
      this.fillForm(cached);
    }

    this.profileSrv.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.fillForm(profile);
      },
      error: (err: Error) => this.errorMessage.set(err.message)
    });

    this.form.valueChanges.subscribe(() => this.justSaved.set(false));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const { firstName, lastName, specialty, color } = this.form.getRawValue();
    const isDoctor = this.profile()?.role === StaffRole.Doctor;
    this.profileSrv
      .updateProfile({
        firstName,
        lastName,
        // Only doctors have a specialty field; leave anyone else's untouched.
        specialty: isDoctor ? specialty || undefined : this.profile()?.specialty,
        color: color || undefined
      })
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.fillForm(profile);
          this.isSaving.set(false);
          this.justSaved.set(true);
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.message);
        }
      });
  }

  async onPhotoSelected(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    // Reset so choosing the same file again still fires a change event.
    input.value = '';
    if (!file) {
      return;
    }

    this.photoError.set(null);
    this.isPhotoBusy.set(true);

    let photo: Blob;
    try {
      photo = await resizeToSquare(file);
    } catch {
      this.isPhotoBusy.set(false);
      this.photoError.set("That file couldn't be read as an image. Try a JPEG, PNG or WebP photo.");
      return;
    }

    this.profileSrv.uploadPhoto(photo).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.isPhotoBusy.set(false);
      },
      error: (err: Error) => {
        this.isPhotoBusy.set(false);
        this.photoError.set(err.message);
      }
    });
  }

  removePhoto(): void {
    this.photoError.set(null);
    this.isPhotoBusy.set(true);
    this.profileSrv.deletePhoto().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.isPhotoBusy.set(false);
      },
      error: (err: Error) => {
        this.isPhotoBusy.set(false);
        this.photoError.set(err.message);
      }
    });
  }

  changePassword(): void {
    this.dialog.open(ChangePasswordDialog, { width: '440px', maxWidth: '95vw', autoFocus: false });
  }

  private fillForm(profile: StaffMember): void {
    this.form.reset(
      {
        firstName: profile.firstName,
        lastName: profile.lastName,
        specialty: profile.specialty ?? '',
        color: profile.color ?? ''
      },
      { emitEvent: false }
    );
  }
}
