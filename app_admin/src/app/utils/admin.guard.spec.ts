import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { adminGuard } from './admin.guard';
import { adminToken, customerToken, expiredAdminToken, storageProvider } from '../testing/test-helpers';

describe('adminGuard', () => {
  function runGuard(token: string | undefined, url = '/add-trip') {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), storageProvider(token)]
    });
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));
    const router = TestBed.inject(Router);
    return result instanceof UrlTree ? router.serializeUrl(result) : result;
  }

  it('lets administrators in', () => {
    expect(runGuard(adminToken())).toBeTrue();
  });

  it('sends anonymous visitors to the login page and remembers where they were going', () => {
    expect(runGuard(undefined, '/edit-trip/GALR210214'))
      .toBe('/login?returnUrl=%2Fedit-trip%2FGALR210214&reason=login');
  });

  it('treats an expired administrator token as logged out', () => {
    expect(runGuard(expiredAdminToken())).toBe('/login?returnUrl=%2Fadd-trip&reason=login');
  });

  it('turns away logged-in customers', () => {
    expect(runGuard(customerToken())).toBe('/login?returnUrl=%2Fadd-trip&reason=forbidden');
  });
});
