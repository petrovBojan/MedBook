import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { PatientService } from '../../core/services/patient.service';
import { Gender, PatientDto } from '../../shared/models/patient.model';

@Component({
  selector: 'app-patient-form',
  templateUrl: './patient-form.html',
  styleUrl: './patient-form.css',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule
  ]
})
export class PatientForm {
  private readonly fb = inject(FormBuilder);
  private readonly patientSrv = inject(PatientService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly Gender = Gender;
  readonly patientId = this.route.snapshot.paramMap.get('id');
  readonly isEditMode = !!this.patientId;

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    dateOfBirth: [''],
    gender: [null as Gender | null],
    phone: [''],
    email: ['', Validators.email],
    address: [''],
    notes: ['']
  });

  constructor() {
    if (this.patientId) {
      this.patientSrv.getPatient(this.patientId).subscribe((patient) => {
        if (!patient) {
          this.errorMessage.set('Patient not found.');
          return;
        }
        this.form.patchValue({
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth ?? '',
          gender: patient.gender ?? null,
          phone: patient.phone ?? '',
          email: patient.email ?? '',
          address: patient.address ?? '',
          notes: patient.notes ?? ''
        });
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const dto: PatientDto = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      dateOfBirth: raw.dateOfBirth || undefined,
      gender: raw.gender ?? undefined,
      phone: raw.phone || undefined,
      email: raw.email || undefined,
      address: raw.address || undefined,
      notes: raw.notes || undefined
    };

    const request = this.isEditMode
      ? this.patientSrv.updatePatient(this.patientId!, dto)
      : this.patientSrv.createPatient(dto);

    request.subscribe({
      next: (patient) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/patients', patient.id]);
      },
      error: (err: Error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message);
      }
    });
  }
}
