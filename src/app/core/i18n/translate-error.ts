import { TranslocoService } from '@jsverse/transloco';

/** Values an API error's text needs, by name. A "day" is a weekday name as the API sends it ("Monday"). */
export type ErrorArgs = Record<string, string>;

/**
 * The text for an API error code (errors.<code> in the i18n files) in the current language,
 * with its args filled in - or null when this frontend has no text for the code, and the
 * caller should fall back to the API's English message. A "day" arg is translated as well,
 * and also offered as "on" ("on Mondays" / "во понеделник"), the way most messages use it.
 */
export function translateErrorCode(transloco: TranslocoService, code: string, args: ErrorArgs = {}): string | null {
  const key = `errors.${code}`;
  const params: ErrorArgs = { ...args };
  if (args['day']) {
    params['day'] = transloco.translate(`enums.weekday.${args['day']}`);
    params['on'] = transloco.translate(`enums.weekdayOn.${args['day']}`);
  }
  const text = transloco.translate(key, params);
  // Transloco hands back the key itself for a missing translation.
  return text && text !== key ? text : null;
}
