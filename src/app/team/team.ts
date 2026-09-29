import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { StaffService } from '../core/services/staff.service';
import { LayoutService } from '../core/services/layout.service';
import { StaffMember } from '../shared/models/staff-member.model';
import { Invitation, PasswordResetLink, StaffInvitation } from '../shared/models/account.model';
import { formDialogConfig } from '../shared/utils/dialog.utils';
import { InviteLinkDialog, InviteLinkDialogData } from '../shared/components/invite-link-dialog/invite-link-dialog';
import { StaffForm } from './staff-form/staff-form';

/** Clinic admins: who has access to the clinic, adding people, invitation and password reset links. */
@Component({
  selector: 'app-team',
  templateUrl: './team.html',
  styleUrl: './team.css',
  imports: [MatButtonModule, MatIconModule]
})
export class Team {
  private readonly staffSrv = inject(StaffService);
  private readonly dialog = inject(MatDialog);
  readonly layout = inject(LayoutService);

  readonly staff = signal<StaffMember[]>([]);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.load();
  }

  addStaff(): void {
    this.dialog
      .open<StaffForm, unknown, StaffInvitation | undefined>(StaffForm, formDialogConfig())
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.load();
        this.showInvitation(result.staff, result.invitation, `${result.staff.firstName} has been added.`);
      });
  }

  newInvitation(member: StaffMember): void {
    this.errorMessage.set(null);
    this.staffSrv.regenerateInvitation(member.id).subscribe({
      next: (invitation) => this.showInvitation(member, invitation),
      error: (err: Error) => this.errorMessage.set(err.message)
    });
  }

  passwordReset(member: StaffMember): void {
    this.errorMessage.set(null);
    this.staffSrv.createPasswordReset(member.id).subscribe({
      next: (link) => this.showInvitation(member, link, undefined, 'passwordReset'),
      error: (err: Error) => this.errorMessage.set(err.message)
    });
  }

  private showInvitation(
    member: StaffMember,
    invitation: Invitation | PasswordResetLink,
    intro?: string,
    purpose: InviteLinkDialogData['purpose'] = 'invitation'
  ): void {
    this.dialog.open<InviteLinkDialog, InviteLinkDialogData>(InviteLinkDialog, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { personName: `${member.firstName} ${member.lastName}`, email: member.email, invitation, intro, purpose }
    });
  }

  private load(): void {
    this.staffSrv.getClinicStaff().subscribe({
      next: (staff) => this.staff.set(staff),
      error: (err: Error) => this.errorMessage.set(err.message)
    });
  }
}
