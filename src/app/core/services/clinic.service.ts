import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MockDbService } from './mock-db.service';
import { AuthService } from './auth.service';
import { Clinic } from '../../shared/models/clinic.model';

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
}
