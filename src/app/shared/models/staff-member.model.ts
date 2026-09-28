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
