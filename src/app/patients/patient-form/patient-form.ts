import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PatientService } from '../../core/services/patient.service';
import { Gender, Patient, PatientDto } from '../../shared/models/patient.model';

export interface PatientFormDialogData {
  patientId?: string;
}

@Component({
  selector: 'app-patient-form',
  templateUrl: './patient-form.html',
  styleUrl: './patient-form.css',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule]
})
export class PatientForm {
  private readonly fb = inject(FormBuilder);
  private readonly patientSrv = inject(PatientService);
  private readonly dialogRef = inject(MatDialogRef<PatientForm, Patient | undefined>);
  private readonly data = inject<PatientFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly Gender = Gender;
  readonly patientId = this.data.patientId;
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
        this.dialogRef.close(patient);
      },
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
