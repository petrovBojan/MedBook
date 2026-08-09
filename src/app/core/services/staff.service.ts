import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { MockDbService } from './mock-db.service';
import { AuthService } from './auth.service';
import { StaffMember, StaffRole } from '../../shared/models/staff-member.model';
import { WorkingHours } from '../../shared/models/working-hours.model';

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private readonly mockDb = inject(MockDbService);
  private readonly authSrv = inject(AuthService);

  getClinicStaff(): Observable<StaffMember[]> {
    const clinicId = this.authSrv.getCurrentClinicId();
    return of(clinicId ? this.mockDb.getStaffByClinic(clinicId) : []);
  }

  getDoctors(): Observable<StaffMember[]> {
    const clinicId = this.authSrv.getCurrentClinicId();
    const staff = clinicId ? this.mockDb.getStaffByClinic(clinicId) : [];
    return of(staff.filter((s) => s.role === StaffRole.Doctor));
  }

  getStaffById(id: string): Observable<StaffMember | undefined> {
    return of(this.mockDb.getStaffById(id));
  }

  updateWorkingHours(staffId: string, workingHours: WorkingHours): Observable<StaffMember> {
    const updated = this.mockDb.updateStaffMember(staffId, { workingHours });
    if (!updated) {
      return throwError(() => new Error('Staff member not found.'));
    }
    return of(updated);
  }
}
