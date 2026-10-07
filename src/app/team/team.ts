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
import { StaffRoleDialog } from './staff-role-dialog/staff-role-dialog';
import { AuthService } from '../core/services/auth.service';
import { Avatar } from '../shared/components/avatar/avatar';
import { ConfirmDialog, ConfirmDialogData } from '../shared/components/confirm-dialog/confirm-dialog';

/** Clinic admins: who has access to the clinic, adding people, invitation and password reset links. */
@Component({
  selector: 'app-team',
  templateUrl: './team.html',
  styleUrl: './team.css',
  imports: [MatButtonModule, MatIconModule, Avatar]
})
export class Team {
  private readonly staffSrv = inject(StaffService);
  private readonly dialog = inject(MatDialog);
  private readonly authSrv = inject(AuthService);
  readonly layout = inject(LayoutService);

  readonly staff = signal<StaffMember[]>([]);
  readonly errorMessage = signal<string | null>(null);

  /** The signed-in admin - they can't remove themselves. */
  readonly currentUserId = this.authSrv.getCurrentUser()?.id;

  constructor() {
    this.load();
  }

  removeStaff(member: StaffMember): void {
    const name = `${member.firstName} ${member.lastName}`;
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        maxWidth: '95vw',
        data: {
          title: 'Remove staff member',
          message: `${name} will be logged out and won't be able to log in again. Past appointments keep their name.`,
          confirmLabel: 'Remove'
        }
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.errorMessage.set(null);
        this.staffSrv.removeStaff(member.id).subscribe({
          next: () => this.load(),
          error: (err: Error) => this.errorMessage.set(err.message)
        });
      });
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

  editRole(member: StaffMember): void {
    this.dialog
      .open<StaffRoleDialog, StaffMember, StaffMember | undefined>(StaffRoleDialog, formDialogConfig(member))
      .afterClosed()
      .subscribe((updated) => {
        if (!updated) {
          return;
        }
        // Admins can change their own role too - keep the profile and toolbar in step.
        if (updated.id === this.authSrv.getCurrentUser()?.id) {
          this.authSrv.updateCurrentUser(updated);
        }
        this.load();
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
      // Removed people are only listed by the API for appointment history.
      next: (staff) => this.staff.set(staff.filter((member) => !member.removedAt)),
      error: (err: Error) => this.errorMessage.set(err.message)
    });
  }
}
