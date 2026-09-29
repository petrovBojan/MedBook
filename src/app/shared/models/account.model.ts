import { StaffMember, StaffRole } from './staff-member.model';

/** The platform owner: manages clinics, belongs to none, sees no clinic data. */
export interface PlatformAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/** A logged-in session - exactly one of `user` (clinic staff) or `platformAdmin` is set. */
export interface Session {
  expiresAt: string;
  user?: StaffMember;
  platformAdmin?: PlatformAdmin;
}

/** A one-time registration link's token. Returned once, when the invitation is created. */
export interface Invitation {
  token: string;
  expiresAt: string;
}

export interface StaffInvitation {
  staff: StaffMember;
  invitation: Invitation;
}

/** What the registration page shows before the password is set. */
export interface InvitationDetails {
  firstName: string;
  lastName: string;
  email: string;
  clinicName: string;
  expiresAt: string;
}

/** A one-time password reset link's token. Returned once, when an admin creates it. */
export interface PasswordResetLink {
  token: string;
  expiresAt: string;
}

/** What the reset page shows before the new password is set. */
export interface PasswordResetDetails {
  firstName: string;
  lastName: string;
  email: string;
  clinicName: string;
  expiresAt: string;
}

export interface ClinicSummary {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  timeZone: string;
  isActive: boolean;
  createdAt?: string;
  staffCount: number;
}

export interface CreateClinicDto {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  timeZone: string;
  admin: {
    firstName: string;
    lastName: string;
    email: string;
    role: StaffRole;
    specialty?: string;
  };
}

export interface CreatedClinic {
  clinic: ClinicSummary;
  admin: StaffMember;
  invitation: Invitation;
}
