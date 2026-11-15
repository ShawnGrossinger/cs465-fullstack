import { Injectable, Provider } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { HttpInterceptor, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';
import { environment } from '../../environments/environment';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {

  private readonly apiPrefix = `${environment.apiBaseUrl}/`;

  constructor(
    private authenticationService: AuthenticationService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Only requests to our own API may carry the token. The original version
    // attached it to every request, which would hand it to any other site the
    // app ever called.
    const isApi = request.url.startsWith(this.apiPrefix);
    const isAuthApi = isApi &&
      (request.url.endsWith('/login') || request.url.endsWith('/register'));

    let outgoing = request;
    if (isApi && !isAuthApi && this.authenticationService.isLoggedIn()) {
      outgoing = request.clone({
        setHeaders: {
          Authorization: `Bearer ${this.authenticationService.getToken()}`
        }
      });
    }

    return next.handle(outgoing).pipe(
      catchError((error: unknown) => {
        // The API rejected our token (expired, or the account was removed):
        // sign out and send the user to the login page instead of failing silently.
        if (error instanceof HttpErrorResponse && error.status === 401 && isApi && !isAuthApi) {
          this.authenticationService.logout();
          this.router.navigate(['/login'], { queryParams: { reason: 'expired' } });
        }
        return throwError(() => error);
      })
    );
  }
}

export const authInterceptProvider: Provider =
  { provide: HTTP_INTERCEPTORS,
    useClass: JwtInterceptor, multi: true };
