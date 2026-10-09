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
import { TranslocoDirective } from '@jsverse/transloco';
import { translateDatepickerLabels } from '../../../core/i18n/translated-datepicker-intl';
import { APP_LANGUAGES, LanguageService } from '../../../core/services/language.service';

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
    Avatar,
    TranslocoDirective
  ]
})
export class Shell {
  private readonly authSrv = inject(AuthService);
  private readonly clinicSrv = inject(ClinicService);
  private readonly router = inject(Router);
  readonly layout = inject(LayoutService);
  readonly language = inject(LanguageService);
  readonly languages = APP_LANGUAGES;

  readonly currentUser$ = this.authSrv.currentUser$;
  private readonly currentUser = toSignal(this.currentUser$, { initialValue: this.authSrv.getCurrentUser() });

  // "Team" only for clinic admins - the only ones who can add staff or send invitations.
  readonly navItems = computed(() => [
    { path: '/calendar', icon: 'calendar_month', labelKey: 'nav.calendar' },
    { path: '/patients', icon: 'patient_list', labelKey: 'nav.patients' },
    ...(this.currentUser()?.isClinicAdmin ? [{ path: '/team', icon: 'clinical_notes', labelKey: 'nav.team' }] : []),
    { path: '/settings', icon: 'settings_heart', labelKey: 'nav.settings' }
  ]);
  readonly clinic$ = this.clinicSrv.getCurrentClinic();
  private readonly dialog = inject(MatDialog);

  constructor() {
    translateDatepickerLabels();
  }

  changePassword(): void {
    this.dialog.open(ChangePasswordDialog, { width: '440px', maxWidth: '95vw', autoFocus: false });
  }

  logout(): void {
    this.authSrv.logout();
    this.router.navigate(['/login']);
  }
}
