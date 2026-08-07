import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { MockDbService } from './mock-db.service';
import { AuthService } from './auth.service';
import { Patient, PatientDto } from '../../shared/models/patient.model';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly mockDb = inject(MockDbService);
  private readonly authSrv = inject(AuthService);

  getPatients(): Observable<Patient[]> {
    const clinicId = this.requireClinicId();
    return of(
      this.mockDb
        .getPatients(clinicId)
        .slice()
        .sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`))
    );
  }

  getPatient(id: string): Observable<Patient | undefined> {
    return of(this.mockDb.getPatient(id));
  }

  createPatient(dto: PatientDto): Observable<Patient> {
    const clinicId = this.requireClinicId();
    const now = new Date().toISOString();
    const patient: Patient = {
      ...dto,
      id: crypto.randomUUID(),
      clinicId,
      createdAt: now,
      updatedAt: now
    };
    return of(this.mockDb.createPatient(patient));
  }

  updatePatient(id: string, dto: PatientDto): Observable<Patient> {
    const updated = this.mockDb.updatePatient(id, { ...dto, updatedAt: new Date().toISOString() });
    if (!updated) {
      return throwError(() => new Error('Patient not found.'));
    }
    return of(updated);
  }

  private requireClinicId(): string {
    const clinicId = this.authSrv.getCurrentClinicId();
    if (!clinicId) {
      throw new Error('No clinic in session.');
    }
    return clinicId;
  }
}
