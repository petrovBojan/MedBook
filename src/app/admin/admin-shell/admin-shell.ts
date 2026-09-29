import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

/**
 * Layout for the platform owner's panel. Separate from the clinic app's shell: the owner
 * has no calendar, patients or settings - just clinics.
 */
@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.css',
  imports: [AsyncPipe, RouterLink, RouterOutlet, MatToolbarModule, MatButtonModule, MatIconModule]
})
export class AdminShell {
  private readonly authSrv = inject(AuthService);
  private readonly router = inject(Router);

  readonly admin$ = this.authSrv.platformAdmin$;

  logout(): void {
    this.authSrv.logout();
    this.router.navigate(['/login']);
  }
}
