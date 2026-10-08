import { Component, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Invitation, PasswordResetLink } from '../../models/account.model';
import { TranslocoDirective } from '@jsverse/transloco';
import { AppDatePipe } from '../../pipes/app-date.pipe';

export interface InviteLinkDialogData {
  /** Who the link is for, e.g. "Dr. Ana Kovac". */
  personName: string;
  email: string;
  invitation: Invitation | PasswordResetLink;
  /** What the link does: set a first password (/register, the default) or a new one (/reset-password). */
  purpose?: 'invitation' | 'passwordReset';
  /** Optional line above the link, e.g. "Riverside Clinic has been created." */
  intro?: string;
}

/**
 * Shows a freshly created invitation or password reset link as a copyable link. The API
 * returns the token only once (it stores just a hash), so this is the one chance to copy it -
 * there's no email sending; the admin passes the link on however suits them.
 */
@Component({
  selector: 'app-invite-link-dialog',
  templateUrl: './invite-link-dialog.html',
  styleUrl: './invite-link-dialog.css',
  imports: [AppDatePipe, MatDialogModule, MatButtonModule, MatIconModule, TranslocoDirective]
})
export class InviteLinkDialog {
  readonly data = inject<InviteLinkDialogData>(MAT_DIALOG_DATA);
  private readonly document = inject(DOCUMENT);

  readonly isPasswordReset = this.data.purpose === 'passwordReset';
  readonly link = `${this.document.location.origin}/${this.isPasswordReset ? 'reset-password' : 'register'}?token=${encodeURIComponent(this.data.invitation.token)}`;
  readonly copied = signal(false);

  async copy(input: HTMLInputElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link);
    } catch {
      // Clipboard API unavailable (e.g. plain http on a LAN address) - select the text so
      // the user can copy it by hand.
      input.select();
      return;
    }
    this.copied.set(true);
  }
}
