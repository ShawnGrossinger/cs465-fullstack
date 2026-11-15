import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { EditTripComponent } from './edit-trip.component';
import { environment } from '../../environments/environment';
import { adminToken, sampleTrip, storageProvider } from '../testing/test-helpers';

describe('EditTripComponent', () => {
  const tripUrl = `${environment.apiBaseUrl}/trips/GALR210214`;

  function render() {
    TestBed.configureTestingModule({
      imports: [EditTripComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        storageProvider(adminToken()),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ tripCode: 'GALR210214' }) } } }
      ]
    });
    const fixture = TestBed.createComponent(EditTripComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, http: TestBed.inject(HttpTestingController) };
  }

  it('loads the trip named in the URL and fills the form', () => {
    const { component, http } = render();
    http.expectOne(tripUrl).flush(sampleTrip);
    expect(component.editForm.value.name).toBe('Gale Reef');
    expect(component.editForm.value.start).toBe('2021-02-14'); // formatted for the date picker
  });

  it('explains when the trip does not exist', () => {
    const { fixture, component, http } = render();
    http.expectOne(tripUrl).flush({ status: 404, code: 'NOT_FOUND', message: 'x' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(component.errorMessage).toBe('Trip GALR210214 was not found.');
  });

  it('saves to the trip in the URL and returns to the list', () => {
    const { component, http } = render();
    http.expectOne(tripUrl).flush(sampleTrip);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    component.editForm.patchValue({ name: 'Gale Reef Deluxe' });
    component.onSubmit();

    const req = http.expectOne(tripUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.name).toBe('Gale Reef Deluxe');
    req.flush({ ...sampleTrip, name: 'Gale Reef Deluxe' });
    expect(navigate).toHaveBeenCalledWith(['']);
  });

  it('shows the API validation message when a save is rejected', () => {
    const { component, http } = render();
    http.expectOne(tripUrl).flush(sampleTrip);
    component.onSubmit();
    http.expectOne(tripUrl).flush(
      { status: 400, code: 'VALIDATION_ERROR', message: 'Request validation failed',
        details: [{ field: 'perPerson', message: 'perPerson must be a price such as 799 or 799.00' }] },
      { status: 400, statusText: 'Bad Request' });
    expect(component.errorMessage).toBe('perPerson must be a price such as 799 or 799.00.');
  });
});
