import { WorkingHours } from './working-hours.model';

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  workingHours?: WorkingHours;
}
