import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { TripDataService } from '../services/trip-data.service';
import { Trip } from '../models/trip';
import { describeApiError } from '../utils/api-error';

@Component({
  selector: 'app-edit-trip',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-trip.component.html',
  styleUrl: './edit-trip.component.css'
})
export class EditTripComponent implements OnInit {

  public editForm!: FormGroup;
  trip!: Trip;
  tripCode = '';
  submitted = false;
  message: string = '';
  errorMessage: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private tripDataService: TripDataService
  ) {}

  ngOnInit(): void {
    // The trip code comes from the route (edit-trip/:tripCode). It used to be
    // read from localStorage, which broke on refresh and across tabs.
    this.tripCode = this.route.snapshot.paramMap.get('tripCode') ?? '';

    this.editForm = this.formBuilder.group({
      code: [this.tripCode, Validators.required],
      name: ['', Validators.required],
      length: ['', Validators.required],
      start: ['', Validators.required],
      resort: ['', Validators.required],
      perPerson: ['', Validators.required],
      image: ['', Validators.required],
      description: ['', Validators.required]
    });

    this.tripDataService.getTrip(this.tripCode)
      .subscribe({
        next: (trip: Trip) => {
          this.trip = trip;
          // Populate our record into the form
          this.editForm.patchValue(trip);
          // The date picker needs yyyy-MM-dd, but the database returns a full timestamp
          this.editForm.patchValue({ start: String(trip.start).substring(0, 10) });
          this.message = `Trip: ${this.tripCode} retrieved`;
        },
        error: (error: unknown) => {
          this.errorMessage = error instanceof HttpErrorResponse && error.status === 404
            ? `Trip ${this.tripCode} was not found.`
            : describeApiError(error);
        }
      });
  }

  public onSubmit() {
    this.submitted = true;
    this.errorMessage = '';

    if (this.editForm.valid) {
      this.tripDataService.updateTrip(this.tripCode, this.editForm.value)
        .subscribe({
          next: () => {
            this.router.navigate(['']);
          },
          error: (error: unknown) => {
            this.errorMessage = describeApiError(error);
          }
        });
    }
  }

  public onDelete() {
    if (!confirm('Delete trip ' + this.tripCode + '? This cannot be undone.')) {
      return;
    }

    this.errorMessage = '';
    this.tripDataService.deleteTrip(this.tripCode)
      .subscribe({
        next: () => {
          this.router.navigate(['']);
        },
        error: (error: unknown) => {
          this.errorMessage = describeApiError(error);
        }
      });
  }

  // get the form short name to access the form fields
  get f() { return this.editForm.controls; }
}
