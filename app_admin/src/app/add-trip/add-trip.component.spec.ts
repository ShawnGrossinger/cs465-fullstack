import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AddTripComponent } from './add-trip.component';
import { environment } from '../../environments/environment';
import { adminToken, sampleTrip, storageProvider } from '../testing/test-helpers';

describe('AddTripComponent', () => {
  function render() {
    TestBed.configureTestingModule({
      imports: [AddTripComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), storageProvider(adminToken())]
    });
    const fixture = TestBed.createComponent(AddTripComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, http: TestBed.inject(HttpTestingController) };
  }

  it('does not call the API while required fields are empty', () => {
    const { component, http } = render();
    component.onSubmit();
    http.expectNone(`${environment.apiBaseUrl}/trips`);
    expect(component.addForm.valid).toBeFalse();
  });

  it('shows the reason when the API refuses the trip', () => {
    const { fixture, component, http } = render();
    const { _id, ...fields } = sampleTrip;
    component.addForm.setValue({ ...fields, start: '2026-01-01' });
    component.onSubmit();
    http.expectOne(`${environment.apiBaseUrl}/trips`).flush(
      { status: 409, code: 'CONFLICT', message: 'Trip GALR210214 already exists' },
      { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.alert-danger')?.textContent)
      .toContain('Trip GALR210214 already exists');
  });
});
