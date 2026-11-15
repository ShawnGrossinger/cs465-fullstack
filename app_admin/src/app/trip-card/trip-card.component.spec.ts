import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { TripCardComponent } from './trip-card.component';
import { adminToken, customerToken, sampleTrip, storageProvider } from '../testing/test-helpers';

describe('TripCardComponent', () => {
  function render(token?: string): ComponentFixture<TripCardComponent> {
    TestBed.configureTestingModule({
      imports: [TripCardComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), storageProvider(token)]
    });
    const fixture = TestBed.createComponent(TripCardComponent);
    fixture.componentInstance.trip = { ...sampleTrip };
    fixture.detectChanges();
    return fixture;
  }

  const editButton = (f: ComponentFixture<TripCardComponent>) =>
    (f.nativeElement as HTMLElement).querySelector('button');

  it('shows the trip details', () => {
    const text = (render().nativeElement as HTMLElement).textContent;
    expect(text).toContain('Gale Reef');
    expect(text).toContain('$799.00');
  });

  it('hides the Edit button from visitors and customers', () => {
    expect(editButton(render())).toBeNull();
    TestBed.resetTestingModule();
    expect(editButton(render(customerToken()))).toBeNull();
  });

  it('administrators can edit, and the trip code goes in the URL', () => {
    const fixture = render(adminToken());
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    editButton(fixture)!.click();
    expect(navigate).toHaveBeenCalledWith(['edit-trip', 'GALR210214']);
  });
});
