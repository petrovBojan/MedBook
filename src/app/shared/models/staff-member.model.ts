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
  /** When the profile photo last changed; absent when there is no photo. Part of the photo URL (cache busting). */
  photoUpdatedAt?: string;
}

/** What a staff member can change on their own profile page. */
export interface UpdateProfileDto {
  firstName: string;
  lastName: string;
  specialty?: string;
  color?: string;
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
