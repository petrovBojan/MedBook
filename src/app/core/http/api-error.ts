import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';
import { OperatorFunction, catchError, of, throwError } from 'rxjs';
import { ErrorArgs, translateErrorCode } from '../i18n/translate-error';

interface ProblemDetails {
  title?: string;
  detail?: string;
  /** Set on the API's own errors: a stable code, translated here (see translateErrorCode). */
  code?: string;
  args?: ErrorArgs;
  errors?: Record<string, string[]>;
}

/**
 * A failed API call, with a message that's safe to show the user as-is, in the current
 * language. The API returns ProblemDetails: its own errors carry a `code` (plus `args`) to
 * translate and the English text in `detail`; model validation failures carry per-field
 * messages in `errors`.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static from(response: HttpErrorResponse, transloco: TranslocoService): ApiError {
    const body = response.error && typeof response.error === 'object' ? (response.error as ProblemDetails) : null;
    return new ApiError(ApiError.messageFor(response, body, transloco), response.status, body?.code);
  }

  private static messageFor(
    response: HttpErrorResponse,
    body: ProblemDetails | null,
    transloco: TranslocoService
  ): string {
    if (response.status === 0) {
      return transloco.translate('errors.network');
    }

    if (body) {
      const translated = body.code ? translateErrorCode(transloco, body.code, body.args) : null;
      if (translated) {
        return translated;
      }
      if (body.detail) {
        return body.detail;
      }
      const firstFieldError = Object.values(body.errors ?? {}).flat()[0];
      if (firstFieldError) {
        return firstFieldError;
      }
      if (body.title) {
        return body.title;
      }
    }

    return transloco.translate('errors.generic', { status: response.status });
  }
}

/** Maps a 404 to `undefined`, for lookups whose callers already handle "not found" that way. */
export function undefinedIfNotFound<T>(): OperatorFunction<T, T | undefined> {
  return catchError((err: unknown) =>
    err instanceof ApiError && err.status === 404 ? of(undefined) : throwError(() => err)
  );
}
