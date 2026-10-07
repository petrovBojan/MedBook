import { addDays, addMinutes, startOfDay } from 'date-fns';
import { DaySchedule, Weekday, WorkingHours } from '../models/working-hours.model';
import { DateTimeUtils } from './date-time.utils';

// Date.getDay() order: 0 = Sunday.
const WEEKDAY_BY_INDEX = [
  Weekday.Sunday,
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
  Weekday.Saturday
];

/** Booking slots start on these boundaries, matching the 15-minute steps of the time pickers. */
export const SLOT_MINUTES = 15;

/** The opening hours for the date's weekday, or undefined when closed that day. */
export function openHoursOn(hours: WorkingHours, date: Date): DaySchedule | undefined {
  const schedule = hours.find((d) => d.day === WEEKDAY_BY_INDEX[date.getDay()]);
  return schedule?.enabled ? schedule : undefined;
}

/** The weekday name of a date, e.g. "Saturday" - for messages like "closed on Saturdays". */
export function weekdayOf(date: Date): Weekday {
  return WEEKDAY_BY_INDEX[date.getDay()];
}

/** The given "HH:mm" time on the given date. */
export function atTime(date: Date, time: string): Date {
  return DateTimeUtils.combineDateAndTime(date, DateTimeUtils.timeStringToDate(time));
}

/**
 * The earliest start at or after `from` that fits the opening hours with room for at least
 * one slot: rounded up to the next slot boundary, moved to opening time if too early, and
 * to the next open day if the day is closed or already over. Looks two weeks ahead, then
 * gives up and returns `from` (e.g. a clinic with no open days).
 */
export function firstAvailableStart(hours: WorkingHours, from: Date): Date {
  const roundedUp = new Date(from);
  roundedUp.setSeconds(0, 0);
  const remainder = roundedUp.getMinutes() % SLOT_MINUTES;
  if (remainder !== 0) {
    roundedUp.setMinutes(roundedUp.getMinutes() + SLOT_MINUTES - remainder);
  }

  for (let offset = 0; offset < 14; offset++) {
    const day = addDays(startOfDay(roundedUp), offset);
    const open = openHoursOn(hours, day);
    if (!open) {
      continue;
    }

    const opening = atTime(day, open.start);
    const latestStart = addMinutes(atTime(day, open.end), -SLOT_MINUTES);
    const candidate = offset === 0 && roundedUp > opening ? roundedUp : opening;
    if (candidate <= latestStart) {
      return candidate;
    }
  }
  return from;
}
