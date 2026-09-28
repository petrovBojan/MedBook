import { Injectable, inject } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

// Same breakpoints as expostudio-app, and as the @media queries in the stylesheets -
// keep the two in sync. Use CSS for purely visual changes; these signals are for when
// the template itself has to differ (a different component, fewer table columns, ...).
export const HANDSET_QUERY = '(max-width: 767px)';
export const COMPACT_QUERY = '(max-width: 1024px)';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private readonly breakpoints = inject(BreakpointObserver);

  /** Phones. */
  readonly isHandset = toSignal(this.breakpoints.observe(HANDSET_QUERY).pipe(map((state) => state.matches)), {
    initialValue: false
  });

  /** Phones and tablets - the app switches from a side nav to a bottom tab bar. */
  readonly isCompact = toSignal(this.breakpoints.observe(COMPACT_QUERY).pipe(map((state) => state.matches)), {
    initialValue: false
  });
}
