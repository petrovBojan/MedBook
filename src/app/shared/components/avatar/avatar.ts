import { Component, computed, input, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { DEFAULT_STAFF_COLOR } from '../../utils/staff-colors';

/** The bits of a person an avatar needs - a StaffMember or a PlatformAdmin both fit. */
export interface AvatarPerson {
  id: string;
  firstName: string;
  lastName: string;
  color?: string;
  photoUpdatedAt?: string;
}

/**
 * A round profile picture: the person's photo if they have one, otherwise their initials on
 * their calendar color. Falls back to the initials if the photo can't be loaded.
 */
@Component({
  selector: 'app-avatar',
  template: `
    @if (photoUrl(); as url) {
      <img [src]="url" [alt]="name()" (error)="failedUrl.set(url)" />
    } @else {
      <span class="initials" aria-hidden="true">{{ initials() }}</span>
    }
  `,
  styleUrl: './avatar.css',
  host: {
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.4',
    '[style.background]': 'person().color || defaultColor',
    '[attr.title]': 'name()'
  }
})
export class Avatar {
  readonly person = input.required<AvatarPerson>();
  readonly size = input(40);

  protected readonly defaultColor = DEFAULT_STAFF_COLOR;
  protected readonly failedUrl = signal<string | null>(null);

  protected readonly name = computed(() => `${this.person().firstName} ${this.person().lastName}`);

  protected readonly initials = computed(() =>
    `${this.person().firstName.charAt(0)}${this.person().lastName.charAt(0)}`.toUpperCase()
  );

  // The timestamp in the query string gives each version of a photo its own URL, so the
  // browser can cache photos (the API allows it) and still never shows an outdated one.
  protected readonly photoUrl = computed(() => {
    const { id, photoUpdatedAt } = this.person();
    if (!photoUpdatedAt) {
      return null;
    }
    const url = `${environment.apiUrl}/staff/${encodeURIComponent(id)}/photo?v=${encodeURIComponent(photoUpdatedAt)}`;
    return url === this.failedUrl() ? null : url;
  });
}
