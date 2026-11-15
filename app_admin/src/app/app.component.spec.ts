import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { storageProvider } from './testing/test-helpers';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), storageProvider()]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the navigation bar with a Log In link when logged out', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const nav = (fixture.nativeElement as HTMLElement).querySelector('app-navbar');
    expect(nav?.textContent).toContain('Log In');
  });
});
