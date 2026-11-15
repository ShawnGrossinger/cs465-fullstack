import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Trip } from '../models/trip';
import { AuthenticationService } from '../services/authentication.service';

@Component({
  selector: 'app-trip-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trip-card.component.html',
  styleUrl: './trip-card.component.css'
})
export class TripCardComponent {

  @Input('trip') trip!: Trip;

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}

  // The trip code travels in the URL (edit-trip/GALR210214) instead of
  // being stashed in localStorage for the next page to find.
  public editTrip(trip: Trip): void {
    this.router.navigate(['edit-trip', trip.code]);
  }

  // Only administrators see the Edit button.
  public isAdmin(): boolean {
    return this.authenticationService.isAdmin();
  }
}
