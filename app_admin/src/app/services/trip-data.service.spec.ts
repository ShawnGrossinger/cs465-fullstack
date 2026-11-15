import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TripDataService } from './trip-data.service';
import { environment } from '../../environments/environment';
import { sampleTrip } from '../testing/test-helpers';
import { Trip } from '../models/trip';

describe('TripDataService', () => {
  let service: TripDataService;
  let http: HttpTestingController;
  const tripsUrl = `${environment.apiBaseUrl}/trips`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TripDataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the API address from the environment', () => {
    expect(service.baseUrl).toBe(environment.apiBaseUrl);
  });

  it('getTrip requests one trip and returns a single object', () => {
    let result: Trip | undefined;
    service.getTrip('GALR210214').subscribe((trip) => (result = trip));

    const req = http.expectOne(`${tripsUrl}/GALR210214`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleTrip);

    expect(result?.code).toBe('GALR210214');
  });

  it('encodes trip codes in URLs', () => {
    service.getTrip('A/B?C').subscribe();
    http.expectOne(`${tripsUrl}/A%2FB%3FC`).flush(sampleTrip);
  });

  it('updateTrip sends a PUT to the code it was given, not the code in the form data', () => {
    service.updateTrip('GALR210214', { ...sampleTrip, code: 'SOMETHING' } as Trip).subscribe();
    const req = http.expectOne(`${tripsUrl}/GALR210214`);
    expect(req.request.method).toBe('PUT');
    req.flush(sampleTrip);
  });

  it('deleteTrip sends a DELETE', () => {
    service.deleteTrip('GALR210214').subscribe();
    const req = http.expectOne(`${tripsUrl}/GALR210214`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
