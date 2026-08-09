export enum Weekday {
  Monday = 'Monday',
  Tuesday = 'Tuesday',
  Wednesday = 'Wednesday',
  Thursday = 'Thursday',
  Friday = 'Friday',
  Saturday = 'Saturday',
  Sunday = 'Sunday'
}

export interface DaySchedule {
  day: Weekday;
  enabled: boolean;
  /** 24h "HH:mm" */
  start: string;
  /** 24h "HH:mm" */
  end: string;
}

export type WorkingHours = DaySchedule[];

const WEEKDAYS = [
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
  Weekday.Saturday,
  Weekday.Sunday
];

// Mon-Fri 9-5 open, weekends off - the common case for a clinic, and a reasonable
// starting point staff can then tailor to their own schedule.
export function createDefaultWorkingHours(): WorkingHours {
  return WEEKDAYS.map((day) => ({
    day,
    enabled: day !== Weekday.Saturday && day !== Weekday.Sunday,
    start: '09:00',
    end: '17:00'
  }));
}
