import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { MockDbService } from './mock-db.service';
import { AuthService } from './auth.service';
import { Clinic } from '../../shared/models/clinic.model';
import { WorkingHours } from '../../shared/models/working-hours.model';

@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private readonly mockDb = inject(MockDbService);
  private readonly authSrv = inject(AuthService);

  getCurrentClinic(): Observable<Clinic | undefined> {
    const clinicId = this.authSrv.getCurrentClinicId();
    return of(clinicId ? this.mockDb.getClinic(clinicId) : undefined);
  }

  updateWorkingHours(clinicId: string, workingHours: WorkingHours): Observable<Clinic> {
    const updated = this.mockDb.updateClinic(clinicId, { workingHours });
    if (!updated) {
      return throwError(() => new Error('Clinic not found.'));
    }
    return of(updated);
  }
}
