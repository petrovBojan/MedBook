import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AdminService } from '../../core/services/admin.service';
import { ClinicSummary, Invitation, PasswordResetLink } from '../../shared/models/account.model';
import { StaffMember } from '../../shared/models/staff-member.model';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog';
import { InviteLinkDialog, InviteLinkDialogData } from '../../shared/components/invite-link-dialog/invite-link-dialog';

/** One clinic: its details, activation status and who has access. */
@Component({
  selector: 'app-clinic-detail',
  templateUrl: './clinic-detail.html',
  styleUrl: './clinic-detail.css',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule]
})
export class ClinicDetail {
  private readonly adminSrv = inject(AdminService);
  private readonly dialog = inject(MatDialog);
  private readonly clinicId = inject(ActivatedRoute).snapshot.paramMap.get('id')!;

  readonly clinic = signal<ClinicSummary | null>(null);
  readonly staff = signal<StaffMember[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isSaving = signal(false);

  constructor() {
    this.adminSrv.getClinic(this.clinicId).subscribe({
      next: (clinic) => this.clinic.set(clinic),
      error: (err: Error) => this.errorMessage.set(err.message)
    });
    this.loadStaff();
  }

  toggleActive(clinic: ClinicSummary): void {
    const activate = !clinic.isActive;
    const data: ConfirmDialogData = activate
      ? {
          title: 'Reactivate clinic',
          message: `${clinic.name}'s staff will be able to log in again.`,
          confirmLabel: 'Reactivate'
        }
      : {
          title: 'Deactivate clinic',
          message: `${clinic.name}'s staff will be logged out immediately and can't log in until it's reactivated. No data is deleted.`,
          confirmLabel: 'Deactivate'
        };

    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data, maxWidth: '95vw' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.isSaving.set(true);
        this.errorMessage.set(null);
        this.adminSrv.setClinicActive(clinic.id, activate).subscribe({
          next: (updated) => {
            this.clinic.set(updated);
            this.isSaving.set(false);
          },
          error: (err: Error) => {
            this.errorMessage.set(err.message);
            this.isSaving.set(false);
          }
        });
      });
  }

  toggleClinicAdmin(member: StaffMember): void {
    const makeAdmin = !member.isClinicAdmin;
    const name = `${member.firstName} ${member.lastName}`;
    const data: ConfirmDialogData = makeAdmin
      ? {
          title: 'Make clinic admin',
          message: `${name} will be able to add and remove staff and send invitations. They'll be logged out and get the new rights when they log in again.`,
          confirmLabel: 'Make admin'
        }
      : {
          title: 'Remove admin rights',
          message: `${name} will no longer be able to manage staff. They'll be logged out and can log in again as regular staff.`,
          confirmLabel: 'Remove admin rights'
        };

    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data, maxWidth: '95vw' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.errorMessage.set(null);
        this.adminSrv.setClinicAdmin(this.clinicId, member.id, makeAdmin).subscribe({
          next: () => this.loadStaff(),
          error: (err: Error) => this.errorMessage.set(err.message)
        });
      });
  }

  newInvitation(member: StaffMember): void {
    this.errorMessage.set(null);
    this.adminSrv.regenerateInvitation(this.clinicId, member.id).subscribe({
      next: (invitation) => this.showLink(member, invitation, 'invitation'),
      error: (err: Error) => this.errorMessage.set(err.message)
    });
  }

  passwordReset(member: StaffMember): void {
    this.errorMessage.set(null);
    this.adminSrv.createPasswordReset(this.clinicId, member.id).subscribe({
      next: (link) => this.showLink(member, link, 'passwordReset'),
      error: (err: Error) => this.errorMessage.set(err.message)
    });
  }

  private showLink(
    member: StaffMember,
    invitation: Invitation | PasswordResetLink,
    purpose: InviteLinkDialogData['purpose']
  ): void {
    this.dialog.open<InviteLinkDialog, InviteLinkDialogData>(InviteLinkDialog, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { personName: `${member.firstName} ${member.lastName}`, email: member.email, invitation, purpose }
    });
  }

  private loadStaff(): void {
    this.adminSrv.getClinicStaff(this.clinicId).subscribe({
      next: (staff) => this.staff.set(staff),
      error: (err: Error) => this.errorMessage.set(err.message)
    });
  }
}
