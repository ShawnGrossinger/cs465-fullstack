import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Trip } from '../models/trip';
import { User } from '../models/user';
import { AuthResponse } from '../models/auth-response';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TripDataService {

  // The API address comes from the environment files instead of being
  // hard-coded here, so a deployment only changes configuration.
  readonly baseUrl = environment.apiBaseUrl;
  private readonly tripsUrl = `${this.baseUrl}/trips`;

  constructor(private http: HttpClient) {}

  getTrips(): Observable<Trip[]> {
    return this.http.get<Trip[]>(this.tripsUrl);
  }

  addTrip(formData: Trip): Observable<Trip> {
    return this.http.post<Trip>(this.tripsUrl, formData);
  }

  // The API now returns a single trip object (it used to return an array).
  getTrip(tripCode: string): Observable<Trip> {
    return this.http.get<Trip>(this.tripUrl(tripCode));
  }

  // The trip code is passed separately so the URL never depends on form data.
  updateTrip(tripCode: string, formData: Trip): Observable<Trip> {
    return this.http.put<Trip>(this.tripUrl(tripCode), formData);
  }

  // The API answers 204 No Content.
  deleteTrip(tripCode: string): Observable<void> {
    return this.http.delete<void>(this.tripUrl(tripCode));
  }

  // Call to our /login endpoint, returns JWT
  login(user: User, passwd: string): Observable<AuthResponse> {
    return this.handleAuthAPICall('login', user, passwd);
  }

  // Call to our /register endpoint, creates user and returns JWT
  register(user: User, passwd: string): Observable<AuthResponse> {
    return this.handleAuthAPICall('register', user, passwd);
  }

  // helper method to process both login and register methods
  handleAuthAPICall(endpoint: string, user: User, passwd: string): Observable<AuthResponse> {
    const formData = {
      name: user.name,
      email: user.email,
      password: passwd
    };
    return this.http.post<AuthResponse>(`${this.baseUrl}/${endpoint}`, formData);
  }

  private tripUrl(tripCode: string): string {
    return `${this.tripsUrl}/${encodeURIComponent(tripCode)}`;
  }
}
