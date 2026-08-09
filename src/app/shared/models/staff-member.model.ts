import { WorkingHours } from './working-hours.model';

export enum StaffRole {
  Doctor = 'Doctor',
  Employee = 'Employee'
}

export interface StaffMember {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  specialty?: string;
  color?: string;
  workingHours?: WorkingHours;
}

// Only ever used inside the mock data layer to check credentials - never exposed via AuthService's public observables.
export interface StaffCredentials {
  staffId: string;
  password: string;
}
