import { HttpErrorResponse } from '@angular/common/http';
import { OperatorFunction, catchError, of, throwError } from 'rxjs';

interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

/**
 * A failed API call, with a message that's safe to show the user as-is. The API returns
 * ProblemDetails: business-rule failures carry the message in `detail`, model validation
 * failures carry per-field messages in `errors`.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static from(response: HttpErrorResponse): ApiError {
    return new ApiError(ApiError.messageFor(response), response.status);
  }

  private static messageFor(response: HttpErrorResponse): string {
    if (response.status === 0) {
      return "Can't reach the server. Check your connection and try again.";
    }

    const body = response.error as ProblemDetails | null;
    if (body && typeof body === 'object') {
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

    return `Something went wrong (error ${response.status}). Please try again.`;
  }
}

/** Maps a 404 to `undefined`, for lookups whose callers already handle "not found" that way. */
export function undefinedIfNotFound<T>(): OperatorFunction<T, T | undefined> {
  return catchError((err: unknown) =>
    err instanceof ApiError && err.status === 404 ? of(undefined) : throwError(() => err)
  );
}
