import { createDefaultWorkingHours } from '../models/working-hours.model';
import { firstAvailableStart, openHoursOn } from './clinic-hours.utils';

describe('clinic hours', () => {
  // Mon-Fri 09:00-17:00, closed at weekends.
  const hours = createDefaultWorkingHours();

  // 2026-10-07 is a Wednesday; months are 0-based in the Date constructor.
  const wednesday = (h: number, m = 0) => new Date(2026, 9, 7, h, m);

  it('knows which days the clinic is open', () => {
    expect(openHoursOn(hours, wednesday(12))?.start).toBe('09:00');
    expect(openHoursOn(hours, new Date(2026, 9, 10))).toBeUndefined(); // Saturday
  });

  it('rounds a time during opening hours up to the next 15 minutes', () => {
    expect(firstAvailableStart(hours, wednesday(10, 7))).toEqual(wednesday(10, 15));
    expect(firstAvailableStart(hours, wednesday(10, 30))).toEqual(wednesday(10, 30));
  });

  it('moves a time before opening to opening time', () => {
    expect(firstAvailableStart(hours, wednesday(7, 20))).toEqual(wednesday(9));
  });

  it('moves a time after the last slot to the next open day', () => {
    expect(firstAvailableStart(hours, wednesday(16, 50))).toEqual(new Date(2026, 9, 8, 9, 0));
  });

  it('skips closed days', () => {
    // Friday evening -> Monday morning.
    expect(firstAvailableStart(hours, new Date(2026, 9, 9, 18, 0))).toEqual(new Date(2026, 9, 12, 9, 0));
  });
});
