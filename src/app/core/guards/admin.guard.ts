import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** The platform owner's panel. Clinic staff are sent back to the clinic app. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const authSrv = inject(AuthService);
  const router = inject(Router);

  if (authSrv.isPlatformAdmin()) {
    return true;
  }
  if (authSrv.isClinicStaff()) {
    return router.createUrlTree(['/calendar']);
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
