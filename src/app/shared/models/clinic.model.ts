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

export type ReminderChannel = 'Off' | 'Email' | 'Sms';

/** How the clinic reminds patients of their appointments (Settings page). */
export interface ReminderSettings {
  channel: ReminderChannel;
  /** How long before the appointment the reminder goes out (1-168). */
  hoursBefore: number;
  /** When a patient has no address for the chosen channel, use the other one. */
  fallback: boolean;
  /** Language of the message the patient gets: 'en' or 'mk'. */
  language: string;
  /** Whether the server has email / SMS set up - a channel can only be chosen when it does. */
  emailAvailable: boolean;
  smsAvailable: boolean;
}

export type ReminderSettingsDto = Pick<ReminderSettings, 'channel' | 'hoursBefore' | 'fallback' | 'language'>;
