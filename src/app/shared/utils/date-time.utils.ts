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
}
