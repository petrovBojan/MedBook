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
  /** Can add staff members and send them invitations. */
  isClinicAdmin?: boolean;
  /** False while the person's invitation is pending (they haven't set a password yet). */
  hasAccount?: boolean;
}

export interface CreateStaffDto {
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  specialty?: string;
  color?: string;
  isClinicAdmin: boolean;
}
