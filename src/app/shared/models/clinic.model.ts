import { WorkingHours } from './working-hours.model';

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  /** Time zone the clinic's working hours are expressed in (IANA or Windows id). */
  timeZone?: string;
  isActive?: boolean;
  workingHours?: WorkingHours;
}
