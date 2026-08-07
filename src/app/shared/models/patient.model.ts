export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other'
}

export interface Patient {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PatientDto = Omit<Patient, 'id' | 'clinicId' | 'createdAt' | 'updatedAt'>;
