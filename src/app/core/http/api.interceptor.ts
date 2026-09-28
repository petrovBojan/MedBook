import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { ApiError } from './api-error';

// For calls to our own API: attaches the session's bearer token, and turns failures into
// ApiError so components can show `err.message` directly.
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const authSrv = inject(AuthService);
  const router = inject(Router);
  const token = authSrv.getToken();
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      // A 401 while we hold a token means the session expired or was rejected - drop it
      // and send the user back to log in. (Without a token, it's just a failed login.)
      if (err.status === 401 && token) {
        authSrv.logout();
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }

      return throwError(() => ApiError.from(err));
    })
  );
};
