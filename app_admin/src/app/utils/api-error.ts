import { HttpErrorResponse } from '@angular/common/http';

// Shape of every error the API returns (see app_api/middleware/errorHandler.js).
export interface ApiErrorBody {
  status?: number;
  code?: string;
  message?: string;
  details?: { field: string; message: string }[];
}

/**
 * Turn a failed API call into a message a person can act on, instead of
 * the console.log('Error: ' + error) the components used before.
 */
export function describeApiError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Something went wrong. Please try again.';
  }
  if (error.status === 0) {
    return 'Cannot reach the Travlr API. Check that the server is running.';
  }
  const body = error.error as ApiErrorBody | null;
  if (body?.details?.length) {
    return body.details.map((d) => d.message).join('. ') + '.';
  }
  if (body?.message) {
    return body.message;
  }
  return `Request failed (${error.status}).`;
}
