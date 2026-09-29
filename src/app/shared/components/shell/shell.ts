import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { LayoutService } from '../../../core/services/layout.service';
import { ChangePasswordDialog } from '../change-password-dialog/change-password-dialog';
import { Avatar } from '../avatar/avatar';

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
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    Avatar
  ]
})
export class Shell {
  private readonly authSrv = inject(AuthService);
  private readonly clinicSrv = inject(ClinicService);
  private readonly router = inject(Router);
  readonly layout = inject(LayoutService);

  readonly currentUser$ = this.authSrv.currentUser$;
  private readonly currentUser = toSignal(this.currentUser$, { initialValue: this.authSrv.getCurrentUser() });

  // "Team" only for clinic admins - the only ones who can add staff or send invitations.
  readonly navItems = computed(() => [
    { path: '/calendar', icon: 'calendar_month', label: 'Calendar' },
    { path: '/patients', icon: 'people', label: 'Patients' },
    ...(this.currentUser()?.isClinicAdmin ? [{ path: '/team', icon: 'group', label: 'Team' }] : []),
    { path: '/settings', icon: 'settings_heart', label: 'Settings' }
  ]);
  readonly clinic$ = this.clinicSrv.getCurrentClinic();
  private readonly dialog = inject(MatDialog);

  changePassword(): void {
    this.dialog.open(ChangePasswordDialog, { width: '440px', maxWidth: '95vw', autoFocus: false });
  }

  logout(): void {
    this.authSrv.logout();
    this.router.navigate(['/login']);
  }
}
