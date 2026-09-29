import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** The login page: someone already logged in goes straight to their home page instead. */
export const noAuthGuard: CanActivateFn = () => {
  const authSrv = inject(AuthService);
  const router = inject(Router);

  return authSrv.isLoggedIn() ? router.createUrlTree([authSrv.homeUrl()]) : true;
};
