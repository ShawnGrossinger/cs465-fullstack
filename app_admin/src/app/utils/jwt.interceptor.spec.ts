import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { authInterceptProvider } from './jwt.interceptor';
import { AuthenticationService } from '../services/authentication.service';
import { environment } from '../../environments/environment';
import { adminToken, expiredAdminToken, storageProvider } from '../testing/test-helpers';

describe('JwtInterceptor', () => {
  const api = environment.apiBaseUrl;

  function setup(token?: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        authInterceptProvider,
        storageProvider(token)
      ]
    });
    return {
      http: TestBed.inject(HttpClient),
      backend: TestBed.inject(HttpTestingController),
      auth: TestBed.inject(AuthenticationService),
      router: TestBed.inject(Router)
    };
  }

  it('adds the bearer token to API requests when logged in', () => {
    const token = adminToken();
    const { http, backend } = setup(token);
    http.post(`${api}/trips`, {}).subscribe();
    expect(backend.expectOne(`${api}/trips`).request.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('does not send a token to the login endpoint', () => {
    const { http, backend } = setup(adminToken());
    http.post(`${api}/login`, {}).subscribe();
    expect(backend.expectOne(`${api}/login`).request.headers.has('Authorization')).toBeFalse();
  });

  it('never sends the token to any other site', () => {
    const { http, backend } = setup(adminToken());
    http.get('https://example.com/api/trips').subscribe();
    expect(backend.expectOne('https://example.com/api/trips').request.headers.has('Authorization')).toBeFalse();
  });

  it('does not send an expired token', () => {
    const { http, backend } = setup(expiredAdminToken());
    http.get(`${api}/trips`).subscribe();
    expect(backend.expectOne(`${api}/trips`).request.headers.has('Authorization')).toBeFalse();
  });

  it('signs out and goes to the login page when the API rejects the token', () => {
    const { http, backend, auth, router } = setup(adminToken());
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    http.delete(`${api}/trips/GALR210214`).subscribe({ error: () => undefined });
    backend.expectOne(`${api}/trips/GALR210214`)
      .flush({ status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'expired' } });
  });

  it('a failed login (401) does not trigger the sign-out redirect', () => {
    const { http, backend, router } = setup();
    const navigate = spyOn(router, 'navigate');
    http.post(`${api}/login`, {}).subscribe({ error: () => undefined });
    backend.expectOne(`${api}/login`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(navigate).not.toHaveBeenCalled();
  });
});
