import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('logs in with valid demo credentials and exposes the current user', async () => {
    const user = await firstValueFrom(service.login('dr.carter@medbook.demo', 'Doctor123!'));

    expect(user.email).toBe('dr.carter@medbook.demo');
    expect(service.isLoggedIn()).toBe(true);
    expect(service.getCurrentUser()?.email).toBe('dr.carter@medbook.demo');
    expect(service.getCurrentClinicId()).toBe(user.clinicId);
  });

  it('rejects invalid credentials and leaves the session logged out', async () => {
    await expect(
      firstValueFrom(service.login('dr.carter@medbook.demo', 'wrong-password'))
    ).rejects.toThrow('Invalid email or password.');

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getCurrentUser()).toBeNull();
  });

  it('rejects an email that does not exist', async () => {
    await expect(
      firstValueFrom(service.login('nobody@medbook.demo', 'whatever'))
    ).rejects.toThrow('Invalid email or password.');
  });

  it('logs out and clears the session', async () => {
    await firstValueFrom(service.login('dr.carter@medbook.demo', 'Doctor123!'));
    expect(service.isLoggedIn()).toBe(true);

    service.logout();

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getCurrentUser()).toBeNull();
  });
});
