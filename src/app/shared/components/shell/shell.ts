import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';
import { ClinicService } from '../../../core/services/clinic.service';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  imports: [
    AsyncPipe,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class Shell {
  private readonly authSrv = inject(AuthService);
  private readonly clinicSrv = inject(ClinicService);
  private readonly router = inject(Router);

  readonly currentUser$ = this.authSrv.currentUser$;
  readonly clinic$ = this.clinicSrv.getCurrentClinic();

  logout(): void {
    this.authSrv.logout();
    this.router.navigate(['/login']);
  }
}
