import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { LoginComponent } from './login.component';
import { AuthenticationService } from '../services/authentication.service';
import { environment } from '../../environments/environment';
import { adminToken, customerToken, storageProvider } from '../testing/test-helpers';

describe('LoginComponent', () => {
  const loginUrl = `${environment.apiBaseUrl}/login`;

  function render(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        storageProvider(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } }
      ]
    });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.credentials.email = 'someone@travlr.test';
    component.credentials.password = 'password';
    return {
      fixture, component,
      http: TestBed.inject(HttpTestingController),
      auth: TestBed.inject(AuthenticationService),
      navigateByUrl: spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true)
    };
  }

  it('an administrator is taken back to the page they asked for', () => {
    const { component, http, navigateByUrl } = render({ returnUrl: '/add-trip' });
    component.onLoginSubmit();
    http.expectOne(loginUrl).flush({ token: adminToken() });
    expect(navigateByUrl).toHaveBeenCalledWith('/add-trip');
  });

  it('ignores a returnUrl that points to another site', () => {
    const { component, http, navigateByUrl } = render({ returnUrl: '//evil.example/phish' });
    component.onLoginSubmit();
    http.expectOne(loginUrl).flush({ token: adminToken() });
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('a customer account is signed straight back out with an explanation', () => {
    const { component, http, auth, navigateByUrl } = render();
    component.onLoginSubmit();
    http.expectOne(loginUrl).flush({ token: customerToken() });
    expect(auth.isLoggedIn()).toBeFalse();
    expect(component.formError).toBe('This account does not have administrator access.');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('explains rate limiting', () => {
    const { component, http } = render();
    component.onLoginSubmit();
    http.expectOne(loginUrl).flush({ status: 429, code: 'RATE_LIMITED', message: 'x' }, { status: 429, statusText: 'Too Many Requests' });
    expect(component.formError).toContain('Too many failed attempts');
  });

  it('says why the user was sent here', () => {
    const { component } = render({ reason: 'expired' });
    expect(component.notice).toBe('Your session has ended. Please log in again.');
  });
});
