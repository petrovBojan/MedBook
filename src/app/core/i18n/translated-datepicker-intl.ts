import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Keeps the datepicker's built-in labels ("Choose a date", "Next month", ...) in the current
 * language. Called from the clinic shell rather than provided in app.config: any reference to
 * MatDatepickerIntl there pulls the whole datepicker (and forms) into the initial bundle, while
 * only pages inside the shell use it. Must run in an injection context.
 */
export function translateDatepickerLabels(): void {
  const intl = inject(MatDatepickerIntl);
  inject(TranslocoService)
    .selectTranslateObject('datepicker')
    .pipe(takeUntilDestroyed(inject(DestroyRef)))
    .subscribe((labels: Record<string, string>) => {
      intl.calendarLabel = labels['calendar'];
      intl.openCalendarLabel = labels['openCalendar'];
      intl.closeCalendarLabel = labels['closeCalendar'];
      intl.prevMonthLabel = labels['prevMonth'];
      intl.nextMonthLabel = labels['nextMonth'];
      intl.prevYearLabel = labels['prevYear'];
      intl.nextYearLabel = labels['nextYear'];
      intl.prevMultiYearLabel = labels['prevMultiYear'];
      intl.nextMultiYearLabel = labels['nextMultiYear'];
      intl.switchToMonthViewLabel = labels['switchToMonthView'];
      intl.switchToMultiYearViewLabel = labels['switchToMultiYearView'];
      intl.changes.next();
    });
}
