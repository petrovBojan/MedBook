import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * MedBook doesn't send email, so a forgotten password is reset through an administrator,
 * who creates a one-time reset link (Team page, or the platform owner's clinic page). This
 * page explains who to ask.
 */
@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
  styleUrls: ['../register/register.css', './forgot-password.css'],
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule]
})
export class ForgotPassword {}
