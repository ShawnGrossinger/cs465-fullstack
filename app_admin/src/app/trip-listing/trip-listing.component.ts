import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { TripCardComponent } from '../trip-card/trip-card.component';
import { TripDataService } from '../services/trip-data.service';
import { AuthenticationService } from '../services/authentication.service';
import { Trip } from '../models/trip';
import { describeApiError } from '../utils/api-error';

@Component({
  selector: 'app-trip-listing',
  standalone: true,
  imports: [CommonModule, TripCardComponent],
  templateUrl: './trip-listing.component.html',
  styleUrl: './trip-listing.component.css'
  // (The component-level TripDataService provider was removed: it created a
  // second copy of a service that is already provided app-wide.)
})
export class TripListingComponent implements OnInit {

  trips: Trip[] = [];
  message: string = '';
  errorMessage: string = '';

  constructor(
    private tripDataService: TripDataService,
    private router: Router,
    private authenticationService: AuthenticationService
  ) { }

  public addTrip(): void {
    this.router.navigate(['add-trip']);
  }

  // Only administrators see the Add Trip button.
  public isAdmin(): boolean {
    return this.authenticationService.isAdmin();
  }

  private loadTrips(): void {
    this.tripDataService.getTrips()
      .subscribe({
        next: (trips: Trip[]) => {
          this.trips = trips;
          this.message = trips.length > 0
            ? `There are ${trips.length} trips available.`
            : 'There were no trips retrieved from the database';
        },
        error: (error: unknown) => {
          this.errorMessage = describeApiError(error);
        }
      });
  }

  ngOnInit(): void {
    this.loadTrips();
  }
}
