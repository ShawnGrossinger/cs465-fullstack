import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { TripListingComponent } from './trip-listing.component';
import { environment } from '../../environments/environment';
import { adminToken, customerToken, sampleTrip, storageProvider } from '../testing/test-helpers';

describe('TripListingComponent', () => {
  function render(token?: string) {
    TestBed.configureTestingModule({
      imports: [TripListingComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), storageProvider(token)]
    });
    const fixture = TestBed.createComponent(TripListingComponent);
    fixture.detectChanges();
    return { fixture, http: TestBed.inject(HttpTestingController) };
  }
  const el = (f: ComponentFixture<TripListingComponent>) => f.nativeElement as HTMLElement;
  const tripsUrl = `${environment.apiBaseUrl}/trips`;

  it('renders a card for each trip', () => {
    const { fixture, http } = render();
    http.expectOne(tripsUrl).flush([sampleTrip, { ...sampleTrip, code: 'DAWR210315', name: "Dawson's Reef" }]);
    fixture.detectChanges();
    expect(el(fixture).querySelectorAll('app-trip-card').length).toBe(2);
    expect(fixture.componentInstance.message).toBe('There are 2 trips available.');
  });

  it('shows Add Trip only to administrators', () => {
    let { fixture, http } = render(customerToken());
    http.expectOne(tripsUrl).flush([]);
    fixture.detectChanges();
    expect(el(fixture).textContent).not.toContain('Add Trip');

    TestBed.resetTestingModule();
    ({ fixture, http } = render(adminToken()));
    http.expectOne(tripsUrl).flush([]);
    fixture.detectChanges();
    expect(el(fixture).textContent).toContain('Add Trip');
  });

  it('tells the user when the API cannot be reached', () => {
    const { fixture, http } = render();
    http.expectOne(tripsUrl).error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();
    expect(el(fixture).querySelector('.alert-danger')?.textContent).toContain('Cannot reach the Travlr API');
  });
});
