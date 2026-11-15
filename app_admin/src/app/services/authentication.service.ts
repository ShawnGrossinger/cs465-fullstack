import { Inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { BROWSER_STORAGE } from '../storage';
import { User } from '../models/user';
import { AuthResponse } from '../models/auth-response';
import { TripDataService } from '../services/trip-data.service';

// Claims the API puts in every token (see app_api/services/tokenService.js).
export interface TokenClaims {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  exp?: number;
}

// For this application we have decided that we will name
// the key for our token 'travlr-token'
const TOKEN_KEY = 'travlr-token';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  // Setup our storage and service access
  constructor(
    @Inject(BROWSER_STORAGE) private storage: Storage,
    private tripDataService: TripDataService
  ) { }

  // Get our token from our Storage provider.
  // Always returns a string, even if we don't have a token.
  public getToken(): string {
    return this.storage.getItem(TOKEN_KEY) ?? '';
  }

  public saveToken(token: string): void {
    this.storage.setItem(TOKEN_KEY, token);
  }

  // Logout of our application and remove the JWT from Storage
  public logout(): void {
    this.storage.removeItem(TOKEN_KEY);
  }

  // Read the claims from the token. The browser cannot check the token's
  // signature (only the server holds the secret), so these values are used
  // only to decide what to show. The API re-checks every protected request.
  // A malformed token is treated the same as no token.
  public getClaims(): TokenClaims | null {
    const payload = this.getToken().split('.')[1];
    if (!payload) {
      return null;
    }
    try {
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const claims = JSON.parse(json);
      return claims && typeof claims === 'object' ? claims as TokenClaims : null;
    } catch {
      return null;
    }
  }

  // Logged in = we hold a well-formed token that has not expired yet.
  public isLoggedIn(): boolean {
    const claims = this.getClaims();
    return !!claims && typeof claims.exp === 'number' && claims.exp > Date.now() / 1000;
  }

  // Only administrators may add, edit, or delete trips.
  public isAdmin(): boolean {
    return this.isLoggedIn() && this.getClaims()?.role === 'admin';
  }

  // Retrieve the current user. Returns empty values when not logged in.
  public getCurrentUser(): User {
    const claims = this.getClaims();
    return { email: claims?.email ?? '', name: claims?.name ?? '' } as User;
  }

  // Login method that leverages the login method in tripDataService.
  // It saves the token when the call succeeds and hands the result back
  // to the caller, so the login page knows when (and whether) it worked.
  public login(user: User, passwd: string): Observable<AuthResponse> {
    return this.tripDataService.login(user, passwd)
      .pipe(tap((value: AuthResponse) => {
        if (value?.token) {
          this.saveToken(value.token);
        }
      }));
  }

  // Register method that leverages the register method in tripDataService.
  // The API logs a new user in immediately upon registration
  // (always as a customer, never as an administrator).
  public register(user: User, passwd: string): Observable<AuthResponse> {
    return this.tripDataService.register(user, passwd)
      .pipe(tap((value: AuthResponse) => {
        if (value?.token) {
          this.saveToken(value.token);
        }
      }));
  }
}
