import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = () => {
  const authSrv = inject(AuthService);
  const router = inject(Router);

  return authSrv.isLoggedIn() ? router.createUrlTree(['/calendar']) : true;
};
