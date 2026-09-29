import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Must match the API's minimum (RegisterRequest, ResetPasswordRequest, ChangePasswordRequest). */
export const MIN_PASSWORD_LENGTH = 10;

/** Group validator: `password` and `confirmPassword` must be equal once both are filled in. */
export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { password, confirmPassword } = group.value as { password: string; confirmPassword: string };
  return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
}
