import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';

/**
 * Only administrators may open the add-trip and edit-trip pages.
 *
 * This guard is for the user's benefit (no dead-end forms that fail on
 * save); it is not the security boundary. Anyone can change code running in
 * their own browser, so the API independently rejects every write from an
 * account that is not an administrator.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthenticationService);
  if (auth.isAdmin()) {
    return true;
  }
  const reason = auth.isLoggedIn() ? 'forbidden' : 'login';
  return inject(Router).createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url, reason }
  });
};
