import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { ApiError } from './api-error';

/** Required by the API on state-changing requests (its CSRF protection). */
export const CSRF_HEADER = 'X-Requested-With';
export const CSRF_HEADER_VALUE = 'XMLHttpRequest';

// For calls to our own API: sends the HttpOnly session cookie along (withCredentials) plus
// the CSRF header, and turns failures into ApiError so components can show `err.message`
// directly.
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const authSrv = inject(AuthService);
  const router = inject(Router);
  const request = req.clone({ withCredentials: true, setHeaders: { [CSRF_HEADER]: CSRF_HEADER_VALUE } });
  const isAuthCall = req.url.startsWith(`${environment.apiUrl}/auth/`);

  return next(request).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      // A 401 during a session means the cookie expired or was rejected - end the session
      // and send the user back to log in. (On the login call itself it's just a wrong
      // password.)
      if (err.status === 401 && !isAuthCall && authSrv.isLoggedIn()) {
        authSrv.logout();
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }

      return throwError(() => ApiError.from(err));
    })
  );
};
