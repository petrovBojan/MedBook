import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { apiInterceptor } from '../http/api.interceptor';
import { StaffMember, StaffRole } from '../../shared/models/staff-member.model';
import { environment } from '../../../environments/environment';
import { provideTranslocoTesting } from '../i18n/transloco-testing';

const loginUrl = `${environment.apiUrl}/auth/login`;
const logoutUrl = `${environment.apiUrl}/auth/logout`;

const carter: StaffMember = {
  id: 'staff-carter',
  clinicId: 'clinic-sunrise',
  firstName: 'Emily',
  lastName: 'Carter',
  email: 'dr.carter@medbook.demo',
  role: StaffRole.Doctor
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslocoTesting()
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  async function logIn(): Promise<void> {
    const result = firstValueFrom(service.login('dr.carter@medbook.demo', 'Doctor123!'));
    httpMock.expectOne(loginUrl).flush({ expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), user: carter });
    await result;
  }

  it('posts the credentials and exposes the returned user', async () => {
    const result = firstValueFrom(service.login('dr.carter@medbook.demo', 'Doctor123!'));

    const req = httpMock.expectOne(loginUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'dr.carter@medbook.demo', password: 'Doctor123!' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ expiresAt: new Date(Date.now() + 60_000).toISOString(), user: carter });

    expect((await result).user?.email).toBe('dr.carter@medbook.demo');
    expect(service.isLoggedIn()).toBe(true);
    expect(service.isClinicStaff()).toBe(true);
    expect(service.isPlatformAdmin()).toBe(false);
    expect(service.getCurrentUser()?.id).toBe('staff-carter');
    expect(service.homeUrl()).toBe('/calendar');
  });

  it('recognises the platform owner and sends them to the admin panel', async () => {
    const result = firstValueFrom(service.login('owner@medbook.test', 'Owner-Password-1'));
    httpMock.expectOne(loginUrl).flush({
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      platformAdmin: { id: 'admin-1', firstName: 'Platform', lastName: 'Owner', email: 'owner@medbook.test' }
    });
    await result;

    expect(service.isPlatformAdmin()).toBe(true);
    expect(service.isClinicStaff()).toBe(false);
    expect(service.getCurrentUser()).toBeNull();
    expect(service.homeUrl()).toBe('/admin');
  });

  it('switching accounts replaces the previous session entirely', async () => {
    await logIn();

    service.applySession({
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      platformAdmin: { id: 'admin-1', firstName: 'Platform', lastName: 'Owner', email: 'owner@medbook.test' }
    });

    expect(service.getCurrentUser()).toBeNull();
    expect(localStorage.getItem('medbook_current_user')).toBeNull();
  });

  it('never stores anything token-like in localStorage', async () => {
    await logIn();

    // "eyJ" is how every base64url-encoded JWT starts.
    const stored = Object.keys(localStorage).map((key) => `${key}=${localStorage.getItem(key)}`);
    expect(stored.join(' ')).not.toMatch(/token|eyJ/i);
  });

  it("rejects invalid credentials with the API's message and stays logged out", async () => {
    const result = firstValueFrom(service.login('dr.carter@medbook.demo', 'wrong-password'));
    httpMock
      .expectOne(loginUrl)
      .flush({ title: 'Unauthorized', status: 401, detail: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });

    await expect(result).rejects.toThrow('Invalid email or password.');
    expect(service.isLoggedIn()).toBe(false);
    expect(service.getCurrentUser()).toBeNull();
  });

  it('treats a session that expired before a reload as logged out', () => {
    localStorage.setItem('medbook_session_expires_at', JSON.stringify(new Date(Date.now() - 1000).toISOString()));
    localStorage.setItem('medbook_current_user', JSON.stringify(carter));

    const reloaded = TestBed.runInInjectionContext(() => new AuthService());

    expect(reloaded.isLoggedIn()).toBe(false);
    expect(reloaded.getCurrentUser()).toBeNull();
  });

  it('logs out locally and asks the API to clear the session cookie', async () => {
    await logIn();

    service.logout();

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getCurrentUser()).toBeNull();
    const req = httpMock.expectOne(logoutUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('clears data left in localStorage by earlier versions, including old tokens', () => {
    localStorage.setItem('medbook_db', '{}');
    localStorage.setItem('medbook_token', '"x"');
    localStorage.setItem('medbook_session', '{"token":"old-jwt"}');

    TestBed.runInInjectionContext(() => new AuthService());

    expect(localStorage.getItem('medbook_db')).toBeNull();
    expect(localStorage.getItem('medbook_token')).toBeNull();
    expect(localStorage.getItem('medbook_session')).toBeNull();
  });
});
