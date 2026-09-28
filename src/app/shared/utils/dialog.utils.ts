import { MatDialogConfig } from '@angular/material/dialog';

/**
 * Config for the app's form dialogs (appointment, patient). A centered 640px dialog on
 * larger screens; on phones the `app-form-dialog` panel class (styles.scss) turns it into
 * a full-screen sheet with the actions pinned to the bottom.
 */
export function formDialogConfig<D>(data?: D): MatDialogConfig<D> {
  return {
    width: '640px',
    maxWidth: '95vw',
    // Don't focus the first field on open - on phones that pops the keyboard up over
    // the form before the user has even seen it.
    autoFocus: false,
    panelClass: 'app-form-dialog',
    data
  };
}
