import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Pages only a clinic's admins can use (the Team page). The API enforces the same rule -
 * this just keeps other staff from landing on a page whose actions would all be refused.
 */
export const clinicAdminGuard: CanActivateFn = () => {
  const authSrv = inject(AuthService);
  const router = inject(Router);

  return authSrv.getCurrentUser()?.isClinicAdmin ? true : router.createUrlTree(['/calendar']);
};
