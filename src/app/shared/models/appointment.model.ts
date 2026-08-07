export enum AppointmentStatus {
  Scheduled = 'Scheduled',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  NoShow = 'NoShow'
}

export interface Appointment {
  id: string;
  clinicId: string;
  doctorId: string;
  patientId: string;
  start: string;
  end: string;
  reason?: string;
  notes?: string;
  status: AppointmentStatus;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentDto = Pick<
  Appointment,
  'doctorId' | 'patientId' | 'start' | 'end' | 'reason' | 'notes' | 'status'
>;
