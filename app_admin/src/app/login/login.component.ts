import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthenticationService } from '../services/authentication.service';
import { User } from '../models/user';
import { describeApiError } from '../utils/api-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  public formError: string = '';
  public notice: string = '';
  submitted = false;

  credentials = {
    name: '',
    email: '',
    password: ''
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService
  ) { }

  // Explain why the user was sent here (by the route guard or the interceptor).
  ngOnInit(): void {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'expired') {
      this.notice = 'Your session has ended. Please log in again.';
    } else if (reason === 'login') {
      this.notice = 'Please log in as an administrator to continue.';
    } else if (reason === 'forbidden') {
      this.notice = 'That page is for administrators only.';
    }
  }

  // Only email and password are needed to log in
  public onLoginSubmit(): void {
    this.formError = '';
    if (!this.credentials.email || !this.credentials.password) {
      this.formError = 'All fields are required, please try again';
    } else {
      this.doLogin();
    }
  }

  // Wait for the API's answer, then continue on success or show an error.
  private doLogin(): void {
    const newUser = {
      name: this.credentials.name,
      email: this.credentials.email
    } as User;

    this.authenticationService.login(newUser, this.credentials.password)
      .subscribe({
        next: () => {
          // This application is for administrators. A customer account can
          // log in to the API but has nothing to do here, so don't keep its token.
          if (!this.authenticationService.isAdmin()) {
            this.authenticationService.logout();
            this.formError = 'This account does not have administrator access.';
            return;
          }
          this.router.navigateByUrl(this.safeReturnUrl());
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.formError = 'Login failed: incorrect email or password';
          } else if (error.status === 429) {
            this.formError = 'Too many failed attempts. Please wait a few minutes and try again.';
          } else {
            this.formError = describeApiError(error);
          }
        }
      });
  }

  // Only return to a path inside this app, so a crafted link such as
  // /login?returnUrl=https://evil.example cannot redirect after login.
  private safeReturnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }
}
