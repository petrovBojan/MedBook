import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AdminService } from '../../core/services/admin.service';
import { LayoutService } from '../../core/services/layout.service';
import { ClinicSummary, CreatedClinic } from '../../shared/models/account.model';
import { formDialogConfig } from '../../shared/utils/dialog.utils';
import { InviteLinkDialog, InviteLinkDialogData } from '../../shared/components/invite-link-dialog/invite-link-dialog';
import { ClinicForm } from '../clinic-form/clinic-form';

/** The platform owner's home: every clinic on the platform. */
@Component({
  selector: 'app-clinic-list',
  templateUrl: './clinic-list.html',
  imports: [DatePipe, MatButtonModule, MatIconModule]
})
export class ClinicList {
  private readonly adminSrv = inject(AdminService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  readonly layout = inject(LayoutService);

  readonly clinics = signal<ClinicSummary[]>([]);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.load();
  }

  openClinic(clinic: ClinicSummary): void {
    this.router.navigate(['/admin/clinics', clinic.id]);
  }

  createClinic(): void {
    this.dialog
      .open<ClinicForm, unknown, CreatedClinic | undefined>(ClinicForm, formDialogConfig())
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.load();
        this.dialog.open<InviteLinkDialog, InviteLinkDialogData>(InviteLinkDialog, {
          width: '560px',
          maxWidth: '95vw',
          autoFocus: false,
          data: {
            intro: `${result.clinic.name} has been created.`,
            personName: `${result.admin.firstName} ${result.admin.lastName}`,
            email: result.admin.email,
            invitation: result.invitation
          }
        });
      });
  }

  private load(): void {
    this.adminSrv.getClinics().subscribe({
      next: (clinics) => this.clinics.set(clinics),
      error: (err: Error) => this.errorMessage.set(err.message)
    });
  }
}
