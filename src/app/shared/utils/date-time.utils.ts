// Helpers for bridging ISO datetime strings (how Appointment.start/end are stored)
// and the value format native <input type="datetime-local"> controls expect/emit.
export class DateTimeUtils {
  static toLocalInputValue(iso: string): string {
    const date = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  }

  static fromLocalInputValue(value: string): string {
    return new Date(value).toISOString();
  }
}
