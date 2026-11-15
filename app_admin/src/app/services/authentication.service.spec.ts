import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthenticationService } from './authentication.service';
import { User } from '../models/user';
import { environment } from '../../environments/environment';
import { adminToken, customerToken, expiredAdminToken, storageProvider } from '../testing/test-helpers';

describe('AuthenticationService', () => {
  function setup(token?: string) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), storageProvider(token)]
    });
    return TestBed.inject(AuthenticationService);
  }

  it('is logged out when there is no token', () => {
    const service = setup();
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.isAdmin()).toBeFalse();
  });

  it('recognizes an administrator token', () => {
    const service = setup(adminToken());
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.isAdmin()).toBeTrue();
    expect(service.getCurrentUser().email).toBe('admin@travlr.test');
  });

  it('a customer token is logged in but not an administrator', () => {
    const service = setup(customerToken());
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.isAdmin()).toBeFalse();
  });

  it('treats an expired token as logged out', () => {
    const service = setup(expiredAdminToken());
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.isAdmin()).toBeFalse();
  });

  it('treats a malformed token as logged out instead of throwing', () => {
    for (const bad of ['garbage', 'a.b.c', 'a.!!!.c', 'a.bnVsbA.c']) {
      TestBed.resetTestingModule();
      const service = setup(bad);
      expect(() => service.isLoggedIn()).not.toThrow();
      expect(service.isLoggedIn()).toBeFalse();
    }
  });

  it('login saves the token returned by the API', () => {
    const service = setup();
    const http = TestBed.inject(HttpTestingController);

    service.login({ email: 'admin@travlr.test', name: '' } as User, 'pw').subscribe();
    http.expectOne(`${environment.apiBaseUrl}/login`).flush({ token: adminToken() });

    expect(service.isAdmin()).toBeTrue();
    http.verify();
  });

  it('logout removes the token', () => {
    const service = setup(adminToken());
    service.logout();
    expect(service.isLoggedIn()).toBeFalse();
  });
});
