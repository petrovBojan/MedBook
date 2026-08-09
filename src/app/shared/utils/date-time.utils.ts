// Helpers for bridging plain Date objects (what the Material date/time pickers bind to)
// and how dates/datetimes are actually stored: Appointment.start/end as full ISO
// datetime strings, Patient.dateOfBirth as a plain yyyy-MM-dd date string.
export class DateTimeUtils {
  private static pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  /** Local (not UTC) yyyy-MM-dd, for date-only values like a patient's date of birth. */
  static toLocalDateString(date: Date): string {
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`;
  }

  /** Merges a date's Y/M/D with a separate time value's H/M into a single Date. */
  static combineDateAndTime(date: Date, time: Date): Date {
    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return combined;
  }

  /** Parses a 24h "HH:mm" string into a Date (today's Y/M/D, for binding to matTimepicker). */
  static timeStringToDate(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /** Formats a Date's H/M as a 24h "HH:mm" string, for storage independent of any date. */
  static dateToTimeString(date: Date): string {
    return `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`;
  }
}
